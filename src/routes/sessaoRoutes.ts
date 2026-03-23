import express from 'express';
import SessaoController from '../controllers/sessaoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();
const sessaoController = new SessaoController();

router.post('/sessoes', authMiddleware, sessaoController.createSessao);

export default router;
