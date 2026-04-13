const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');
const verificarToken = require('../middlewares/auth'); // Asegúrate de tenerlo para proteger rutas

// Configuración de Multer para fotos de perfil
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
        cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// --- 1. RUTAS DE AUTENTICACIÓN ---
router.post('/registro', upload.single('foto_perfil'), userController.registro);
router.post('/login', userController.login);


router.put('/:id', upload.single('foto_perfil'), userController.actualizarPerfil);

// --- 2. RUTAS SOCIALES (FOLLOW, NOTIFICACIONES, SUGERENCIAS) ---
// Nota: Van arriba para que no se confundan con el ID dinámico
router.post('/follow', userController.toggleFollow);
router.get('/notificaciones/:userId', userController.obtenerNotificaciones);
router.get('/sugerencias/:idLogueado', userController.obtenerSugerencias);

// --- 3. RUTAS DE PERFIL Y DATOS ---
// Perfil completo (el que usa idLogueado y perfilId)
router.get('/perfil-completo/:idLogueado/:perfilId', userController.getPublicProfile);

// Actualizar perfil (usa POST o PUT dependiendo de tu frontend)
router.post('/actualizar', upload.single('fotoPerfil'), userController.actualizarPerfil);

// Obtener perfil básico por ID (SIEMPRE AL FINAL)
// Esta ruta es la más general, por eso va al último
router.get('/:id', userController.getUserById);

module.exports = router;