import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import TreinoController from '../controllers/treinoController';

const router = express.Router();
const treinoController = new TreinoController();

router.post('/treinos', authMiddleware, treinoController.createTreino);
router.get('/treinos', authMiddleware, treinoController.getAllTreinos);
router.get('/treinos/:id', authMiddleware, treinoController.getTreinoById);
router.patch('/treinos/:id', authMiddleware, treinoController.updateTreino);
router.delete('/treinos/:id', authMiddleware, treinoController.deleteTreino);

export default router;
