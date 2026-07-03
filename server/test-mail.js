import dotenv from "dotenv";
import { sendVerificationEmail } from "./src/services/mail.service.js";

dotenv.config();

try {
    await sendVerificationEmail({
        to: process.env.MAIL_USER,
        name: "Prueba UniPlace",
        code: "123456"
    });

    console.log("Correo enviado correctamente.");
} catch (error) {
    console.error("Error enviando correo:");
    console.error(error);
}