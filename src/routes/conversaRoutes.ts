import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import ConversaController from '../controllers/conversaController';
import MensagemConversaController from '../controllers/mensagemConversaController';

const router = express.Router();
const conversaController = new ConversaController();
const mensagemConversaController = new MensagemConversaController();

router.get('/conversas', authMiddleware, conversaController.listar);
router.post('/conversas', authMiddleware, conversaController.iniciarOuBuscar);
router.get('/conversas/:id', authMiddleware, conversaController.obterPorId);

router.get('/conversas/:conversaId/mensagens', authMiddleware, mensagemConversaController.listar);
router.post('/conversas/:conversaId/mensagens', authMiddleware, mensagemConversaController.enviar);
router.patch('/conversas/:conversaId/mensagens/lidas', authMiddleware, mensagemConversaController.marcarComoLidas);

export default router;
