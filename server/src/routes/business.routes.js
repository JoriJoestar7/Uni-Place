import express from "express";
import fs from "fs";
import path from "path";
import { pool } from "../db.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
    uploadBusinessImages,
    uploadBusinessDocuments,
    getPublicUploadUrl
} from "../middleware/upload.middleware.js";

const router = express.Router();

const DAYS = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
];

const DOCUMENTS_ROOT = path.join(process.cwd(), "public/uploads/businesses/documents");

router.get("/me", verifyToken, async (req, res) => {
    try {
        const business = await getBusinessProfileByOwner(req.user.id);

        if (!business) {
            return res.status(404).json({
                ok: false,
                message: "No existe un emprendimiento registrado para este usuario."
            });
        }

        return res.json({
            ok: true,
            business
        });

    } catch (error) {
        console.error("BUSINESS_ME_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al obtener el emprendimiento.",
            error: error.message
        });
    }
});

router.get("/map", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                b.id,
                b.business_name,
                b.slug,
                b.business_type,
                b.category_label,
                b.short_description,
                b.description,
                b.city,
                b.address,
                b.campus_zone,
                b.reference_point,
                b.whatsapp,
                b.phone,
                b.instagram_url,
                b.website_url,
                b.price_min,
                b.price_max,
                b.schedule_summary,
                b.is_ai_visible,
                b.status,
                k.knowledge_status,
                k.priority_score
            FROM businesses b
            LEFT JOIN business_ai_knowledge k ON k.business_id = b.id
            WHERE b.status = 'approved'
              AND b.is_ai_visible = 1
              AND (k.knowledge_status = 'active' OR k.knowledge_status IS NULL)
            ORDER BY k.priority_score DESC, b.updated_at DESC
            LIMIT 80
        `);

        const businesses = rows
            .filter(isInsideLaMariscal)
            .map(toMapBusiness);

        return res.json({
            ok: true,
            zone: {
                name: "La Mariscal",
                city: "Quito",
                center: {
                    lat: -0.2009,
                    lng: -78.4898
                }
            },
            businesses
        });

    } catch (error) {
        console.error("BUSINESS_MAP_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al cargar el mapa de emprendimientos."
        });
    }
});

router.post("/register", verifyToken, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        if (req.user.role !== "entrepreneur") {
            return res.status(403).json({
                ok: false,
                message: "Solo las cuentas de emprendimiento pueden registrar un negocio."
            });
        }

        const payload = normalizeBusinessPayload(req.body);
        const validationMessage = validateBusinessPayload(payload);

        if (validationMessage) {
            return res.status(400).json({
                ok: false,
                message: validationMessage
            });
        }

        await connection.beginTransaction();

        const [existingBusiness] = await connection.execute(
            "SELECT id, slug, status FROM businesses WHERE owner_user_id = ? LIMIT 1",
            [req.user.id]
        );

        let businessId;
        let slug;
        let previousStatus = null;

        if (existingBusiness.length > 0) {
            businessId = existingBusiness[0].id;
            slug = existingBusiness[0].slug;
            previousStatus = existingBusiness[0].status;

            await connection.execute(
                `UPDATE businesses SET
                    business_name = ?,
                    description = ?,
                    short_description = ?,
                    business_type = ?,
                    category_label = ?,
                    category_id = ?,
                    city = ?,
                    address = ?,
                    campus_zone = ?,
                    reference_point = ?,
                    phone = ?,
                    whatsapp = ?,
                    email = ?,
                    website_url = ?,
                    instagram_url = ?,
                    facebook_url = ?,
                    tiktok_url = ?,
                    price_min = ?,
                    price_max = ?,
                    payment_methods = ?,
                    delivery_options = ?,
                    service_area = ?,
                    keywords = ?,
                    target_audience = ?,
                    main_products = ?,
                    menu_summary = ?,
                    schedule_summary = ?,
                    faq_summary = ?,
                    ai_extra_context = ?,
                    status = 'pending',
                    is_ai_visible = 0,
                    rejection_reason = NULL,
                    rejected_at = NULL,
                    resubmitted_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [
                    payload.businessName,
                    payload.description,
                    payload.shortDescription,
                    payload.businessType,
                    payload.category,
                    null,
                    payload.city,
                    payload.address,
                    payload.campusZone,
                    payload.referencePoint,
                    payload.phone,
                    payload.whatsapp,
                    payload.email,
                    payload.website,
                    payload.instagram,
                    payload.facebook,
                    payload.tiktok,
                    payload.priceMin,
                    payload.priceMax,
                    payload.paymentMethods,
                    payload.deliveryOptions,
                    payload.serviceArea,
                    payload.keywords,
                    payload.targetAudience,
                    payload.mainProducts,
                    payload.menuSummary,
                    payload.scheduleSummary,
                    payload.faqSummary,
                    payload.aiExtraContext,
                    businessId
                ]
            );

        } else {
            slug = await createUniqueSlug(payload.businessName, connection);

            const [result] = await connection.execute(
                `INSERT INTO businesses (
                    owner_user_id,
                    business_name,
                    slug,
                    description,
                    short_description,
                    business_type,
                    category_label,
                    category_id,
                    city,
                    address,
                    campus_zone,
                    reference_point,
                    phone,
                    whatsapp,
                    email,
                    website_url,
                    instagram_url,
                    facebook_url,
                    tiktok_url,
                    price_min,
                    price_max,
                    payment_methods,
                    delivery_options,
                    service_area,
                    keywords,
                    target_audience,
                    main_products,
                    menu_summary,
                    schedule_summary,
                    faq_summary,
                    ai_extra_context,
                    status,
                    is_ai_visible
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
                [
                    req.user.id,
                    payload.businessName,
                    slug,
                    payload.description,
                    payload.shortDescription,
                    payload.businessType,
                    payload.category,
                    null,
                    payload.city,
                    payload.address,
                    payload.campusZone,
                    payload.referencePoint,
                    payload.phone,
                    payload.whatsapp,
                    payload.email,
                    payload.website,
                    payload.instagram,
                    payload.facebook,
                    payload.tiktok,
                    payload.priceMin,
                    payload.priceMax,
                    payload.paymentMethods,
                    payload.deliveryOptions,
                    payload.serviceArea,
                    payload.keywords,
                    payload.targetAudience,
                    payload.mainProducts,
                    payload.menuSummary,
                    payload.scheduleSummary,
                    payload.faqSummary,
                    payload.aiExtraContext
                ]
            );

            businessId = result.insertId;
        }

        await replaceBusinessMenuItems(connection, businessId, payload.menuItems);
        await replaceBusinessHours(connection, businessId, payload.hours);
        await replaceBusinessFaqs(connection, businessId, payload.faqs);

        const knowledgeText = buildBusinessKnowledgeText({
            ...payload,
            slug,
            status: "pending"
        });

        await upsertAiKnowledge(connection, businessId, {
            knowledgeText,
            keywords: payload.keywords,
            priorityScore: 70,
            knowledgeStatus: "inactive"
        });

        await connection.commit();

        const business = await getBusinessProfileById(businessId);

        return res.status(existingBusiness.length > 0 ? 200 : 201).json({
            ok: true,
            message: existingBusiness.length > 0
                ? "Ficha actualizada correctamente. El emprendimiento volvió a quedar pendiente de revisión."
                : "Emprendimiento registrado correctamente. Queda pendiente de revisión.",
            previousStatus,
            business
        });

    } catch (error) {
        await connection.rollback();

        console.error("BUSINESS_REGISTER_ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                ok: false,
                message: "Ya existe un emprendimiento registrado con datos similares."
            });
        }

        return res.status(500).json({
            ok: false,
            message: "Error interno al registrar el emprendimiento.",
            error: error.message
        });
    } finally {
        connection.release();
    }
});


router.patch(
    "/me/images",
    verifyToken,
    uploadBusinessImages.fields([
        { name: "businessLogo", maxCount: 1 },
        { name: "businessCover", maxCount: 1 },
        { name: "businessPhotos", maxCount: 6 }
    ]),
    async (req, res) => {
        const connection = await pool.getConnection();

        try {
            if (req.user.role !== "entrepreneur") {
                return res.status(403).json({
                    ok: false,
                    message: "Solo las cuentas de emprendimiento pueden subir imágenes."
                });
            }

            const [businesses] = await connection.execute(
                "SELECT id, status FROM businesses WHERE owner_user_id = ? LIMIT 1",
                [req.user.id]
            );

            if (businesses.length === 0) {
                return res.status(404).json({
                    ok: false,
                    message: "Primero debes registrar la ficha de tu emprendimiento."
                });
            }

            const businessId = businesses[0].id;
            const logoFile = req.files?.businessLogo?.[0] || null;
            const coverFile = req.files?.businessCover?.[0] || null;
            const galleryFiles = req.files?.businessPhotos || [];

            if (!logoFile && !coverFile && galleryFiles.length === 0) {
                return res.status(400).json({
                    ok: false,
                    message: "Selecciona al menos una imagen para subir."
                });
            }

            await connection.beginTransaction();

            if (logoFile) {
                await connection.execute(
                    "UPDATE businesses SET logo_url = ? WHERE id = ?",
                    [getPublicUploadUrl(logoFile), businessId]
                );
            }

            if (coverFile) {
                await connection.execute(
                    "UPDATE businesses SET cover_image_url = ? WHERE id = ?",
                    [getPublicUploadUrl(coverFile), businessId]
                );
            }

            for (const file of galleryFiles) {
                await connection.execute(
                    `INSERT INTO business_photos (business_id, image_url)
                     VALUES (?, ?)`,
                    [businessId, getPublicUploadUrl(file)]
                );
            }

            await connection.execute(
                `UPDATE businesses
                 SET status = 'pending',
                     is_ai_visible = 0,
                     rejection_reason = NULL,
                     rejected_at = NULL,
                     resubmitted_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [businessId]
            );

            await connection.execute(
                `UPDATE business_ai_knowledge
                 SET knowledge_status = 'inactive',
                     priority_score = 0,
                     last_generated_at = CURRENT_TIMESTAMP
                 WHERE business_id = ?`,
                [businessId]
            );

            await connection.commit();

            const business = await getBusinessProfileById(businessId);

            return res.json({
                ok: true,
                message: "Imágenes actualizadas. El emprendimiento volvió a quedar pendiente de revisión.",
                business
            });

        } catch (error) {
            await connection.rollback();

            console.error("BUSINESS_IMAGES_ERROR:", error);

            return res.status(500).json({
                ok: false,
                message: error.message || "Error al subir imágenes del emprendimiento."
            });
        } finally {
            connection.release();
        }
    }
);

router.patch(
    "/me/documents",
    verifyToken,
    uploadBusinessDocuments.fields([
        { name: "rucDocument", maxCount: 1 },
        { name: "permitDocument", maxCount: 1 },
        { name: "extraDocument", maxCount: 1 }
    ]),
    async (req, res) => {
        const connection = await pool.getConnection();

        try {
            if (req.user.role !== "entrepreneur") {
                return res.status(403).json({
                    ok: false,
                    message: "Solo las cuentas de emprendimiento pueden subir documentos."
                });
            }

            const [businesses] = await connection.execute(
                "SELECT id FROM businesses WHERE owner_user_id = ? LIMIT 1",
                [req.user.id]
            );

            if (businesses.length === 0) {
                return res.status(404).json({
                    ok: false,
                    message: "Primero debes registrar la ficha de tu emprendimiento."
                });
            }

            const uploadedFiles = [
                ...(req.files?.rucDocument || []).map((file) => toDocumentRecord(file, "ruc")),
                ...(req.files?.permitDocument || []).map((file) => toDocumentRecord(file, "permit")),
                ...(req.files?.extraDocument || []).map((file) => toDocumentRecord(file, "extra"))
            ];

            if (uploadedFiles.length === 0) {
                return res.status(400).json({
                    ok: false,
                    message: "Sube al menos un documento para revisión."
                });
            }

            const businessId = businesses[0].id;

            await connection.beginTransaction();

            await saveBusinessDocuments(connection, businessId, uploadedFiles);

            await connection.execute(
                `UPDATE businesses
                 SET status = 'pending',
                     is_ai_visible = 0,
                     rejection_reason = NULL,
                     rejected_at = NULL,
                     resubmitted_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [businessId]
            );

            await connection.commit();

            const business = await getBusinessProfileById(businessId);

            return res.json({
                ok: true,
                message: "Documentos subidos correctamente. El emprendimiento quedó pendiente de revisión.",
                business
            });

        } catch (error) {
            await connection.rollback();

            console.error("BUSINESS_DOCUMENTS_ERROR:", error);

            return res.status(500).json({
                ok: false,
                message: "Error al subir documentos del emprendimiento."
            });
        } finally {
            connection.release();
        }
    }
);

router.delete("/me/photos/:photoId", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== "entrepreneur") {
            return res.status(403).json({
                ok: false,
                message: "Solo las cuentas de emprendimiento pueden eliminar fotos."
            });
        }

        const { photoId } = req.params;

        const [businesses] = await pool.execute(
            "SELECT id FROM businesses WHERE owner_user_id = ? LIMIT 1",
            [req.user.id]
        );

        if (businesses.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "No tienes un emprendimiento registrado."
            });
        }

        const [result] = await pool.execute(
            `DELETE FROM business_photos
             WHERE id = ?
             AND business_id = ?`,
            [photoId, businesses[0].id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                message: "Foto no encontrada."
            });
        }

        return res.json({
            ok: true,
            message: "Foto eliminada correctamente."
        });

    } catch (error) {
        console.error("BUSINESS_DELETE_PHOTO_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al eliminar la foto."
        });
    }
});


async function getBusinessProfileByOwner(ownerUserId) {
    const [businesses] = await pool.execute(
        "SELECT * FROM businesses WHERE owner_user_id = ? LIMIT 1",
        [ownerUserId]
    );

    if (businesses.length === 0) return null;

    return enrichBusinessProfile(businesses[0]);
}

async function getBusinessProfileById(businessId) {
    const [businesses] = await pool.execute(
        "SELECT * FROM businesses WHERE id = ? LIMIT 1",
        [businessId]
    );

    if (businesses.length === 0) return null;

    return enrichBusinessProfile(businesses[0]);
}

async function enrichBusinessProfile(business) {
    const [menuItems] = await pool.execute(
        `SELECT id, item_name, item_description, item_category, price, is_available
         FROM business_menu_items
         WHERE business_id = ?
         ORDER BY id ASC`,
        [business.id]
    );

    const [hours] = await pool.execute(
        `SELECT id, day_of_week, opening_time, closing_time, is_closed, notes
         FROM business_hours
         WHERE business_id = ?
         ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`,
        [business.id]
    );

    const [faqs] = await pool.execute(
        `SELECT id, question, answer
         FROM business_faqs
         WHERE business_id = ?
         ORDER BY id ASC`,
        [business.id]
    );

    const [knowledgeRows] = await pool.execute(
        `SELECT id, knowledge_text, keywords, priority_score, knowledge_status, last_generated_at
         FROM business_ai_knowledge
         WHERE business_id = ?
         LIMIT 1`,
        [business.id]
    );

    const [photos] = await pool.execute(
        `SELECT id, image_url, caption, created_at
         FROM business_photos
         WHERE business_id = ?
         ORDER BY created_at DESC, id DESC`,
        [business.id]
    );

    return {
        ...business,
        menu_items: menuItems,
        hours,
        faqs,
        photos,
        documents: await getBusinessDocuments(business.id),
        ai_knowledge: knowledgeRows[0] || null
    };
}

function toDocumentRecord(file, type) {
    return {
        type,
        label: getDocumentLabel(type),
        original_name: file.originalname,
        file_url: getPublicUploadUrl(file),
        mime_type: file.mimetype,
        size: file.size,
        uploaded_at: new Date().toISOString()
    };
}

function getDocumentLabel(type) {
    const labels = {
        ruc: "RUC",
        permit: "Permiso o patente",
        extra: "Documento adicional"
    };

    return labels[type] || "Documento";
}

async function saveBusinessDocuments(connection, businessId, documents) {
    try {
        for (const document of documents) {
            await connection.execute(
                `INSERT INTO business_documents (
                    business_id,
                    document_type,
                    document_label,
                    original_name,
                    file_url,
                    mime_type,
                    file_size,
                    uploaded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    businessId,
                    document.type,
                    document.label,
                    document.original_name,
                    document.file_url,
                    document.mime_type,
                    document.size
                ]
            );
        }
    } catch (error) {
        if (!isMissingBusinessDocumentsTable(error)) {
            throw error;
        }

        saveBusinessDocumentsManifest(businessId, documents);
    }
}

async function getBusinessDocuments(businessId) {
    try {
        const [rows] = await pool.execute(
            `SELECT
                id,
                document_type AS type,
                document_label AS label,
                original_name,
                file_url,
                mime_type,
                file_size AS size,
                uploaded_at
             FROM business_documents
             WHERE business_id = ?
             ORDER BY uploaded_at DESC, id DESC`,
            [businessId]
        );

        return rows;
    } catch (error) {
        if (!isMissingBusinessDocumentsTable(error)) {
            throw error;
        }

        return readBusinessDocumentsManifest(businessId);
    }
}

function saveBusinessDocumentsManifest(businessId, documents) {
    fs.mkdirSync(DOCUMENTS_ROOT, { recursive: true });

    const manifestPath = getBusinessDocumentsManifestPath(businessId);
    const existing = readBusinessDocumentsManifest(businessId);
    const next = [...documents, ...existing].slice(0, 20);

    fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2), "utf8");
}

function readBusinessDocumentsManifest(businessId) {
    const manifestPath = getBusinessDocumentsManifestPath(businessId);

    if (!fs.existsSync(manifestPath)) {
        return [];
    }

    try {
        return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
        return [];
    }
}

function getBusinessDocumentsManifestPath(businessId) {
    return path.join(DOCUMENTS_ROOT, `business-${businessId}.json`);
}

function isMissingBusinessDocumentsTable(error) {
    return String(error?.message || "").includes("business_documents")
        || error?.code === "ER_NO_SUCH_TABLE";
}

function normalizeBusinessPayload(body) {
    const menuItems = Array.isArray(body.menuItems) ? body.menuItems : [];
    const hours = Array.isArray(body.hours) ? body.hours : [];
    const faqs = Array.isArray(body.faqs) ? body.faqs : [];

    const description = cleanText(body.description);
    const shortDescription = cleanText(body.shortDescription) || createShortDescription(description);

    return {
        businessName: cleanText(body.businessName),
        businessType: cleanText(body.businessType),
        category: cleanText(body.category),
        description,
        shortDescription,
        city: cleanText(body.city),
        address: cleanText(body.address),
        campusZone: cleanText(body.campusZone),
        referencePoint: cleanText(body.referencePoint),
        phone: cleanText(body.phone),
        whatsapp: cleanText(body.whatsapp) || cleanText(body.phone),
        email: cleanText(body.email),
        website: cleanText(body.website),
        instagram: cleanText(body.instagram),
        facebook: cleanText(body.facebook),
        tiktok: cleanText(body.tiktok),
        priceMin: parseOptionalNumber(body.priceMin),
        priceMax: parseOptionalNumber(body.priceMax),
        paymentMethods: cleanText(body.paymentMethods),
        deliveryOptions: cleanText(body.deliveryOptions),
        serviceArea: cleanText(body.serviceArea),
        keywords: cleanText(body.keywords || body.category),
        targetAudience: cleanText(body.targetAudience) || "Estudiantes universitarios",
        mainProducts: cleanText(body.mainProducts),
        menuSummary: cleanText(body.menuSummary),
        scheduleSummary: cleanText(body.scheduleSummary),
        faqSummary: cleanText(body.faqSummary),
        aiExtraContext: cleanText(body.aiExtraContext),
        menuItems: menuItems
            .map(normalizeMenuItem)
            .filter((item) => item.itemName),
        hours: normalizeHours(hours),
        faqs: faqs
            .map(normalizeFaq)
            .filter((faq) => faq.question && faq.answer)
    };
}

function validateBusinessPayload(payload) {
    if (!payload.businessName || !payload.businessType || !payload.category) {
        return "Completa nombre, tipo y categoría del emprendimiento.";
    }

    if (!payload.description || payload.description.length < 30) {
        return "La descripción completa debe tener al menos 30 caracteres.";
    }

    if (!payload.shortDescription || payload.shortDescription.length < 15) {
        return "La descripción corta debe tener al menos 15 caracteres.";
    }

    if (!payload.phone || !payload.whatsapp) {
        return "Completa teléfono y WhatsApp del emprendimiento.";
    }

    if (!payload.city || !payload.address) {
        return "Completa ciudad y dirección o punto de referencia.";
    }

    if (payload.menuItems.length === 0 && !payload.menuSummary && !payload.mainProducts) {
        return "Agrega al menos un producto/servicio, menú o resumen de oferta.";
    }

    if (payload.hours.length === 0 && !payload.scheduleSummary) {
        return "Agrega al menos un horario de atención o un resumen de horarios.";
    }

    return null;
}

function isInsideLaMariscal(business) {
    const locationText = normalizeForSearch([
        business.city,
        business.address,
        business.campus_zone,
        business.reference_point,
        business.description,
        business.short_description
    ].filter(Boolean).join(" "));

    const cityIsQuito = !business.city || normalizeForSearch(business.city).includes("quito");
    const mariscalSignals = [
        "mariscal",
        "foch",
        "amazonas",
        "colon",
        "reina victoria",
        "juan leon mera",
        "6 de diciembre",
        "seis de diciembre",
        "wilson",
        "veintimilla",
        "lizardo garcia",
        "la pinta",
        "calama",
        "robles"
    ];

    return cityIsQuito && mariscalSignals.some((signal) => locationText.includes(signal));
}

function toMapBusiness(business) {
    const coordinates = getStableLaMariscalCoordinates(business);

    return {
        id: business.id,
        business_name: business.business_name,
        category: business.category_label || business.business_type || "Emprendimiento",
        description: business.short_description || createShortDescription(business.description || ""),
        city: business.city,
        address: business.address,
        campus_zone: business.campus_zone,
        reference_point: business.reference_point,
        whatsapp: business.whatsapp,
        phone: business.phone,
        instagram_url: business.instagram_url,
        website_url: business.website_url,
        price_range: formatPriceRange(business.price_min, business.price_max),
        schedule_summary: business.schedule_summary,
        knowledge_status: business.knowledge_status || "active",
        priority_score: business.priority_score || 70,
        lat: coordinates.lat,
        lng: coordinates.lng
    };
}

function getStableLaMariscalCoordinates(business) {
    const bounds = {
        north: -0.1908,
        south: -0.2116,
        west: -78.4986,
        east: -78.4810
    };

    const seed = String([
        business.id,
        business.business_name,
        business.address,
        business.campus_zone
    ].filter(Boolean).join("|"));

    let hash = 0;

    for (let index = 0; index < seed.length; index++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(index);
        hash |= 0;
    }

    const latRatio = Math.abs(hash % 1000) / 1000;
    const lngRatio = Math.abs(Math.floor(hash / 1000) % 1000) / 1000;

    return {
        lat: Number((bounds.south + ((bounds.north - bounds.south) * latRatio)).toFixed(6)),
        lng: Number((bounds.west + ((bounds.east - bounds.west) * lngRatio)).toFixed(6))
    };
}

function normalizeForSearch(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9ñ\s@.]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeMenuItem(item) {
    return {
        itemName: cleanText(item.itemName || item.name),
        itemDescription: cleanText(item.itemDescription || item.description),
        itemCategory: cleanText(item.itemCategory || item.category),
        price: parseOptionalNumber(item.price),
        isAvailable: item.isAvailable === false ? 0 : 1
    };
}

function normalizeHours(hours) {
    return hours
        .map((item) => ({
            dayOfWeek: DAYS.includes(item.dayOfWeek) ? item.dayOfWeek : null,
            openingTime: cleanTime(item.openingTime),
            closingTime: cleanTime(item.closingTime),
            isClosed: item.isClosed ? 1 : 0,
            notes: cleanText(item.notes)
        }))
        .filter((item) => {
            if (!item.dayOfWeek) return false;
            if (item.isClosed) return true;
            return item.openingTime && item.closingTime;
        });
}

function normalizeFaq(item) {
    return {
        question: cleanText(item.question),
        answer: cleanText(item.answer)
    };
}

async function replaceBusinessMenuItems(connection, businessId, menuItems) {
    await connection.execute(
        "DELETE FROM business_menu_items WHERE business_id = ?",
        [businessId]
    );

    for (const item of menuItems) {
        await connection.execute(
            `INSERT INTO business_menu_items (
                business_id,
                item_name,
                item_description,
                item_category,
                price,
                is_available
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                businessId,
                item.itemName,
                item.itemDescription,
                item.itemCategory,
                item.price,
                item.isAvailable
            ]
        );
    }
}

async function replaceBusinessHours(connection, businessId, hours) {
    await connection.execute(
        "DELETE FROM business_hours WHERE business_id = ?",
        [businessId]
    );

    for (const item of hours) {
        await connection.execute(
            `INSERT INTO business_hours (
                business_id,
                day_of_week,
                opening_time,
                closing_time,
                is_closed,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                businessId,
                item.dayOfWeek,
                item.openingTime,
                item.closingTime,
                item.isClosed,
                item.notes
            ]
        );
    }
}

async function replaceBusinessFaqs(connection, businessId, faqs) {
    await connection.execute(
        "DELETE FROM business_faqs WHERE business_id = ?",
        [businessId]
    );

    for (const item of faqs) {
        await connection.execute(
            `INSERT INTO business_faqs (
                business_id,
                question,
                answer
            ) VALUES (?, ?, ?)`,
            [businessId, item.question, item.answer]
        );
    }
}

async function upsertAiKnowledge(connection, businessId, data) {
    await connection.execute(
        `INSERT INTO business_ai_knowledge (
            business_id,
            knowledge_text,
            keywords,
            priority_score,
            knowledge_status,
            last_generated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            knowledge_text = VALUES(knowledge_text),
            keywords = VALUES(keywords),
            priority_score = VALUES(priority_score),
            knowledge_status = VALUES(knowledge_status),
            last_generated_at = CURRENT_TIMESTAMP`,
        [
            businessId,
            data.knowledgeText,
            data.keywords,
            data.priorityScore,
            data.knowledgeStatus
        ]
    );
}

function buildBusinessKnowledgeText(payload) {
    const menuText = payload.menuItems.length > 0
        ? payload.menuItems
            .map((item) => `- ${item.itemName}${item.itemCategory ? ` (${item.itemCategory})` : ""}${item.price !== null ? `: $${item.price}` : ""}${item.itemDescription ? `. ${item.itemDescription}` : ""}`)
            .join("\n")
        : payload.menuSummary || payload.mainProducts || "No se registró menú detallado.";

    const hoursText = payload.hours.length > 0
        ? payload.hours
            .map((item) => {
                if (item.isClosed) return `- ${translateDay(item.dayOfWeek)}: cerrado${item.notes ? ` (${item.notes})` : ""}`;
                return `- ${translateDay(item.dayOfWeek)}: ${item.openingTime} a ${item.closingTime}${item.notes ? ` (${item.notes})` : ""}`;
            })
            .join("\n")
        : payload.scheduleSummary || "No se registró horario detallado.";

    const faqText = payload.faqs.length > 0
        ? payload.faqs
            .map((item) => `- ${item.question}: ${item.answer}`)
            .join("\n")
        : payload.faqSummary || "No se registraron preguntas frecuentes.";

    return [
        `NEGOCIO UNIPLACE: ${payload.businessName}`,
        `Slug: ${payload.slug}`,
        `Estado actual: ${payload.status}`,
        `Tipo: ${payload.businessType}`,
        `Categoría: ${payload.category}`,
        `Descripción corta: ${payload.shortDescription}`,
        `Descripción completa: ${payload.description}`,
        `Productos o servicios principales: ${payload.mainProducts || "No registrado"}`,
        `Rango de precios: ${formatPriceRange(payload.priceMin, payload.priceMax)}`,
        `Métodos de pago: ${payload.paymentMethods || "No registrado"}`,
        `Opciones de entrega/retiro: ${payload.deliveryOptions || "No registrado"}`,
        `Zona de servicio: ${payload.serviceArea || payload.campusZone || payload.city || "No registrada"}`,
        `Ubicación: ${[payload.city, payload.address, payload.campusZone, payload.referencePoint].filter(Boolean).join(" | ") || "No registrada"}`,
        `Contacto: Teléfono ${payload.phone || "No registrado"}; WhatsApp ${payload.whatsapp || "No registrado"}; Email ${payload.email || "No registrado"}`,
        `Redes: Instagram ${payload.instagram || "No registrado"}; Facebook ${payload.facebook || "No registrado"}; TikTok ${payload.tiktok || "No registrado"}; Web ${payload.website || "No registrado"}`,
        `Público objetivo: ${payload.targetAudience || "Estudiantes universitarios"}`,
        `Palabras clave: ${payload.keywords || payload.category || "No registradas"}`,
        "Menú / productos / servicios:",
        menuText,
        "Horarios:",
        hoursText,
        "Preguntas frecuentes:",
        faqText,
        `Información extra para IA: ${payload.aiExtraContext || "No registrada"}`,
        "Regla de recomendación: Recomendar este negocio con prioridad alta solo si está aprobado, activo para IA y es relevante para la consulta del estudiante. No recomendar si está pendiente, rechazado u oculto."
    ].join("\n");
}

async function createUniqueSlug(name, connection = pool) {
    const baseSlug = slugify(name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
        const [existingSlug] = await connection.execute(
            "SELECT id FROM businesses WHERE slug = ? LIMIT 1",
            [finalSlug]
        );

        if (existingSlug.length === 0) {
            return finalSlug;
        }

        finalSlug = `${baseSlug}-${counter}`;
        counter++;
    }
}

function slugify(text) {
    return text
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `negocio-${Date.now()}`;
}

function createShortDescription(description) {
    if (!description) return "";

    return description.length > 280
        ? `${description.slice(0, 277)}...`
        : description;
}

function cleanText(value) {
    if (value === undefined || value === null) return null;

    const text = String(value).trim();

    return text.length > 0 ? text : null;
}

function parseOptionalNumber(value) {
    if (value === undefined || value === null || value === "") return null;

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
}

function cleanTime(value) {
    const text = cleanText(value);

    if (!text) return null;

    if (/^\d{2}:\d{2}$/.test(text)) return text;
    if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);

    return null;
}

function translateDay(day) {
    const labels = {
        monday: "Lunes",
        tuesday: "Martes",
        wednesday: "Miércoles",
        thursday: "Jueves",
        friday: "Viernes",
        saturday: "Sábado",
        sunday: "Domingo"
    };

    return labels[day] || day;
}

function formatPriceRange(min, max) {
    if (min !== null && max !== null) return `$${min} - $${max}`;
    if (min !== null) return `Desde $${min}`;
    if (max !== null) return `Hasta $${max}`;
    return "No registrado";
}

export default router;
