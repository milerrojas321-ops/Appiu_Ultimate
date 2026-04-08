const express = require('express');
const router = express.Router();
const db = require('../data/db'); // Ajusta la ruta a tu conexión de BD
const multer = require('multer');
const path = require('path');

// Configuración de Multer para las fotos de las plantas
const storage = multer.diskStorage({
    destination: 'public/uploads/', // Se guardan en la carpeta que ya configuramos en server.js
    filename: (req, file, cb) => {
        cb(null, 'planta-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// routes/plantRoutes.js

router.post('/registrar', upload.single('imagen'), async (req, res) => {
    try {
        const { usuario_id, nombre, tipo } = req.body;
        
        // IMPORTANTE: req.file.filename es el nombre real del archivo en la carpeta uploads
        const foto_url = req.file ? req.file.filename : null; 

        const query = `
            INSERT INTO coleccion_plantas 
            (usuario_id, nombre_comun, categoria, apodo, foto_url, estado_salud) 
            VALUES (?, ?, ?, ?, ?, 'Saludable')
        `;
        
        // Verificamos que foto_url no sea null antes de enviar
        await db.query(query, [usuario_id, nombre, tipo, nombre, foto_url]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al guardar en BD:", error);
        res.status(500).json({ error: "No se pudo guardar la imagen" });
    }
});

// --- RUTA: OBTENER PLANTAS DE UN USUARIO (GET /api/plantas/usuario/:id) ---
router.get('/usuario/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM coleccion_plantas WHERE usuario_id = ? ORDER BY id DESC', 
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// routes/plantRoutes.js

// Ruta para eliminar una planta de la colección
router.delete('/eliminar/:id', async (req, res) => {
    const idPlanta = req.params.id;
    try {
        // Ejecuta la eliminación en tu tabla 'coleccion_plantas'
        const query = 'DELETE FROM coleccion_plantas WHERE id = ?';
        const [result] = await db.query(query, [idPlanta]);

        if (result.affectedRows > 0) {
            res.json({ success: true, message: "Planta eliminada con éxito" });
        } else {
            res.status(404).json({ success: false, message: "No se encontró la planta" });
        }
    } catch (error) {
        console.error("Error al eliminar planta:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
});

module.exports = router;