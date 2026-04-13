const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: 'public/uploads/', 
    filename: (req, file, cb) => {
        cb(null, `post-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// IMPORTANTE: Definir rutas específicas primero
router.get('/usuario/:id', postController.getUserPosts);
router.post('/crear', upload.single('image'), postController.createPost);
router.post('/comentarios', postController.saveComment);
router.get('/comentarios/:id', postController.getPostComments);

// Rutas con parámetros generales al final
router.post('/:id/like', postController.handleLike);
router.get('/:userId', postController.getFeed); // Esta es la que llama tu menu.js:115

module.exports = router;