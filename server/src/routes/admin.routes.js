import express from "express";
import { pool } from "../db.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

const validStatuses = ["pending", "approved", "rejected", "hidden"];

router.use(verifyToken);
router.use(requireAdmin);

router.get("/businesses", async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT
                b.id,
                b.owner_user_id,
                b.business_name,
                b.slug,
                b.description,
                b.short_description,
                b.city,
                b.address,
                b.phone,
                b.whatsapp,
                b.email,
                b.website_url,
                b.instagram_url,
                b.facebook_url,
                b.tiktok_url,
                b.keywords,
                b.target_audience,
                b.status,
                b.rejection_reason,
                b.rejected_at,
                b.resubmitted_at,
                b.is_ai_visible,
                b.created_at,
                b.updated_at,
                u.name AS owner_name,
                u.email AS owner_email,
                u.role AS owner_role
            FROM businesses b
            INNER JOIN users u ON u.id = b.owner_user_id
        `;

        const params = [];

        if (status) {
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    ok: false,
                    message: "Estado inválido."
                });
            }

            query += " WHERE b.status = ?";
            params.push(status);
        }

        query += `
            ORDER BY
                CASE
                    WHEN b.status = 'pending' THEN 1
                    WHEN b.status = 'approved' THEN 2
                    WHEN b.status = 'rejected' THEN 3
                    WHEN b.status = 'hidden' THEN 4
                    ELSE 5
                END,
                b.created_at DESC
        `;

        const [businesses] = await pool.execute(query, params);

        return res.json({
            ok: true,
            businesses
        });

    } catch (error) {
        console.error("ADMIN_BUSINESSES_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al obtener emprendimientos.",
            error: error.message
        });
    }
});

router.patch("/businesses/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                ok: false,
                message: "Estado inválido."
            });
        }

        const cleanRejectionReason = typeof rejectionReason === "string"
            ? rejectionReason.trim()
            : "";

        if (status === "rejected" && cleanRejectionReason.length < 10) {
            return res.status(400).json({
                ok: false,
                message: "Para rechazar un emprendimiento debes escribir una razón de al menos 10 caracteres."
            });
        }

        const [existingBusiness] = await pool.execute(
            "SELECT id, business_name, status FROM businesses WHERE id = ? LIMIT 1",
            [id]
        );

        if (existingBusiness.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "Emprendimiento no encontrado."
            });
        }

        if (status === "rejected") {
            await pool.execute(
                `UPDATE businesses
                 SET status = ?, rejection_reason = ?, rejected_at = NOW(), is_ai_visible = 0
                 WHERE id = ?`,
                [status, cleanRejectionReason, id]
            );
        } else {
            const isVisibleForAI = status === "approved" || status === "pending" ? 1 : 0;

            await pool.execute(
                `UPDATE businesses
                 SET status = ?, rejection_reason = NULL, rejected_at = NULL, is_ai_visible = ?
                 WHERE id = ?`,
                [status, isVisibleForAI, id]
            );
        }

        return res.json({
            ok: true,
            message: status === "rejected"
                ? "Emprendimiento rechazado con razón registrada."
                : `Estado actualizado a ${status}.`,
            business: {
                id: Number(id),
                business_name: existingBusiness[0].business_name,
                previous_status: existingBusiness[0].status,
                status,
                rejection_reason: status === "rejected" ? cleanRejectionReason : null
            }
        });

    } catch (error) {
        console.error("ADMIN_UPDATE_BUSINESS_STATUS_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al actualizar el estado del emprendimiento.",
            error: error.message
        });
    }
});

router.get("/stats", async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                status,
                COUNT(*) AS total
            FROM businesses
            GROUP BY status
        `);

        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0,
            hidden: 0
        };

        rows.forEach((row) => {
            stats[row.status] = row.total;
        });

        return res.json({
            ok: true,
            stats
        });

    } catch (error) {
        console.error("ADMIN_STATS_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al obtener estadísticas.",
            error: error.message
        });
    }
});

function requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            ok: false,
            message: "No tienes permisos de administrador."
        });
    }

    next();
}

export default router;