import express from 'express';
import ExercicioController from '../controllers/exercicioController';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = express.Router();

const exercicioController = new ExercicioController();

// TODO: [AUTH] Adicionar middleware de autenticação (AuthMiddleware) em todas as rotas.
// TODO: [AUTH] Adicionar middleware de autorização (AuthPermission) para validar perfis:
//   - POST: qualquer usuário autenticado pode criar
//   - GET: qualquer usuário autenticado pode listar/visualizar
//   - PATCH: apenas criador do exercício ou ADMIN
//   - DELETE: apenas criador do exercício pessoal ou ADMIN para globais

router.post('/exercicios', authMiddleware, exercicioController.createExercicio);
router.get('/exercicios', authMiddleware, exercicioController.listarExercicios);
router.get('/exercicios/:id', authMiddleware, exercicioController.getExercicioById);
router.patch('/exercicios/:id', authMiddleware, exercicioController.updateExercicio);

export default router;
