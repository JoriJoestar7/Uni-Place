import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                ok: false,
                message: "Todos los campos son obligatorios."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                message: "La contraseña debe tener al menos 6 caracteres."
            });
        }

        const allowedRoles = ["student", "entrepreneur"];
        const finalRole = allowedRoles.includes(role) ? role : "student";

        const normalizedEmail = email.trim().toLowerCase();

        const [existingUser] = await pool.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [normalizedEmail]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                ok: false,
                message: "Ya existe una cuenta con este correo."
            });
        }

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const [result] = await pool.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [name.trim(), normalizedEmail, passwordHash, finalRole]
        );

        const user = {
            id: result.insertId,
            name: name.trim(),
            email: normalizedEmail,
            role: finalRole
        };

        const token = createToken(user);

        return res.status(201).json({
            ok: true,
            message: "Cuenta creada correctamente.",
            token,
            user
        });

    } catch (error) {
        console.error("REGISTER_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno al crear la cuenta."
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                ok: false,
                message: "Ingresa tu correo y contraseña."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await pool.execute(
            "SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                ok: false,
                message: "Correo o contraseña incorrectos."
            });
        }

        const userFromDb = users[0];

        const passwordIsValid = await bcrypt.compare(
            password,
            userFromDb.password_hash
        );

        if (!passwordIsValid) {
            return res.status(401).json({
                ok: false,
                message: "Correo o contraseña incorrectos."
            });
        }

        const user = {
            id: userFromDb.id,
            name: userFromDb.name,
            email: userFromDb.email,
            role: userFromDb.role
        };

        const token = createToken(user);

        return res.json({
            ok: true,
            message: "Inicio de sesión correcto.",
            token,
            user
        });

    } catch (error) {
        console.error("LOGIN_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno al iniciar sesión."
        });
    }
});

router.get("/me", verifyToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1",
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
        console.error("ME_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error al obtener usuario."
        });
    }
});

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "2h"
        }
    );
}

export default router;