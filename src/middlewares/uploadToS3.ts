import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../utils/s3";
import path from "path";

export const upload = multer({
    storage: multerS3({
        s3,
        bucket: process.env.AWS_S3_BUCKET_NAME!,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const fileName = path.basename(file.originalname, ext);
            cb(null, `questions/${Date.now()}-${fileName}${ext}`); // Unique file path
        },
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true); // Accept image files
        } else {
            cb(null, false); // Reject non-image files
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
    },
});

