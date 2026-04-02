import express from "express";
import multer from "multer";
import UploadController from "../controllers/uploadController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();
const uploadController = new UploadController();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/upload/:category",
  authMiddleware,
  upload.array("files"),
  uploadController.uploadArquivos,
);

router.delete(
  "/upload/:category/:fileName",
  authMiddleware,
  uploadController.deleteArquivo,
);

export default router;
