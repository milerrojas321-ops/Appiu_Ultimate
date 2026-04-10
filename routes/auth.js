// routes/auth.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Solo rutas de sesión
router.post('/login', userController.login);
// router.post('/register', userController.register); // Cuando lo tengas listo

module.exports = router;