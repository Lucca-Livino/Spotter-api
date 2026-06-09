import express from "express";
import multer from "multer";
import TreinadorController from "../controllers/treinadorController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens (.jpg, .jpeg, .png) são permitidas'));
        }
    }
});

const treinadorController = new TreinadorController();

router
		.get("/treinadores/me/alunos", authMiddleware, treinadorController.getAlunosVinculados)
		.delete("/treinadores/me/alunos/:alunoId", authMiddleware, treinadorController.desvincularAluno)
        .get("/treinadores", authMiddleware, treinadorController.getAllTreinadores)
        .get("/treinadores/:id", authMiddleware, treinadorController.getTreinadorById)
        .post("/treinadores", authMiddleware, upload.single('foto'), treinadorController.createTreinador)
        .patch("/treinadores/:id", authMiddleware, upload.single('foto'), treinadorController.updateTreinador);

export default router;

