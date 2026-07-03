import bcrypt from "bcryptjs";
import crypto from "crypto";

export function generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
}

export async function hashVerificationCode(code) {
    return await bcrypt.hash(code, 10);
}

export async function compareVerificationCode(code, hash) {
    return await bcrypt.compare(code, hash);
}

export function getVerificationExpirationDate() {
    const minutes = Number(process.env.VERIFICATION_CODE_MINUTES) || 15;
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date;
}