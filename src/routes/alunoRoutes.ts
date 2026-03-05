import express from 'express';
import AlunoController from '../controllers/alunoController';
const router = express.Router();

const alunoController = new AlunoController();

router
    .get('/alunos', alunoController.getAllStudents)
    .get('/alunos/:id', alunoController.getStudentById)
    .post('/alunos', alunoController.createStudent)

export default router
