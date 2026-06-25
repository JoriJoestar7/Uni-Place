import express from "express";
import { pool } from "../db.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { generateGeminiReply } from "../services/gemini.service.js";

const router = express.Router();

const MAX_RECOMMENDATIONS = 3;
const MIN_RELEVANCE_SCORE = 12;

const STOPWORDS = new Set([
    "para", "pero", "porque", "como", "donde", "dónde", "cuando", "cuándo", "que", "qué",
    "una", "uno", "unos", "unas", "con", "sin", "por", "del", "las", "los", "les", "mis",
    "tus", "sus", "este", "esta", "estos", "estas", "algo", "alguien", "hacer", "tengo",
    "quiero", "necesito", "ayuda", "ayudame", "ayúdame", "hola", "buenas", "favor", "puedo",
    "puedes", "ser", "soy", "hay", "mas", "más", "muy", "bien", "cerca", "aqui", "aquí"
]);

const BUSINESS_INTENT_WORDS = [
    "comprar", "compra", "comer", "comida", "almorzar", "almuerzo", "desayuno", "merienda",
    "cena", "café", "cafe", "snack", "postre", "bebida", "barato", "precio", "precios",
    "menú", "menu", "horario", "abierto", "atiende", "emprendimiento", "negocio", "servicio",
    "servicios", "pedido", "delivery", "entrega", "whatsapp", "instagram", "tienda", "ropa",
    "impresiones", "copias", "papelería", "papeleria", "universidad", "campus", "ups", "salesiana"
];

router.use(verifyToken);

router.post("/", async (req, res) => {
    try {
        const message = cleanText(req.body?.message);

        if (!message) {
            return res.status(400).json({
                ok: false,
                message: "Escribe una consulta para que UniPlace pueda responder."
            });
        }

        const matches = await searchRelevantBusinesses(message);
        const wantsBusinessRecommendation = detectsBusinessIntent(message) || matches.length > 0;
       let reply;

try {
    reply = await generateGeminiReply({
        userMessage: message,
        businessContext: matches
    });
} catch (error) {
    console.error("GEMINI_REPLY_ERROR:", error);
    reply = buildAssistantReply(message, matches, wantsBusinessRecommendation, req.user);
} 
        await registerKnowledgeUsage(matches, req.user.id, message);

        return res.json({
            ok: true,
            reply,
            mode: matches.length > 0 ? "knowledge_base" : "general",
            recommendedBusinesses: matches.map(toPublicBusinessSource)
        });

    } catch (error) {
        console.error("CHAT_ROUTE_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno al generar la respuesta del chat.",
            error: error.message
        });
    }
});

router.get("/knowledge/search", async (req, res) => {
    try {
        const query = cleanText(req.query?.q);

        if (!query) {
            return res.status(400).json({
                ok: false,
                message: "Envía una búsqueda con ?q=..."
            });
        }

        const matches = await searchRelevantBusinesses(query);

        return res.json({
            ok: true,
            total: matches.length,
            businesses: matches.map(toPublicBusinessSource)
        });

    } catch (error) {
        console.error("CHAT_KNOWLEDGE_SEARCH_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al buscar en la base de conocimiento.",
            error: error.message
        });
    }
});

async function searchRelevantBusinesses(message) {
    const normalizedQuestion = normalizeForSearch(message);
    const tokens = getSearchTokens(message);

    const [rows] = await pool.execute(`
        SELECT
            b.id,
            b.business_name,
            b.slug,
            b.business_type,
            b.category_label,
            b.description,
            b.short_description,
            b.city,
            b.address,
            b.campus_zone,
            b.reference_point,
            b.phone,
            b.whatsapp,
            b.email,
            b.website_url,
            b.instagram_url,
            b.price_min,
            b.price_max,
            b.payment_methods,
            b.delivery_options,
            b.service_area,
            b.keywords AS business_keywords,
            b.target_audience,
            b.main_products,
            b.menu_summary,
            b.schedule_summary,
            b.faq_summary,
            b.ai_extra_context,
            k.knowledge_text,
            k.keywords AS knowledge_keywords,
            k.priority_score,
            k.knowledge_status,
            k.last_generated_at
        FROM business_ai_knowledge k
        INNER JOIN businesses b ON b.id = k.business_id
        WHERE b.status = 'approved'
          AND b.is_ai_visible = 1
          AND k.knowledge_status = 'active'
        ORDER BY k.priority_score DESC, b.updated_at DESC
        LIMIT 120
    `);

    const scored = rows
        .map((business) => {
            const relevanceScore = scoreBusiness(business, tokens, normalizedQuestion);
            const priorityBonus = relevanceScore > 0
                ? Math.round((Number(business.priority_score) || 70) / 10)
                : 0;

            return {
                ...business,
                relevanceScore,
                finalScore: relevanceScore + priorityBonus,
                matchedTokens: getMatchedTokens(business, tokens)
            };
        })
        .filter((business) => business.finalScore >= MIN_RELEVANCE_SCORE)
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, MAX_RECOMMENDATIONS);

    return scored;
}

function scoreBusiness(business, tokens, normalizedQuestion) {
    if (tokens.length === 0) return 0;

    const fields = getNormalizedBusinessFields(business);
    let score = 0;

    if (normalizedQuestion.length > 8 && fields.knowledge.includes(normalizedQuestion)) {
        score += 22;
    }

    if (fields.name && normalizedQuestion.includes(fields.name)) {
        score += 35;
    }

for (const token of tokens) {
    const variants = getTokenVariants(token);

    if (fieldHasAnyVariant(fields.name, variants)) score += 20;
    if (fieldHasAnyVariant(fields.category, variants)) score += 16;
    if (fieldHasAnyVariant(fields.keywords, variants)) score += 18;
    if (fieldHasAnyVariant(fields.menu, variants)) score += 14;
    if (fieldHasAnyVariant(fields.location, variants)) score += 10;
    if (fieldHasAnyVariant(fields.payment, variants)) score += 7;
    if (fieldHasAnyVariant(fields.delivery, variants)) score += 7;
    if (fieldHasAnyVariant(fields.description, variants)) score += 6;
    if (fieldHasAnyVariant(fields.knowledge, variants)) score += 4;
}

    if (detectsBusinessIntent(normalizedQuestion) && score > 0) {
        score += 5;
    }

    if (business.menu_summary || business.main_products) score += score > 0 ? 3 : 0;
    if (business.schedule_summary) score += score > 0 ? 2 : 0;
    if (business.price_min !== null || business.price_max !== null) score += score > 0 ? 2 : 0;

    return score;
}

function getMatchedTokens(business, tokens) {
    const allText = Object.values(getNormalizedBusinessFields(business)).join(" ");

    return tokens
        .filter((token) => {
            const variants = getTokenVariants(token);
            return fieldHasAnyVariant(allText, variants);
        })
        .slice(0, 8);
}

function getNormalizedBusinessFields(business) {
    return {
        name: normalizeForSearch(business.business_name),
        category: normalizeForSearch(`${business.business_type || ""} ${business.category_label || ""}`),
        keywords: normalizeForSearch(`${business.business_keywords || ""} ${business.knowledge_keywords || ""} ${business.target_audience || ""}`),
        menu: normalizeForSearch(`${business.main_products || ""} ${business.menu_summary || ""}`),
        location: normalizeForSearch(`${business.city || ""} ${business.address || ""} ${business.campus_zone || ""} ${business.reference_point || ""} ${business.service_area || ""}`),
        payment: normalizeForSearch(business.payment_methods),
        delivery: normalizeForSearch(business.delivery_options),
        description: normalizeForSearch(`${business.short_description || ""} ${business.description || ""}`),
        knowledge: normalizeForSearch(`${business.knowledge_text || ""} ${business.ai_extra_context || ""} ${business.faq_summary || ""} ${business.schedule_summary || ""}`)
    };
}

function buildAssistantReply(message, matches, wantsBusinessRecommendation, user) {
    if (matches.length > 0) {
        const intro = "Revisé la base de conocimiento de UniPlace y encontré emprendimientos aprobados que encajan con tu consulta.";
        const recommendationText = matches
            .map((business, index) => formatBusinessRecommendation(business, index + 1))
            .join("\n\n");

        return [
            intro,
            "",
            recommendationText,
            "",
            "Estos negocios aparecen con prioridad porque están aprobados, visibles para IA y tienen información detallada registrada en UniPlace. Igual revisa disponibilidad, horarios y precios directamente con el emprendimiento antes de comprar o pedir."
        ].join("\n");
    }

    if (wantsBusinessRecommendation) {
        return [
            "Revisé la base de conocimiento de UniPlace, pero no encontré emprendimientos aprobados que coincidan claramente con tu consulta.",
            "",
            "Puedes intentar con una búsqueda más específica, por ejemplo: comida económica, café cerca del campus, impresiones, ropa, delivery, horarios o una zona concreta."
        ].join("\n");
    }

    return buildGeneralAcademicReply(message, user);
}

function formatBusinessRecommendation(business, position) {
    const lines = [];
    const priceRange = formatPriceRange(business.price_min, business.price_max);
    const location = [business.city, business.campus_zone, business.address].filter(Boolean).join(" · ");
    const contact = business.whatsapp || business.phone || business.instagram_url || business.email;

    lines.push(`${position}. ${business.business_name}`);

    if (business.short_description || business.description) {
        lines.push(`   ${business.short_description || createShortText(business.description, 180)}`);
    }

    if (business.category_label || business.business_type) {
        lines.push(`   Categoría: ${business.category_label || business.business_type}`);
    }

    if (business.main_products || business.menu_summary) {
        lines.push(`   Menú/oferta: ${createShortText(business.main_products || business.menu_summary, 220)}`);
    }

    if (priceRange) {
        lines.push(`   Precios: ${priceRange}`);
    }

    if (business.schedule_summary) {
        lines.push(`   Horario: ${createShortText(business.schedule_summary, 180)}`);
    }

    if (location) {
        lines.push(`   Ubicación: ${location}`);
    }

    if (contact) {
        lines.push(`   Contacto: ${contact}`);
    }

    if (business.matchedTokens?.length > 0) {
        lines.push(`   Coincidencias: ${business.matchedTokens.join(", ")}`);
    }

    return lines.join("\n");
}

function buildGeneralAcademicReply(message, user) {
    const normalized = normalizeForSearch(message);

    if (normalized.includes("resumen")) {
        return "Claro. Pega el texto o tema y te ayudo a convertirlo en un resumen ordenado, claro y fácil de estudiar.";
    }

    if (normalized.includes("ensayo")) {
        return "Perfecto. Puedo ayudarte a estructurar un ensayo con introducción, tesis, argumentos, desarrollo y conclusión. También puedo ayudarte a mejorarlo para que suene más natural y académico.";
    }

    if (normalized.includes("examen") || normalized.includes("estudiar") || normalized.includes("prueba")) {
        return "Podemos organizar un plan de estudio por temas, dificultad y tiempo disponible. También puedo convertir tus apuntes en preguntas de práctica.";
    }

    if (normalized.includes("apa") || normalized.includes("cita") || normalized.includes("referencia")) {
        return "Puedo ayudarte con formato APA, citas dentro del texto y referencias. Solo revisa los datos reales de cada fuente antes de entregar.";
    }

    const name = user?.name ? `, ${user.name}` : "";

    return `Entendido${name}. Puedo ayudarte a ordenar esa idea, explicarla mejor o convertirla en un formato académico más claro. Si estás buscando un emprendimiento de UniPlace, dime qué necesitas comprar, en qué zona o qué presupuesto tienes.`;
}

async function registerKnowledgeUsage(matches, userId, queryText) {
    if (matches.length === 0) return;

    const businessIds = matches.map((business) => business.id);
    const placeholders = businessIds.map(() => "?").join(", ");

    try {
        await pool.execute(
            `UPDATE business_ai_knowledge
             SET times_used = times_used + 1,
                 last_used_at = CURRENT_TIMESTAMP
             WHERE business_id IN (${placeholders})`,
            businessIds
        );
    } catch (error) {
        if (!String(error.message).includes("Unknown column")) {
            console.warn("KNOWLEDGE_USAGE_UPDATE_WARNING:", error.message);
        }
    }

    try {
        await pool.execute(
            `INSERT INTO chat_recommendation_logs (user_id, query_text, matched_business_ids)
             VALUES (?, ?, ?)`,
            [userId || null, queryText, JSON.stringify(businessIds)]
        );
    } catch (error) {
        if (!String(error.message).includes("doesn't exist")) {
            console.warn("CHAT_RECOMMENDATION_LOG_WARNING:", error.message);
        }
    }
}

function toPublicBusinessSource(business) {
    return {
        id: business.id,
        business_name: business.business_name,
        slug: business.slug,
        category: business.category_label || business.business_type,
        short_description: business.short_description,
        city: business.city,
        campus_zone: business.campus_zone,
        address: business.address,
        whatsapp: business.whatsapp,
        phone: business.phone,
        instagram_url: business.instagram_url,
        website_url: business.website_url,
        price_range: formatPriceRange(business.price_min, business.price_max),
        schedule_summary: business.schedule_summary,
        relevance_score: business.finalScore,
        matched_tokens: business.matchedTokens || []
    };
}

function detectsBusinessIntent(value) {
    const normalized = normalizeForSearch(value);
    return BUSINESS_INTENT_WORDS.some((word) => normalized.includes(normalizeForSearch(word)));
}

function getSearchTokens(value) {
    return normalizeForSearch(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
        .filter((token) => !STOPWORDS.has(token))
        .slice(0, 18);
}

function normalizeForSearch(value) {
    if (value === undefined || value === null) return "";

    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9ñ\s@.]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanText(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

function formatPriceRange(min, max) {
    const parsedMin = min !== null && min !== undefined ? Number(min) : null;
    const parsedMax = max !== null && max !== undefined ? Number(max) : null;

    if (Number.isFinite(parsedMin) && Number.isFinite(parsedMax)) {
        if (parsedMin === parsedMax) return `$${parsedMin.toFixed(2)}`;
        return `$${parsedMin.toFixed(2)} - $${parsedMax.toFixed(2)}`;
    }

    if (Number.isFinite(parsedMin)) return `desde $${parsedMin.toFixed(2)}`;
    if (Number.isFinite(parsedMax)) return `hasta $${parsedMax.toFixed(2)}`;

    return null;
}

function createShortText(value, maxLength = 160) {
    const text = cleanText(value);

    if (!text) return "No registrado";
    if (text.length <= maxLength) return text;

    return `${text.slice(0, maxLength).trim()}...`;
}
function getTokenVariants(token) {
    const normalizedToken = normalizeForSearch(token);

    const variants = new Set();

    if (!normalizedToken) {
        return [];
    }

    variants.add(normalizedToken);

    const singular = singularizeSpanishToken(normalizedToken);

    if (singular) {
        variants.add(singular);
    }

    const synonyms = SEARCH_SYNONYMS[normalizedToken] || SEARCH_SYNONYMS[singular] || [];

    synonyms.forEach((word) => {
        const normalizedSynonym = normalizeForSearch(word);

        if (normalizedSynonym) {
            variants.add(normalizedSynonym);
            variants.add(singularizeSpanishToken(normalizedSynonym));
        }
    });

    return Array.from(variants).filter(Boolean);
}

function singularizeSpanishToken(token) {
    if (!token || token.length <= 3) {
        return token;
    }

    if (token.endsWith("ces")) {
        return `${token.slice(0, -3)}z`;
    }

    if (token.endsWith("iones")) {
        return `${token.slice(0, -5)}ion`;
    }

    if (token.endsWith("ades")) {
        return `${token.slice(0, -4)}ad`;
    }

    if (token.endsWith("es")) {
        return token.slice(0, -2);
    }

    if (token.endsWith("s")) {
        return token.slice(0, -1);
    }

    return token;
}

function fieldHasAnyVariant(fieldText, variants) {
    if (!fieldText || !variants || variants.length === 0) {
        return false;
    }

    const normalizedField = normalizeForSearch(fieldText);

    const fieldTokens = normalizedField
        .split(/\s+/)
        .filter(Boolean);

    const searchableTokens = new Set();

    fieldTokens.forEach((token) => {
        searchableTokens.add(token);

        const singular = singularizeSpanishToken(token);

        if (singular) {
            searchableTokens.add(singular);
        }
    });

    return variants.some((variant) => {
        const normalizedVariant = normalizeForSearch(variant);

        if (!normalizedVariant || normalizedVariant.length < 3) {
            return false;
        }

        // Si es una frase, permite buscarla dentro del texto completo.
        // Ejemplo: "comida rapida", "centro comercial"
        if (normalizedVariant.includes(" ")) {
            return normalizedField.includes(normalizedVariant);
        }

        // Si es una palabra, exige coincidencia exacta.
        // Así "bar" ya no coincide con "barberia".
        return searchableTokens.has(normalizedVariant);
    });
}

const SEARCH_SYNONYMS = {
    discoteca: [
        "discotecas",
        "disco",
        "discos",
        "club",
        "clubs",
        "club nocturno",
        "bar nocturno",
        "bares nocturnos",
        "fiesta",
        "farra",
        "rumba",
        "entretenimiento nocturno"
    ],

    discotecas: [
        "discoteca",
        "disco",
        "discos",
        "club",
        "clubs",
        "club nocturno",
        "bar nocturno",
        "bares nocturnos",
        "fiesta",
        "farra",
        "rumba",
        "entretenimiento nocturno"
    ],

    bar: [
        "bares",
        "bar nocturno",
        "discoteca",
        "club nocturno",
        "fiesta",
        "farra",
        "rumba"
    ],

    bares: [
        "bar",
        "bar nocturno",
        "discoteca",
        "club nocturno",
        "fiesta",
        "farra",
        "rumba"
    ],

    cafe: ["cafeteria", "cafeterias", "coffee", "bebida", "bebidas", "snack", "snacks"],
    cafeteria: ["cafe", "cafes", "coffee", "desayuno", "snack", "snacks"],

    comida: ["almuerzo", "almuerzos", "desayuno", "desayunos", "cena", "snack", "snacks", "restaurante", "restaurantes"],
    restaurante: ["restaurantes", "comida", "almuerzo", "cena", "menu", "menú"],

    papeleria: ["papelería", "copias", "impresiones", "impresion", "impresión", "utiles", "útiles"],
    impresion: ["impresion", "impresión", "impresiones", "copias", "papeleria", "papelería"],

    ropa: ["camiseta", "camisetas", "moda", "outfit", "prendas"],
    delivery: ["entrega", "envio", "envío", "domicilio", "pedido", "pedidos"]
};
export default router;
