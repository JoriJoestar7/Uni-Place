import multer from "multer";
import path from "path";
import fs from "fs";

const avatarsDir = path.join(process.cwd(), "public/uploads/avatars");

if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarsDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeName = `avatar-user-${req.user.id}-${Date.now()}${extension}`;

        cb(null, safeName);
    }
});

function imageFileFilter(req, file, cb) {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP."));
    }

    cb(null, true);
}

export const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});