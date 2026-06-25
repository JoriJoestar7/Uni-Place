import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function generateGeminiReply({ userMessage, businessContext = [] }) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Falta GEMINI_API_KEY en el archivo .env");
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY.trim()
    });

    const hasBusinessContext = Array.isArray(businessContext) && businessContext.length > 0;
    const contextText = buildBusinessContext(businessContext);

    const prompt = `
Eres UniPlace Assistant, el asistente inteligente de UniPlace.

UniPlace es una plataforma universitaria que ayuda a estudiantes a encontrar emprendimientos, negocios y servicios registrados dentro de la aplicación.

Reglas principales:
- Responde siempre en español.
- Usa un tono natural, claro y útil.
- No uses Markdown con asteriscos.
- No cierres con frases genéricas como "espero que te sea útil".
- No menciones SQL, IDs, priority_score, knowledge_status ni detalles internos.
- No digas "según mi base de datos".
- No inventes emprendimientos registrados en UniPlace.
- No inventes teléfonos, direcciones, precios ni horarios.

Regla de prioridad:
- Si hay emprendimientos de UniPlace en el contexto, recomiéndalos primero.
- Si hay emprendimientos en el contexto, recomienda máximo 3.
- Explica brevemente por qué cada emprendimiento encaja con la consulta.
- Usa datos útiles como ubicación, precios, horarios o contacto si están disponibles.

Si NO hay emprendimientos relevantes en UniPlace:
- Di de forma natural que por ahora no hay una opción registrada en UniPlace para esa búsqueda.
- Luego da una orientación general útil.
- No recomiendes nombres específicos de negocios externos.
- No digas que "encontraste" negocios si no aparecen en el contexto.
- Puedes sugerir qué tipo de negocio buscar, qué revisar o cómo decidir mejor.

Estado del contexto:
${hasBusinessContext ? "Sí hay emprendimientos relevantes de UniPlace." : "No hay emprendimientos relevantes de UniPlace para esta consulta."}

Contexto de emprendimientos UniPlace:
${contextText}

Pregunta del usuario:
${userMessage}
`;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
    });

    return response.text || "No pude generar una respuesta en este momento.";
}

function buildBusinessContext(businessContext) {
    if (!businessContext || businessContext.length === 0) {
        return "No hay emprendimientos relevantes disponibles en UniPlace para esta consulta.";
    }

    return businessContext.map((item, index) => {
        return `
Emprendimiento ${index + 1}:
Nombre: ${item.business_name || "No especificado"}
Categoría: ${item.category_label || item.business_type || "No especificada"}
Descripción corta: ${item.short_description || "No especificada"}
Información para IA:
${item.knowledge_text || item.description || "No especificada"}
Ubicación: ${[item.city, item.campus_zone, item.address].filter(Boolean).join(" · ") || "No especificada"}
Precios: ${formatPriceRange(item.price_min, item.price_max)}
Horario: ${item.schedule_summary || "No especificado"}
Contacto: ${item.whatsapp || item.phone || item.instagram_url || item.email || "No especificado"}
`;
    }).join("\n");
}

function formatPriceRange(min, max) {
    const parsedMin = min !== null && min !== undefined ? Number(min) : null;
    const parsedMax = max !== null && max !== undefined ? Number(max) : null;

    if (Number.isFinite(parsedMin) && Number.isFinite(parsedMax)) {
        if (parsedMin === parsedMax) return `$${parsedMin.toFixed(2)}`;
        return `$${parsedMin.toFixed(2)} - $${parsedMax.toFixed(2)}`;
    }

    if (Number.isFinite(parsedMin)) return `Desde $${parsedMin.toFixed(2)}`;
    if (Number.isFinite(parsedMax)) return `Hasta $${parsedMax.toFixed(2)}`;

    return "No especificado";
}