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
            cb(null, `questions/${Date.now()}-${file.originalname}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(null, false); // Reject non-image
        }
    },
});

