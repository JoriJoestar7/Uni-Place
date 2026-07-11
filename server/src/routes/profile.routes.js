import express from "express";
import fs from "fs";
import { pool } from "../db.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { uploadAvatar } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/me", async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT
                id,
                name,
                display_name,
                email,
                phone,
                bio,
                avatar_url,
                role,
                created_at
            FROM users
            WHERE id = ?
            LIMIT 1`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "Usuario no encontrado."
            });
        }

        return res.json({
            ok: true,
            user: users[0]
        });

    } catch (error) {
        console.error("PROFILE_ME_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al obtener perfil.",
            error: error.message
        });
    }
});

router.put("/me", async (req, res) => {
    try {
        const {
            name,
            displayName,
            phone,
            bio
        } = req.body;

        const cleanName = cleanText(name);
        const cleanDisplayName = cleanText(displayName);
        const cleanPhone = cleanText(phone);
        const cleanBio = cleanText(bio);

        if (!cleanName) {
            return res.status(400).json({
                ok: false,
                message: "El nombre no puede estar vacío."
            });
        }

        await pool.execute(
            `UPDATE users
             SET name = ?,
                 display_name = ?,
                 phone = ?,
                 bio = ?
             WHERE id = ?`,
            [
                cleanName,
                cleanDisplayName || cleanName,
                cleanPhone,
                cleanBio,
                req.user.id
            ]
        );

        const [users] = await pool.execute(
            `SELECT
                id,
                name,
                display_name,
                email,
                phone,
                bio,
                avatar_url,
                role,
                created_at
            FROM users
            WHERE id = ?
            LIMIT 1`,
            [req.user.id]
        );

        return res.json({
            ok: true,
            message: "Perfil actualizado correctamente.",
            user: users[0]
        });

    } catch (error) {
        console.error("PROFILE_UPDATE_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al actualizar perfil.",
            error: error.message
        });
    }
});

router.post("/avatar", uploadAvatar.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                ok: false,
                message: "No se recibió ninguna imagen."
            });
        }

        const avatarUrl = createAvatarDataUrl(req.file);

        await pool.execute(
            "UPDATE users SET avatar_url = ? WHERE id = ?",
            [avatarUrl, req.user.id]
        );

        removeTemporaryUpload(req.file.path);

        const [users] = await pool.execute(
            `SELECT
                id,
                name,
                display_name,
                email,
                phone,
                bio,
                avatar_url,
                role,
                created_at
            FROM users
            WHERE id = ?
            LIMIT 1`,
            [req.user.id]
        );

        return res.json({
            ok: true,
            message: "Foto de perfil actualizada correctamente.",
            avatar_url: avatarUrl,
            user: users[0]
        });

    } catch (error) {
        console.error("PROFILE_AVATAR_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: error.message || "Error al subir foto de perfil."
        });
    }
});

function createAvatarDataUrl(file) {
    const imageBuffer = fs.readFileSync(file.path);
    return `data:${file.mimetype};base64,${imageBuffer.toString("base64")}`;
}

function removeTemporaryUpload(filePath) {
    if (!filePath) return;

    fs.unlink(filePath, (error) => {
        if (error) {
            console.warn("AVATAR_TEMP_DELETE_WARNING:", error.message);
        }
    });
}

function cleanText(value) {
    if (value === undefined || value === null) return null;

    const text = String(value).trim();

    return text.length > 0 ? text : null;
}

export default router;