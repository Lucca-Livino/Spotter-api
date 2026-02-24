import express from 'express'
const router = express.Router();

import Academia_Controller from '../controllers/academiaController';
const academiaController = new Academia_Controller();

router
    .post('/academia', academiaController.createAcademia)
    .get('/academia', academiaController.getAllAcademia)
    .get('/academia/:id', academiaController.getAcademiaById)
    .patch('/academia/:id', academiaController.updateAcademia)
    .delete('/academia/:id', academiaController.deleteAcademia)

export default router;