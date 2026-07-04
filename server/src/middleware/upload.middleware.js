import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_ROOT = path.join(process.cwd(), "public/uploads");
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function imageFileFilter(req, file, cb) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP."));
    }

    cb(null, true);
}

function sanitizeName(originalName) {
    const extension = path.extname(originalName).toLowerCase();
    const name = path.basename(originalName, extension)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "image";

    return { name, extension };
}

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const avatarsDir = path.join(UPLOADS_ROOT, "avatars");
        ensureDir(avatarsDir);
        cb(null, avatarsDir);
    },
    filename: (req, file, cb) => {
        const { extension } = sanitizeName(file.originalname);
        cb(null, `avatar-user-${req.user.id}-${Date.now()}${extension}`);
    }
});

const businessStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folderByField = {
            businessLogo: "businesses/logos",
            businessCover: "businesses/covers",
            businessPhotos: "businesses/gallery"
        };

        const folder = folderByField[file.fieldname] || "businesses/general";
        const uploadPath = path.join(UPLOADS_ROOT, folder);

        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const { name, extension } = sanitizeName(file.originalname);
        cb(null, `${file.fieldname}-${req.user.id}-${Date.now()}-${name}${extension}`);
    }
});

export const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});

export const uploadBusinessImages = multer({
    storage: businessStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 4 * 1024 * 1024,
        files: 8
    }
});

export function getPublicUploadUrl(file) {
    const relativePath = path.relative(UPLOADS_ROOT, file.path).replace(/\\/g, "/");
    return `/uploads/${relativePath}`;
}
