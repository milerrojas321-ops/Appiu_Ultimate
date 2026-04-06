const express = require('express');
const router = express.Router();
const db = require('../data/db');
const multer = require('multer'); 
const path = require('path');     

const storage = multer.diskStorage({
    destination: 'public/uploads/', 
    filename: (req, file, cb) => {
        cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage }); 

// --- RUTA DE REGISTRO (CORREGIDA) ---
// Agregamos upload.single para que req.body deje de ser undefined
router.post('/registro', upload.single('foto_perfil'), async (req, res) => {
    try {
        const { username, email, password, expert_bio } = req.body;
        const foto = req.file; // Aquí llega la imagen procesada por Multer

        // Verificación básica para evitar el error de destructuring si algo falla
        if (!username) {
            return res.status(400).json({ success: false, message: "El nombre de usuario es requerido" });
        }
        
        // Si expert_bio tiene texto, es experto (1), si no (0)
        const isExpert = expert_bio ? 1 : 0;
        const fotoUrl = foto ? `/uploads/${foto.filename}` : null;

        // IMPORTANTE: Asegúrate que los nombres de las columnas coincidan con tu BD (users o usuarios)
        const query = 'INSERT INTO users (username, email, password, is_expert, expert_bio, foto_perfil) VALUES (?, ?, ?, ?, ?, ?)';
        
        await db.query(query, [username, email, password, isExpert, expert_bio || null, fotoUrl]);
        
        res.status(201).json({ success: true, message: "Registrado con éxito 🌿" });
    } catch (error) {
        console.error("LOG DEL ERROR EN REGISTRO:", error); 
        res.status(500).json({ success: false, message: "Error al registrar: " + error.message });
    }
});

// --- RUTA DE LOGIN ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query(
            'SELECT id, username, email, is_expert, foto_perfil FROM users WHERE (username = ? OR email = ?) AND password = ?', 
            [username, username, password]
        );

        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});



// --- CONTADORES ---
router.get('/contadores/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const [seguidores] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE id_seguido = ?', [id]);
        const [seguidos] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE id_seguidor = ?', [id]);
        res.json({ seguidores: seguidores[0].total, seguidos: seguidos[0].total });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ACTUALIZAR PERFIL ---
router.post('/actualizar', upload.single('fotoPerfil'), async (req, res) => {
    try {
        const { idUsuario, nombreUsuario } = req.body;
        let nuevaFotoRuta = req.file ? `/uploads/${req.file.filename}` : null;

        if (nuevaFotoRuta) {
            await db.query('UPDATE users SET username = ?, foto_perfil = ? WHERE id = ?', [nombreUsuario, nuevaFotoRuta, idUsuario]);
            await db.query('UPDATE publicaciones SET username = ?, user_pfp = ? WHERE user_id = ?', [nombreUsuario, nuevaFotoRuta, idUsuario]);
        } else {
            await db.query('UPDATE users SET username = ? WHERE id = ?', [nombreUsuario, idUsuario]);
            await db.query('UPDATE publicaciones SET username = ? WHERE user_id = ?', [nombreUsuario, idUsuario]);
        }

        res.json({ success: true, nuevoUsername: nombreUsuario, nuevaFoto: nuevaFotoRuta });
    } catch (error) {
        console.error("Error al actualizar:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- OBTENER PERFIL ---
router.get('/perfil/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [rows] = await db.query("SELECT id, username, foto_perfil, expert_bio FROM users WHERE id = ?", [userId]);
        if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// SUGERENCIAS (Arregla el error 404 de /api/usuarios/sugerencias)
router.get('/sugerencias/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const query = `
            SELECT id, username, foto_perfil 
            FROM users 
            WHERE id != ? 
            AND id NOT IN (SELECT id_seguido FROM seguidores WHERE id_seguidor = ?)
            ORDER BY RAND() LIMIT 5`;
        const [rows] = await db.query(query, [userId, userId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FOLLOW
router.post('/follow', async (req, res) => {
    const idSeguidor = req.body.seguidor_id || req.body.idSeguidor;
    const idSeguido = req.body.seguido_id || req.body.idSeguido;
    try {
        const [existe] = await db.query('SELECT * FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?', [idSeguidor, idSeguido]);
        if (existe.length > 0) {
            await db.query('DELETE FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?', [idSeguidor, idSeguido]);
            res.json({ success: true, action: 'unfollowed' });
        } else {
            await db.query('INSERT INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)', [idSeguidor, idSeguido]);
            res.json({ success: true, action: 'followed' });
        }
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;