import { Router } from "express";
import { uploadVideo } from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import multer from "multer";
const router = Router();
router.route("/upload-video").post(uploadVideo);
export default router;