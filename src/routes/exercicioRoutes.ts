import express from 'express';
import ExercicioController from '../controllers/exercicioController';
const router = express.Router();

const exercicioController = new ExercicioController();

// TODO: [AUTH] Adicionar middleware de autenticação (AuthMiddleware) em todas as rotas.
// TODO: [AUTH] Adicionar middleware de autorização (AuthPermission) para validar perfis:
//   - POST: qualquer usuário autenticado pode criar
//   - GET: qualquer usuário autenticado pode listar/visualizar
//   - PATCH: apenas criador do exercício ou ADMIN
//   - DELETE: apenas criador do exercício pessoal ou ADMIN para globais

router.post('/exercicios', exercicioController.createExercicio);
router.get('/exercicios', exercicioController.listarExercicios);
router.get('/exercicios/:id', exercicioController.getExercicioById);

export default router;
