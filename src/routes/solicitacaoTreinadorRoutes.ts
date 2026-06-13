import express from "express";
import SolicitacaoTreinadorController from "../controllers/solicitacaoTreinadorController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();
const controller = new SolicitacaoTreinadorController();

router
    .post("/alunos/me/solicitar-treinador", authMiddleware, controller.criar)
    .get("/alunos/me/solicitacao", authMiddleware, controller.buscarSolicitacaoDoAluno)
    .get("/treinadores/me/solicitacoes", authMiddleware, controller.listarParaTreinador)
    .patch("/treinadores/me/solicitacoes/:id", authMiddleware, controller.responder);

export default router;
