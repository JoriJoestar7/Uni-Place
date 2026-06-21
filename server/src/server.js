import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        ok: true,
        message: "UniPlace API funcionando correctamente."
    });
});

app.get("/api/health", async (req, res) => {
    try {
        await pool.execute("SELECT 1");

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
app.use("/api/business", businessRoutes);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`UniPlace API corriendo en http://localhost:${PORT}`);
});