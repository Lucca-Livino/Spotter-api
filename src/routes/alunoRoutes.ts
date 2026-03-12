import express from 'express';
import AlunoController from '../controllers/alunoController';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = express.Router();

const alunoController = new AlunoController();

router
    .get('/alunos', alunoController.getAllAlunos)
    .get('/alunos/:id', alunoController.getAlunoById)
    .post('/alunos', alunoController.createAluno)
    .delete('/alunos/:id', alunoController.deleteAluno)

export default router
