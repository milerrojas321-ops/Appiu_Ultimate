const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middlewares/upload');

router.post('/actualizar/:id', upload.single('foto_perfil'), userController.updateProfile);
router.post('/follow', userController.toggleFollow);
router.get('/perfil-completo/:idLogueado/:perfilId', userController.getPublicProfile);
router.get('/sugerencias/:idLogueado', async (req, res) => {
    // Aquí puedes pegar la lógica de sugerencias que tenías
    const idLogueado = req.params.idLogueado;
    const [rows] = await require('../data/db').query("SELECT id, username, foto_perfil FROM users WHERE id != ? ORDER BY RAND() LIMIT 5", [idLogueado]);
    res.json(rows);
});

module.exports = router;