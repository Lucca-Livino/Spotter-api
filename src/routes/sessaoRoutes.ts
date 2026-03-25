import express from 'express';
import SessaoController from '../controllers/sessaoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();
const sessaoController = new SessaoController();

router.post('/sessoes', authMiddleware, sessaoController.createSessao);
router.get('/sessoes/em-andamento', authMiddleware, sessaoController.getSessaoEmAndamento);

// GET /sessoes — listagem paginada com filtros
router.get('/sessoes', authMiddleware, sessaoController.listSessoes);

// GET /sessoes/:id — detalhe completo
router.get('/sessoes/:id', authMiddleware, sessaoController.getSessaoById);

// GET /sessoes/:id/resumo — campos calculados
router.get('/sessoes/:id/resumo', authMiddleware, sessaoController.getSessaoResumo);

// PATCH /sessoes/:id — atualiza observações da sessão
router.patch('/sessoes/:id', authMiddleware, sessaoController.updateSessao);

// PATCH /sessoes/:id/exercicios/:exercicioId — atualiza exercício da sessão
router.patch('/sessoes/:id/exercicios/:exercicioId', authMiddleware, sessaoController.updateSessaoExercicio);

export default router;
