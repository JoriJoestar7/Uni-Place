import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

function createTransporter() {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        throw new Error("Faltan MAIL_USER o MAIL_PASS en el archivo .env");
    }

    return nodemailer.createTransport({
        host: process.env.MAIL_HOST || "smtp.gmail.com",
        port: Number(process.env.MAIL_PORT) || 465,
        secure: String(process.env.MAIL_SECURE) === "true",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
}

export async function sendVerificationEmail({ to, name, code }) {
    const transporter = createTransporter();

    await transporter.sendMail({
        from: process.env.MAIL_FROM || `"UniPlace" <${process.env.MAIL_USER}>`,
        to,
        subject: "Verifica tu cuenta en UniPlace",
        text: `
Hola ${name || ""}.

Tu código de verificación para UniPlace es: ${code}

Este código vence en ${process.env.VERIFICATION_CODE_MINUTES || 15} minutos.

Si tú no solicitaste este registro, puedes ignorar este correo.
        `,
        html: `
            <div style="font-family: Arial, sans-serif; background:#0A0A0A; color:#FFFFFF; padding:32px;">
                <div style="max-width:520px; margin:auto; background:#111827; border:1px solid #1F2937; border-radius:24px; padding:32px;">
                    <h1 style="margin:0 0 12px; font-size:28px;">UniPlace</h1>

                    <p style="color:#BFC3CE; line-height:1.6;">
                        Hola ${name || ""}, usa este código para verificar tu cuenta:
                    </p>

                    <div style="font-size:36px; letter-spacing:8px; font-weight:bold; margin:28px 0; color:#FFFFFF;">
                        ${code}
                    </div>

                    <p style="color:#BFC3CE; line-height:1.6;">
                        Este código vence en ${process.env.VERIFICATION_CODE_MINUTES || 15} minutos.
                    </p>

                    <p style="color:#7D8494; font-size:12px; line-height:1.6;">
                        Si tú no solicitaste este registro, puedes ignorar este correo.
                    </p>
                </div>
            </div>
        `
    });
}