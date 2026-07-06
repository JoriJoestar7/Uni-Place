import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail
} from "../services/mail.service.js";
import {
    generateVerificationCode,
    hashVerificationCode,
    compareVerificationCode,
    getVerificationExpirationDate
} from "../services/verification.service.js";

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

        const allowedRoles = ["student", "professor","entrepreneur"];
        const finalRole = allowedRoles.includes(role) ? role : "student";

        const normalizedEmail = email.trim().toLowerCase();

        const [existingUser] = await pool.execute(
            "SELECT id, email_verified FROM users WHERE email = ? LIMIT 1",
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

        const verificationCode = generateVerificationCode();
        const verificationCodeHash = await hashVerificationCode(verificationCode);
        const expirationDate = getVerificationExpirationDate();

        const [result] = await pool.execute(
            `INSERT INTO users (
                name,
                email,
                password_hash,
                role,
                email_verified,
                verification_code_hash,
                verification_code_expires_at,
                last_verification_sent_at
            ) VALUES (?, ?, ?, ?, 0, ?, ?, NOW())`,
            [
                name.trim(),
                normalizedEmail,
                passwordHash,
                finalRole,
                verificationCodeHash,
                expirationDate
            ]
        );

try {
    await sendVerificationEmail({
        to: normalizedEmail,
        name: name.trim(),
        code: verificationCode
    });
} catch (mailError) {
    console.error("MAIL_SEND_ERROR:", mailError);

    await pool.execute(
        "DELETE FROM users WHERE id = ?",
        [result.insertId]
    );

    return res.status(500).json({
        ok: false,
        message: "No se pudo enviar el correo de verificación. Revisa la configuración del correo e intenta nuevamente."
    });
}

return res.status(201).json({
    ok: true,
    message: "Cuenta creada. Revisa tu correo para verificarla.",
    needsVerification: true,
    email: normalizedEmail,
    user: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
        role: finalRole,
        email_verified: 0
    }
});

    } catch (error) {
        console.error("REGISTER_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno al crear la cuenta o enviar el correo."
        });
    }
});

router.post("/verify-email", async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                ok: false,
                message: "Ingresa tu correo y el código de verificación."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await pool.execute(
            `SELECT 
                id,
                name,
                email,
                role,
                email_verified,
                verification_code_hash,
                verification_code_expires_at
            FROM users
            WHERE email = ?
            LIMIT 1`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "No encontramos una cuenta con ese correo."
            });
        }

        const user = users[0];

        if (user.email_verified === 1) {
            const token = createToken(user);

            return res.json({
                ok: true,
                message: "Tu cuenta ya estaba verificada.",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    email_verified: 1
                }
            });
        }

        if (!user.verification_code_hash || !user.verification_code_expires_at) {
            return res.status(400).json({
                ok: false,
                message: "No existe un código activo. Solicita uno nuevo."
            });
        }

        const now = new Date();
        const expiresAt = new Date(user.verification_code_expires_at);

        if (now > expiresAt) {
            return res.status(400).json({
                ok: false,
                message: "El código venció. Solicita uno nuevo."
            });
        }

        const isValidCode = await compareVerificationCode(
            code.trim(),
            user.verification_code_hash
        );

        if (!isValidCode) {
            return res.status(400).json({
                ok: false,
                message: "El código ingresado no es correcto."
            });
        }

        await pool.execute(
            `UPDATE users
             SET email_verified = 1,
                 verified_at = NOW(),
                 verification_code_hash = NULL,
                 verification_code_expires_at = NULL
             WHERE id = ?`,
            [user.id]
        );

        const token = createToken(user);

        return res.json({
            ok: true,
            message: "Correo verificado correctamente.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                email_verified: 1
            }
        });

    } catch (error) {
        console.error("VERIFY_EMAIL_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno al verificar el correo."
        });
    }
});

router.post("/resend-verification", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                ok: false,
                message: "Ingresa tu correo."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await pool.execute(
            `SELECT 
                id,
                name,
                email,
                email_verified,
                last_verification_sent_at
            FROM users
            WHERE email = ?
            LIMIT 1`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "No encontramos una cuenta con ese correo."
            });
        }

        const user = users[0];

        if (user.email_verified === 1) {
            return res.status(400).json({
                ok: false,
                message: "Esta cuenta ya está verificada."
            });
        }

        if (user.last_verification_sent_at) {
            const lastSent = new Date(user.last_verification_sent_at);
            const now = new Date();
            const secondsSinceLastSend = Math.floor((now - lastSent) / 1000);

            if (secondsSinceLastSend < 60) {
                return res.status(429).json({
                    ok: false,
                    message: `Espera ${60 - secondsSinceLastSend} segundos antes de pedir otro código.`
                });
            }
        }

        const verificationCode = generateVerificationCode();
        const verificationCodeHash = await hashVerificationCode(verificationCode);
        const expirationDate = getVerificationExpirationDate();

        await pool.execute(
            `UPDATE users
             SET verification_code_hash = ?,
                 verification_code_expires_at = ?,
                 last_verification_sent_at = NOW()
             WHERE id = ?`,
            [verificationCodeHash, expirationDate, user.id]
        );

        await sendVerificationEmail({
            to: user.email,
            name: user.name,
            code: verificationCode
        });

        return res.json({
            ok: true,
            message: "Te enviamos un nuevo código de verificación."
        });

    } catch (error) {
        console.error("RESEND_VERIFICATION_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno al reenviar el código."
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
            `SELECT 
                id,
                name,
                email,
                password_hash,
                role,
                email_verified
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                ok: false,
                message: "Correo o contraseña incorrectos."
            });
        }

        const user = users[0];

        const passwordIsValid = await bcrypt.compare(password, user.password_hash);

        if (!passwordIsValid) {
            return res.status(401).json({
                ok: false,
                message: "Correo o contraseña incorrectos."
            });
        }

        if (user.email_verified !== 1) {
            return res.status(403).json({
                ok: false,
                requiresVerification: true,
                email: user.email,
                message: "Debes verificar tu correo antes de iniciar sesión."
            });
        }

        const token = createToken({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        });

        return res.json({
            ok: true,
            message: "Inicio de sesión correcto.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                email_verified: user.email_verified
            }
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
            `SELECT 
                id,
                name,
                display_name,
                email,
                role,
                phone,
                bio,
                avatar_url,
                email_verified,
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

        const user = users[0];

        return res.json({
            ok: true,
            user: {
                id: user.id,
                name: user.name,
                display_name: user.display_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                bio: user.bio,
                avatar_url: user.avatar_url,
                email_verified: Number(user.email_verified) === 1 ? 1 : 0,
                created_at: user.created_at
            }
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
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                ok: false,
                message: "Ingresa tu correo."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await pool.execute(
            `SELECT 
                id,
                name,
                email,
                email_verified,
                last_password_reset_sent_at
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "No existe una cuenta con ese correo."
            });
        }

        const user = users[0];

        if (Number(user.email_verified) !== 1) {
            return res.status(403).json({
                ok: false,
                message: "Primero debes verificar tu correo antes de recuperar la contraseña."
            });
        }

        if (user.last_password_reset_sent_at) {
            const lastSent = new Date(user.last_password_reset_sent_at);
            const now = new Date();
            const secondsSinceLastSend = Math.floor((now - lastSent) / 1000);

            if (secondsSinceLastSend < 60) {
                return res.status(429).json({
                    ok: false,
                    message: `Espera ${60 - secondsSinceLastSend} segundos antes de pedir otro código.`
                });
            }
        }

        const resetCode = generateVerificationCode();
        const resetCodeHash = await hashVerificationCode(resetCode);

        const expirationDate = new Date();
        const minutes = Number(process.env.PASSWORD_RESET_CODE_MINUTES) || 15;
        expirationDate.setMinutes(expirationDate.getMinutes() + minutes);

        await pool.execute(
            `UPDATE users
             SET password_reset_code_hash = ?,
                 password_reset_expires_at = ?,
                 last_password_reset_sent_at = NOW()
             WHERE id = ?`,
            [resetCodeHash, expirationDate, user.id]
        );

        try {
            await sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                code: resetCode
            });
        } catch (mailError) {
            console.error("PASSWORD_RESET_MAIL_ERROR:", mailError);

            await pool.execute(
                `UPDATE users
                 SET password_reset_code_hash = NULL,
                     password_reset_expires_at = NULL,
                     last_password_reset_sent_at = NULL
                 WHERE id = ?`,
                [user.id]
            );

            return res.status(500).json({
                ok: false,
                message: "No se pudo enviar el correo de recuperación. Revisa la configuración del correo e intenta nuevamente."
            });
        }

        return res.json({
            ok: true,
            message: "Te enviamos un código para recuperar tu contraseña."
        });

    } catch (error) {
        console.error("FORGOT_PASSWORD_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno al enviar el código de recuperación."
        });
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({
                ok: false,
                message: "Ingresa correo, código y nueva contraseña."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                ok: false,
                message: "La nueva contraseña debe tener al menos 6 caracteres."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

const [users] = await pool.execute(
    `SELECT 
        id,
        name,
        email,
        password_reset_code_hash,
        password_reset_expires_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail]
);

        if (users.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "No existe una cuenta con ese correo."
            });
        }

        const user = users[0];

        if (!user.password_reset_code_hash || !user.password_reset_expires_at) {
            return res.status(400).json({
                ok: false,
                message: "No existe un código activo. Solicita uno nuevo."
            });
        }

        const now = new Date();
        const expiresAt = new Date(user.password_reset_expires_at);

        if (now > expiresAt) {
            return res.status(400).json({
                ok: false,
                message: "El código venció. Solicita uno nuevo."
            });
        }

        const isValidCode = await compareVerificationCode(
            code.trim(),
            user.password_reset_code_hash
        );

        if (!isValidCode) {
            return res.status(400).json({
                ok: false,
                message: "El código ingresado no es correcto."
            });
        }

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

await pool.execute(
    `UPDATE users
     SET password_hash = ?,
         password_reset_code_hash = NULL,
         password_reset_expires_at = NULL,
         last_password_reset_sent_at = NULL,
         password_changed_at = NOW()
     WHERE id = ?`,
    [newPasswordHash, user.id]
);

try {
    await sendPasswordChangedEmail({
        to: user.email,
        name: user.name
    });
} catch (mailError) {
    console.error("PASSWORD_CHANGED_MAIL_ERROR:", mailError);
}

return res.json({
    ok: true,
    message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión."
});

    } catch (error) {
        console.error("RESET_PASSWORD_ERROR:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno al cambiar la contraseña."
        });
    }
});
export default router;