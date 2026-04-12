const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middlewares/upload');

router.post('/actualizar/:id', upload.single('foto_perfil'), userController.updateProfile);
router.post('/follow', userController.toggleFollow);

// routes/userRoutes.js
// Asegúrate de que coincida con lo que el frontend espera
router.post('/actualizar/:id', userController.actualizarPerfil);

module.exports = router;