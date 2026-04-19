import express from 'express';
import MediaController from '../controllers/mediaController';

const router = express.Router();
const controller = new MediaController();

// Endpoint público de proxy de mídia
router.options('/media/:categoria/:arquivo', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, If-None-Match, If-Modified-Since');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
});
router.head('/media/:categoria/:arquivo', controller.stream);
router.get('/media/:categoria/:arquivo', controller.stream);

export default router;
