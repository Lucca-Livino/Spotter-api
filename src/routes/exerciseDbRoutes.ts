import express from 'express';
import ExerciseDbController from '../controllers/exerciseDbController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = express.Router();
const controller = new ExerciseDbController();

// Consultas (admin-only — consomem quota da API externa)
router.get('/exercisedb/search', authMiddleware, adminMiddleware, controller.search);
router.get('/exercisedb/body-parts', authMiddleware, adminMiddleware, controller.getBodyParts);
router.get('/exercisedb/body-part/:bodyPart', authMiddleware, adminMiddleware, controller.getByBodyPart);
router.get('/exercisedb/targets', authMiddleware, adminMiddleware, controller.getTargets);
router.get('/exercisedb/target/:target', authMiddleware, adminMiddleware, controller.getByTarget);
router.get('/exercisedb/equipments', authMiddleware, adminMiddleware, controller.getEquipments);
router.get('/exercisedb/equipment/:equipment', authMiddleware, adminMiddleware, controller.getByEquipment);

// Sincronização (admin-only — gastam quota da API externa)
router.post('/exercisedb/sync/musculos', authMiddleware, adminMiddleware, controller.syncMusculos);
router.post('/exercisedb/sync/aparelhos', authMiddleware, adminMiddleware, controller.syncAparelhos);
router.post('/exercisedb/sync/exercicios', authMiddleware, adminMiddleware, controller.syncExercicios);
router.post('/exercisedb/sync/completo', authMiddleware, adminMiddleware, controller.syncCompleto);

export default router;
