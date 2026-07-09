import dotenv from "dotenv";
import dns from "node:dns/promises";
import net from "node:net";
import nodemailer from "nodemailer";

dotenv.config();

async function createTransporter() {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        throw new Error("Faltan MAIL_USER o MAIL_PASS en el archivo .env");
    }

    const mailHost = process.env.MAIL_HOST || "smtp.gmail.com";
    const resolvedHost = await resolveIpv4Host(mailHost);

    return nodemailer.createTransport({
        host: resolvedHost,
        port: Number(process.env.MAIL_PORT) || 465,
        secure: String(process.env.MAIL_SECURE) === "true",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        },
        tls: {
            servername: mailHost
        }
    });
}

export async function sendVerificationEmail({ to, name, code }) {
    await sendMail({
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
export async function sendPasswordResetEmail({ to, name, code }) {
    await sendMail({
        to,
        subject: "Recupera tu contraseña en UniPlace",
        text: `
Hola ${name || ""}.

Tu código para recuperar la contraseña en UniPlace es: ${code}

Este código vence en ${process.env.PASSWORD_RESET_CODE_MINUTES || 15} minutos.

Si tú no solicitaste este cambio, puedes ignorar este correo.
        `,
        html: `
            <div style="font-family: Arial, sans-serif; background:#0A0A0A; color:#FFFFFF; padding:32px;">
                <div style="max-width:520px; margin:auto; background:#111827; border:1px solid #1F2937; border-radius:24px; padding:32px;">
                    <h1 style="margin:0 0 12px; font-size:28px;">UniPlace</h1>

                    <p style="color:#BFC3CE; line-height:1.6;">
                        Hola ${name || ""}, usa este código para recuperar tu contraseña:
                    </p>

                    <div style="font-size:36px; letter-spacing:8px; font-weight:bold; margin:28px 0; color:#FFFFFF;">
                        ${code}
                    </div>

                    <p style="color:#BFC3CE; line-height:1.6;">
                        Este código vence en ${process.env.PASSWORD_RESET_CODE_MINUTES || 15} minutos.
                    </p>

                    <p style="color:#7D8494; font-size:12px; line-height:1.6;">
                        Si tú no solicitaste este cambio, puedes ignorar este correo.
                    </p>
                </div>
            </div>
        `
    });
}

export async function sendPasswordChangedEmail({ to, name }) {
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.MAIL_USER;

    await sendMail({
        to,
        subject: "Tu contraseña de UniPlace fue actualizada",
        text: `
Hola ${name || ""}.

Te informamos que la contraseña de tu cuenta en UniPlace fue cambiada correctamente.

Si tú realizaste este cambio, no necesitas hacer nada más.

Si no fuiste tú, te recomendamos contactar inmediatamente al equipo de soporte de UniPlace:
${supportEmail}

Por seguridad, evita compartir tus credenciales con otras personas.
        `,
        html: `
            <div style="font-family: Arial, sans-serif; background:#0A0A0A; color:#FFFFFF; padding:32px;">
                <div style="max-width:560px; margin:auto; background:#111827; border:1px solid #1F2937; border-radius:24px; padding:32px;">
                    <h1 style="margin:0 0 12px; font-size:28px;">UniPlace</h1>

                    <p style="color:#BFC3CE; line-height:1.6;">
                        Hola ${name || ""}.
                    </p>

                    <p style="color:#BFC3CE; line-height:1.6;">
                        Te informamos que la contraseña de tu cuenta en UniPlace fue cambiada correctamente.
                    </p>

                    <div style="margin:28px 0; padding:20px; background:#0A0A0A; border:1px solid #1F2937; border-radius:18px;">
                        <p style="margin:0; color:#FFFFFF; line-height:1.6;">
                            Si tú realizaste este cambio, no necesitas hacer nada más.
                        </p>
                    </div>

                    <p style="color:#BFC3CE; line-height:1.6;">
                        Si no fuiste tú, contacta inmediatamente al equipo de soporte de UniPlace:
                    </p>

                    <p style="color:#FFFFFF; font-weight:bold; line-height:1.6;">
                        ${supportEmail}
                    </p>

                    <p style="color:#7D8494; font-size:12px; line-height:1.6; margin-top:24px;">
                        Por seguridad, evita compartir tus credenciales con otras personas.
                    </p>
                </div>
            </div>
        `
    });
}

async function sendMail(message) {
    if (process.env.RESEND_API_KEY) {
        return sendWithResend(message);
    }

    const transporter = await createTransporter();

    return transporter.sendMail({
        from: getSender(),
        ...message
    });
}

async function sendWithResend(message) {
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: getSender(),
            to: [message.to],
            subject: message.subject,
            text: message.text,
            html: message.html
        })
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Resend rechazó el correo (${response.status}): ${details}`);
    }

    return response.json();
}

function getSender() {
    return process.env.MAIL_FROM
        || (process.env.MAIL_USER
            ? `"UniPlace" <${process.env.MAIL_USER}>`
            : "UniPlace <onboarding@resend.dev>");
}

async function resolveIpv4Host(host) {
    if (net.isIP(host)) {
        return host;
    }

    const addresses = await dns.resolve4(host);

    if (addresses.length === 0) {
        throw new Error(`No se encontró una dirección IPv4 para ${host}.`);
    }

    return addresses[0];
}
