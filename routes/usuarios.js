const express = require('express');
const router = express.Router();
const db = require('../data/db'); // Importamos la conexión

// Ruta para registrar usuario con verificación de experto
router.post('/registro', async (req, res) => {
    const { username, email, password, expert_bio } = req.body;
    
    try {
        const query = 'INSERT INTO users (username, email, password, is_expert, expert_bio) VALUES (?, ?, ?, ?, ?)';
        // Si expert_bio viene vacío, lo ponemos como null
        const isExpert = expert_bio ? 1 : 0;
        
        await db.query(query, [username, email, password, isExpert, expert_bio || null]);
        
        res.status(201).json({ success: true, message: "Registrado" });
    } catch (error) {
        console.error("LOG DEL ERROR:", error); // Esto se ve en la terminal
        res.status(500).json({ success: false, message: error.message }); // Esto envía JSON al navegador
    }
});

// Ruta para iniciar sesión
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Buscamos al usuario por nombre o email que coincida con la contraseña
        const [rows] = await db.query(
            'SELECT id, username, email, is_expert FROM users WHERE (username = ? OR email = ?) AND password = ?', 
            [username, username, password]
        );

        if (rows.length > 0) {
            // Si lo encuentra, enviamos éxito y los datos del usuario
            res.json({ 
                success: true, 
                user: rows[0] 
            });
        } else {
            // Si no coincide, enviamos error 401 (No autorizado)
            res.status(401).json({ 
                success: false, 
                message: 'Usuario o contraseña incorrectos' 
            });
        }
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

module.exports = router;