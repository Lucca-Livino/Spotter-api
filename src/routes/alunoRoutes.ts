import express from 'express';
import AlunoController from '../controllers/alunoController';
const router = express.Router();

const alunoController = new AlunoController();

router
    .post('/aluno', alunoController.createAluno)
    // .get('/aluno', alunoController.getAllAlunos)

export default router
