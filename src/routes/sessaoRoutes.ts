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

// PUT /sessoes/:id/exercicios/:exercicioId/series — replace total das séries do exercício
router.put('/sessoes/:id/exercicios/:exercicioId/series', authMiddleware, sessaoController.updateSeriesExercicio);

// POST /sessoes/:id/finalizar — finaliza a sessão
router.post('/sessoes/:id/finalizar', authMiddleware, sessaoController.finalizarSessao);

// POST /sessoes/:id/cancelar — cancela a sessão
router.post('/sessoes/:id/cancelar', authMiddleware, sessaoController.cancelarSessao);

// PATCH /sessoes/:id — atualiza observações da sessão
router.patch('/sessoes/:id', authMiddleware, sessaoController.updateSessao);

// PATCH /sessoes/:id/exercicios/reordenar — reordena exercícios da sessão
router.patch('/sessoes/:id/exercicios/reordenar', authMiddleware, sessaoController.reordenarExercicios);

// PATCH /sessoes/:id/exercicios/:exercicioId — atualiza exercício da sessão
router.patch('/sessoes/:id/exercicios/:exercicioId', authMiddleware, sessaoController.updateSessaoExercicio);

export default router;
