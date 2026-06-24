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
                b.*,
                u.name AS owner_name,
                u.email AS owner_email,
                u.role AS owner_role,
                k.knowledge_text,
                k.priority_score,
                k.knowledge_status,
                k.last_generated_at
            FROM businesses b
            INNER JOIN users u ON u.id = b.owner_user_id
            LEFT JOIN business_ai_knowledge k ON k.business_id = b.id
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
                b.updated_at DESC,
                b.created_at DESC
        `;

        const [businesses] = await pool.execute(query, params);
        const enrichedBusinesses = await enrichBusinesses(businesses);

        return res.json({
            ok: true,
            businesses: enrichedBusinesses
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
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                ok: false,
                message: "Estado inválido."
            });
        }

        if (status === "rejected") {
            const reason = cleanText(rejectionReason);

            if (!reason || reason.length < 12) {
                return res.status(400).json({
                    ok: false,
                    message: "Para rechazar un emprendimiento debes escribir una razón clara de al menos 12 caracteres."
                });
            }
        }

        await connection.beginTransaction();

        const [existingBusiness] = await connection.execute(
            "SELECT id, business_name, status FROM businesses WHERE id = ? LIMIT 1",
            [id]
        );

        if (existingBusiness.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                ok: false,
                message: "Emprendimiento no encontrado."
            });
        }

        const statusConfig = getStatusConfig(status, rejectionReason);

        await connection.execute(
            `UPDATE businesses SET
                status = ?,
                is_ai_visible = ?,
                rejection_reason = ?,
                rejected_at = ?,
                resubmitted_at = CASE WHEN ? = 'pending' THEN CURRENT_TIMESTAMP ELSE resubmitted_at END
            WHERE id = ?`,
            [
                status,
                statusConfig.isAiVisible,
                statusConfig.rejectionReason,
                statusConfig.rejectedAt,
                status,
                id
            ]
        );

        await connection.execute(
            `INSERT INTO business_ai_knowledge (
                business_id,
                knowledge_text,
                keywords,
                priority_score,
                knowledge_status,
                last_generated_at
            )
            SELECT
                id,
                CONCAT(
                    'NEGOCIO UNIPLACE: ', business_name, '\n',
                    'Descripción: ', COALESCE(description, 'No registrada'), '\n',
                    'Ubicación: ', COALESCE(city, ''), ' ', COALESCE(address, ''), '\n',
                    'Palabras clave: ', COALESCE(keywords, 'No registradas'), '\n',
                    'Regla: recomendar solo si está aprobado, activo para IA y es relevante para la consulta.'
                ),
                keywords,
                ?,
                ?,
                CURRENT_TIMESTAMP
            FROM businesses
            WHERE id = ?
            ON DUPLICATE KEY UPDATE
                priority_score = VALUES(priority_score),
                knowledge_status = VALUES(knowledge_status),
                last_generated_at = CURRENT_TIMESTAMP`,
            [
                statusConfig.priorityScore,
                statusConfig.knowledgeStatus,
                id
            ]
        );

        await connection.commit();

        return res.json({
            ok: true,
            message: `Estado actualizado a ${status}.`,
            business: {
                id: Number(id),
                business_name: existingBusiness[0].business_name,
                previous_status: existingBusiness[0].status,
                status,
                rejection_reason: statusConfig.rejectionReason,
                is_ai_visible: statusConfig.isAiVisible,
                knowledge_status: statusConfig.knowledgeStatus,
                priority_score: statusConfig.priorityScore
            }
        });

    } catch (error) {
        await connection.rollback();

        console.error("ADMIN_UPDATE_BUSINESS_STATUS_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al actualizar el estado del emprendimiento.",
            error: error.message
        });
    } finally {
        connection.release();
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

        const [knowledgeRows] = await pool.execute(`
            SELECT
                knowledge_status,
                COUNT(*) AS total
            FROM business_ai_knowledge
            GROUP BY knowledge_status
        `);

        const knowledge = {
            draft: 0,
            active: 0,
            inactive: 0
        };

        knowledgeRows.forEach((row) => {
            knowledge[row.knowledge_status] = row.total;
        });

        return res.json({
            ok: true,
            stats,
            knowledge
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

async function enrichBusinesses(businesses) {
    const enriched = [];

    for (const business of businesses) {
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

        enriched.push({
            ...business,
            menu_items: menuItems,
            hours,
            faqs
        });
    }

    return enriched;
}

function getStatusConfig(status, rejectionReason) {
    if (status === "approved") {
        return {
            isAiVisible: 1,
            rejectionReason: null,
            rejectedAt: null,
            knowledgeStatus: "active",
            priorityScore: 95
        };
    }

    if (status === "rejected") {
        return {
            isAiVisible: 0,
            rejectionReason: cleanText(rejectionReason),
            rejectedAt: new Date(),
            knowledgeStatus: "inactive",
            priorityScore: 0
        };
    }

    if (status === "hidden") {
        return {
            isAiVisible: 0,
            rejectionReason: null,
            rejectedAt: null,
            knowledgeStatus: "inactive",
            priorityScore: 0
        };
    }

    return {
        isAiVisible: 0,
        rejectionReason: null,
        rejectedAt: null,
        knowledgeStatus: "inactive",
        priorityScore: 70
    };
}

function requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            ok: false,
            message: "No tienes permisos de administrador."
        });
    }

    next();
}

function cleanText(value) {
    if (value === undefined || value === null) return null;

    const text = String(value).trim();

    return text.length > 0 ? text : null;
}

export default router;
