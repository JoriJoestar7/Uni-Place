import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { initializeDatabase } from "./database/initialize.js";
import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import profileRoutes from "./routes/profile.routes.js";

dotenv.config();

const app = express();

const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || "").split(",")
]
    .map((origin) => origin?.trim())
    .filter(Boolean);

const defaultLocalOrigins = [
    "https://uniplace.up.railway.app/api"
];

app.use(cors({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        const isAllowedOrigin = [
            ...configuredOrigins,
            ...defaultLocalOrigins
        ].includes(origin);

        let isVercelPreview = false;

        try {
            isVercelPreview = /\.vercel\.app$/.test(new URL(origin).hostname);
        } catch {
            isVercelPreview = false;
        }

        if (isAllowedOrigin || isVercelPreview) {
            return callback(null, true);
        }

        return callback(new Error("Origen no permitido por CORS."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use("/uploads", express.static("public/uploads"));

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.json({
        ok: true,
        message: "UniPlace API funcionando correctamente."
    });
});

app.get("/api/health", async (req, res) => {
    try {
        await pool.execute("SELECT 1 FROM users LIMIT 1");

        return res.json({
            ok: true,
            database: "Conectada"
        });

    } catch (error) {
        return res.status(500).json({
            ok: false,
            database: "Error de conexión",
            error: error.message
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/uploads", express.static("public/uploads"));
app.use("/api/business", businessRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`UniPlace API corriendo en https://uniplace-web.vercel.app/`);
        });
    } catch (error) {
        console.error("DATABASE_INITIALIZATION_ERROR:", error);
        process.exit(1);
    }
}

startServer();
