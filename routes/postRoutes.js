const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// Asegúrate de que los nombres después de 'postController.' coincidan con los 'exports.' del controlador
router.get('/feed/:userId', postController.getFeed);
router.get('/:id/comentarios', postController.getComments);
router.post('/comentarios', postController.addComment);

module.exports = router;