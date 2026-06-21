import express from "express";
import { pool } from "../db.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", verifyToken, async (req, res) => {
    try {
        const [businesses] = await pool.execute(
            "SELECT * FROM businesses WHERE owner_user_id = ? LIMIT 1",
            [req.user.id]
        );

        if (businesses.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "No existe un emprendimiento registrado para este usuario."
            });
        }

        return res.json({
            ok: true,
            business: businesses[0]
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

router.post("/register", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== "entrepreneur") {
            return res.status(403).json({
                ok: false,
                message: "Solo las cuentas de emprendimiento pueden registrar un negocio."
            });
        }

        const {
            businessName,
            category,
            description,
            phone,
            email,
            instagram,
            website,
            location
        } = req.body;

        if (!businessName || !category || !description || !phone) {
            return res.status(400).json({
                ok: false,
                message: "Completa los campos obligatorios del emprendimiento."
            });
        }

        const [existingBusiness] = await pool.execute(
            "SELECT id FROM businesses WHERE owner_user_id = ? LIMIT 1",
            [req.user.id]
        );

        if (existingBusiness.length > 0) {
            return res.status(409).json({
                ok: false,
                message: "Este usuario ya tiene un emprendimiento registrado."
            });
        }

        const cleanBusinessName = businessName.trim();
        const cleanCategory = category.trim();
        const cleanDescription = description.trim();
        const cleanPhone = phone.trim();

        const slug = await createUniqueSlug(cleanBusinessName);

        const shortDescription =
            cleanDescription.length > 280
                ? `${cleanDescription.slice(0, 277)}...`
                : cleanDescription;

        const [result] = await pool.execute(
            `INSERT INTO businesses (
                owner_user_id,
                business_name,
                slug,
                description,
                short_description,
                category_id,
                city,
                address,
                phone,
                whatsapp,
                email,
                website_url,
                instagram_url,
                keywords,
                target_audience,
                status,
                is_ai_visible
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                cleanBusinessName,
                slug,
                cleanDescription,
                shortDescription,
                null,
                location?.trim() || null,
                location?.trim() || null,
                cleanPhone,
                cleanPhone,
                email?.trim() || null,
                website?.trim() || null,
                instagram?.trim() || null,
                cleanCategory,
                "Estudiantes universitarios",
                "pending",
                1
            ]
        );

        return res.status(201).json({
            ok: true,
            message: "Emprendimiento registrado correctamente. Queda pendiente de revisión.",
            business: {
                id: result.insertId,
                owner_user_id: req.user.id,
                business_name: cleanBusinessName,
                slug,
                description: cleanDescription,
                short_description: shortDescription,
                category: cleanCategory,
                city: location?.trim() || null,
                address: location?.trim() || null,
                phone: cleanPhone,
                whatsapp: cleanPhone,
                email: email?.trim() || null,
                website_url: website?.trim() || null,
                instagram_url: instagram?.trim() || null,
                keywords: cleanCategory,
                target_audience: "Estudiantes universitarios",
                status: "pending",
                is_ai_visible: 1
            }
        });

    } catch (error) {
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
    }
});

async function createUniqueSlug(name) {
    const baseSlug = slugify(name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
        const [existingSlug] = await pool.execute(
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
        .replace(/^-+|-+$/g, "");
}

export default router;