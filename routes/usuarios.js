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

// UNIFICADA: Obtener info detallada del usuario con contadores
router.get('/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const sql = `
            SELECT u.id, u.username, u.email, u.expert_bio, u.foto_perfil, u.is_expert, u.expert_bio,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguido = u.id) as seguidores_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = u.id) as seguidos_count
            FROM users u WHERE u.id = ?`;
        
        const [rows] = await db.query(sql, [userId]);
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: "Usuario no encontrado" });
        }
    } catch (error) {
        console.error("Error en GET /usuarios/:id:", error);
        res.status(500).json({ error: error.message });
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

// routes/publicaciones.js
// Obtener publicaciones de un usuario específico para su perfil
router.get('/usuario/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        // Buscamos en la tabla 'posts' filtrando por el 'user_id'
        const query = 'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC';
        const [rows] = await db.query(query, [userId]);
        
        // Enviamos los datos como JSON real
        res.json(rows); 
    } catch (error) {
        console.error("Error en DB:", error);
        res.status(500).json({ error: "Error al obtener publicaciones del perfil" });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
            let user = rows[0];
            if (user.foto_perfil && !user.foto_perfil.startsWith('/')) {
                user.foto_perfil = `/uploads/${user.foto_perfil}`;
            }
            res.json(user);
        } else {
            res.status(404).json({ error: "No encontrado" });
        }
    } catch (error) { res.status(500).json({ error: error.message }); }
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



//ajusta la ruta a tu conexión

router.post('/follow', async (req, res) => {
    const { seguidor_id, seguido_id, idSeguidor, idSeguido } = req.body;
    const final_seguidor = seguidor_id || idSeguidor;
    const final_seguido = seguido_id || idSeguido;

    console.log(`Intentando alternar follow: ${final_seguidor} -> ${final_seguido}`);

    try {
        // 1. Verificar si ya existe la relación
        const [existe] = await db.query(
            "SELECT * FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?", 
            [final_seguidor, final_seguido]
        );

        if (existe.length > 0) {
            // 2. SI EXISTE: Dejar de seguir (Delete)
            await db.query(
                "DELETE FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?", 
                [final_seguidor, final_seguido]
            );
            
            // Opcional: Borrar la notificación de follow previa
            await db.query(
                "DELETE FROM notificaciones WHERE id_receptor = ? AND id_emisor = ? AND tipo = 'follow'",
                [final_seguido, final_seguidor]
            );

            console.log("✅ Dejó de seguir con éxito");
            return res.json({ success: true, action: 'unfollowed' });
        } else {
            // 3. NO EXISTE: Seguir (Insert)
            await db.query(
                "INSERT INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)", 
                [final_seguidor, final_seguido]
            );

            // 4. Crear la notificación (Ajustada a tu tabla sin columna 'mensaje')
            await db.query(
                "INSERT INTO notificaciones (id_receptor, id_emisor, tipo, id_referencia, leido) VALUES (?, ?, ?, ?, ?)", 
                [final_seguido, final_seguidor, 'follow', final_seguidor, false]
            );

            console.log("✅ Siguiendo con éxito y notificación creada");
            return res.json({ success: true, action: 'followed' });
        }
    } catch (error) {
        console.error("ERROR EN TOGGLE FOLLOW:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;