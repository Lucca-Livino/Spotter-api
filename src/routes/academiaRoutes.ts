import express from 'express'
const router = express.Router();

import Academia_Controller from '../controllers/academiaController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
const academiaController = new Academia_Controller();

router
    .post('/academia', authMiddleware, adminMiddleware, academiaController.createAcademia)
    .get('/academia', authMiddleware, academiaController.getAllAcademia)
    .get('/academia/:id', authMiddleware, academiaController.getAcademiaById)
    .patch('/academia/:id', authMiddleware, adminMiddleware, academiaController.updateAcademia)
    .delete('/academia/:id', authMiddleware, adminMiddleware, academiaController.deleteAcademia)

export default router;