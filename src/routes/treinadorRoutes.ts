import express from "express";
import TreinadorController from "../controllers/treinadorController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

const treinadorController = new TreinadorController();

router
	.get("/treinadores", authMiddleware, treinadorController.getAllTreinadores)
	.get("/treinadores/:id", authMiddleware, treinadorController.getTreinadorById)
	.post("/treinadores", authMiddleware, treinadorController.createTreinador)
	.patch("/treinadores/:id", authMiddleware, treinadorController.updateTreinador);

export default router;
