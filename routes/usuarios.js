const express = require('express');
const router = express.Router();
const db = require('../data/db');
const multer = require('multer'); // <--- Esto es lo que falta
const path = require('path');     // <--- Esto también

// --- CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
    destination: 'public/uploads/', 
    filename: (req, file, cb) => {
        // Esto le pone un nombre único a la foto de perfil: avatar-12345.jpg
        cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage }); // <--- Aquí se define 'upload'

// ... después de esto ya puedes poner tus rutas como router.post('/actualizar', ...)

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

// Ruta para Seguir o Dejar de seguir
router.post('/seguir', async (req, res) => {
    const { idSeguidor, idSeguido } = req.body;

    try {
        // 1. Verificamos si ya lo sigue
        const [existe] = await db.query(
            'SELECT * FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?',
            [idSeguidor, idSeguido]
        );

        if (existe.length > 0) {
            // Ya lo sigue -> Entonces lo dejamos de seguir (DELETE)
            await db.query(
                'DELETE FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?',
                [idSeguidor, idSeguido]
            );
            return res.json({ success: true, accion: 'unfollowed', mensaje: 'Dejaste de seguir' });
        } else {
            // No lo sigue -> Lo empezamos a seguir (INSERT)
            await db.query(
                'INSERT INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)',
                [idSeguidor, idSeguido]
            );
            return res.json({ success: true, accion: 'followed', mensaje: 'Siguiendo' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error en la base de datos' });
    }
});

// En routes/usuarios.js
router.get('/contadores/:id', async (req, res) => {
    const id = req.params.id;
    const [seguidores] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE id_seguido = ?', [id]);
    const [seguidos] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE id_seguidor = ?', [id]);
    
    res.json({
        seguidores: seguidores[0].total,
        seguidos: seguidos[0].total
    });
});

// Obtener perfil de otro usuario y sus posts
router.get('/perfil/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        // 1. Info del usuario
        const [userRows] = await db.query('SELECT id, username, foto_perfil, biografia FROM users WHERE id = ?', [userId]);
        
        if (userRows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        // 2. Sus publicaciones
        const [posts] = await db.query('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC', [userId]);

        res.json({
            usuario: userRows[0],
            publicaciones: posts
        });
    } catch (error) {
        res.status(500).json({ error: "Error al cargar perfil" });
    }
});

// Ruta para actualizar el perfil (Nombre y Foto)
router.post('/actualizar', upload.single('fotoPerfil'), async (req, res) => {
    try {
        const { idUsuario, nombreUsuario } = req.body;
        let nuevaFotoRuta = null;

        // Si el usuario subió una foto nueva, obtenemos la ruta
        if (req.file) {
            nuevaFotoRuta = `/uploads/${req.file.filename}`;
        }

        // 1. Si hay foto nueva, actualizamos nombre y foto
        if (nuevaFotoRuta) {
            await db.query(
                'UPDATE users SET username = ?, foto_perfil = ? WHERE id = ?',
                [nombreUsuario, nuevaFotoRuta, idUsuario]
            );
            
            // También actualizamos el nombre en la tabla de posts para que no haya inconsistencias
            await db.query('UPDATE posts SET username = ? WHERE user_id = ?', [nombreUsuario, idUsuario]);

            res.json({ 
                success: true, 
                nuevoUsername: nombreUsuario, 
                nuevaFoto: nuevaFotoRuta 
            });
        } 
        // 2. Si NO hay foto, solo actualizamos el nombre
        else {
            await db.query(
                'UPDATE users SET username = ? WHERE id = ?',
                [nombreUsuario, idUsuario]
            );
            
            await db.query('UPDATE posts SET username = ? WHERE user_id = ?', [nombreUsuario, idUsuario]);

            res.json({ 
                success: true, 
                nuevoUsername: nombreUsuario 
            });
        }

    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
});

// Archivo: routes/usuarios.js
// router.get('/perfil/:id', async (req, res) => {
//     const userId = req.params.id;
//     try {
//         // CAMBIO AQUÍ: 'foto_perfil' -> 'foto' (Como está en tu imagen de la BD)
//         const sql = "SELECT id, username, foto_perfil FROM users WHERE id = ?";
//         const [rows] = await db.query(sql, [userId]);

//         if (rows.length === 0) {
//             return res.status(404).json({ error: "Usuario no encontrado" });
//         }

//         res.json(rows[0]);
//     } catch (error) {
//         console.error("Error al obtener perfil:", error);
//         res.status(500).json({ error: "Error interno al cargar el perfil" });
//     }
// });

// Archivo: routes/usuarios.js
router.get('/perfil/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        // CAMBIAMOS 'users' por 'usuarios'
        const sql = "SELECT id, username, foto_perfil, biografia FROM usuarios WHERE id = ?";
        const [rows] = await db.query(sql, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error en la terminal:", error.sqlMessage || error);
        res.status(500).json({ error: "Error interno al cargar el perfil" });
    }
});

module.exports = router;