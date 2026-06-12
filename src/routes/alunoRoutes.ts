import express from 'express';
import multer from 'multer';
import AlunoController from '../controllers/alunoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens (.jpg, .jpeg, .png) são permitidas'));
        }
    }
});

const alunoController = new AlunoController();

router
    .get('/alunos', authMiddleware, alunoController.getAllAlunos)
    .get('/alunos/:id/historico-peso', authMiddleware, alunoController.getHistoricoPeso)
    .get('/alunos/:id', authMiddleware, alunoController.getAlunoById)
    .post('/alunos', authMiddleware, upload.single('foto'), alunoController.createAluno)
    .patch('/alunos/:id', authMiddleware, upload.single('foto'), alunoController.updateAluno)
    .delete('/alunos/:id', authMiddleware, alunoController.deleteAluno)

export default router
