import express from 'express';
import MusculoController from '../controllers/musculoController';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = express.Router();

const musculoController = new MusculoController();

router.get('/musculos', authMiddleware, musculoController.getAll);
router.get('/musculos/:id', authMiddleware, musculoController.getById);

export default router;
