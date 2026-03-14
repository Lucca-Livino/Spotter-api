import express from 'express';
import ExercicioController from '../controllers/exercicioController';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = express.Router();

const exercicioController = new ExercicioController();

//   - POST: qualquer usuário autenticado pode criar
//   - GET: qualquer usuário autenticado pode listar/visualizar
//   - PATCH: apenas criador do exercício ou ADMIN
//   - DELETE: apenas criador do exercício pessoal ou ADMIN para globais

router.post('/exercicios', authMiddleware, exercicioController.createExercicio);
router.get('/exercicios', authMiddleware, exercicioController.getAllExercicios);
router.get('/exercicios/:id', authMiddleware, exercicioController.getByIdExercicio);
router.patch('/exercicios/:id', authMiddleware, exercicioController.updateExercicio);
router.delete('/exercicios/:id', authMiddleware, exercicioController.deleteExercicio);

export default router;
