import express from "express";
import TreinadorController from "../controllers/treinadorController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

const treinadorController = new TreinadorController();

router
	.get("/treinadores", authMiddleware, treinadorController.getAllTreinadores)


export default router;
