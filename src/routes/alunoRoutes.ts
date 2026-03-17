import express from 'express';
import AlunoController from '../controllers/alunoController';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = express.Router();

const alunoController = new AlunoController();

router
    .get('/alunos', authMiddleware, alunoController.getAllAlunos)
    .get('/alunos/:id', authMiddleware, alunoController.getAlunoById)
    .post('/alunos', authMiddleware, alunoController.createAluno)
    .patch('/alunos/:id', authMiddleware, alunoController.updateAluno)
    .delete('/alunos/:id', authMiddleware, alunoController.deleteAluno)

export default router
