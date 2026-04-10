const express = require('express');
const router = express.Router();
const db = require('../data/db'); 
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: 'public/uploads/', 
    filename: (req, file, cb) => {
        cb(null, `post-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// 1. OBTENER TODAS LAS PUBLICACIONES (CON ESTADO DE LIKE)
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const sql = `
            SELECT p.*, u.foto_perfil,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as loLikeo
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC`;
        const [rows] = await db.query(sql, [userId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:userId', async (req, res) => {
    try {
        const sql = `SELECT p.*, u.foto_perfil as user_pfp FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`;
        const [rows] = await db.query(sql, [req.params.userId]);
        
        const rowsCorregidas = rows.map(post => ({
            ...post,
            // Si la imagen existe y no tiene el prefijo, se lo ponemos
            image_url: post.image_url ? (post.image_url.startsWith('/') ? post.image_url : `/uploads/${post.image_url}`) : null,
            user_pfp: post.user_pfp ? (post.user_pfp.startsWith('/') ? post.user_pfp : `/uploads/${post.user_pfp}`) : '/img/default-avatar.png'
        }));
        
        res.json(rowsCorregidas);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// routes/publicaciones.js
router.get('/usuario/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        // Seleccionamos los posts donde el user_id coincida con el perfil abierto
        const query = 'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC';
        const [rows] = await db.query(query, [userId]);
        res.json(rows); // Esto envía el JSON limpio que el frontend espera
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// OBTENER POSTS
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const sql = `
            SELECT p.*, u.foto_perfil as user_pfp, u.username as user_name,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as loLikeo
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC`;
        const [rows] = await db.query(sql, [userId]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. CREAR PUBLICACIÓN
router.post('/crear', upload.single('image'), async (req, res) => {
    try {
        const { user_id, username, content, plant_name } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;

        const sql = 'INSERT INTO posts (user_id, username, content, image_url, plant_name) VALUES (?, ?, ?, ?, ?)';
        await db.query(sql, [user_id, username, content, image_url, plant_name]);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// 5. DAR O QUITAR LIKE (Actualizado con Notificación)
router.post('/:id/like', async (req, res) => {
    const postId = req.params.id;
    const { user_id } = req.body;

    try {
        const [existe] = await db.query(
            'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?', 
            [user_id, postId]
        );

        if (existe.length > 0) {
            // Quitar Like
            await db.query('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [user_id, postId]);
            await db.query('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
            
            // Borramos la notificación si quitan el like
            await db.query('DELETE FROM notificaciones WHERE id_emisor = ? AND id_referencia = ? AND tipo = "like"', [user_id, postId]);
            
            res.json({ success: true, action: 'removed' });
        } else {
            // Dar Like
            await db.query('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [user_id, postId]);
            await db.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);

            // --- NOTIFICACIÓN: Buscamos al dueño del post ---
            const [post] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
            if (post.length > 0 && post[0].user_id != user_id) {
                await db.query(
                    'INSERT INTO notificaciones (id_receptor, id_emisor, tipo, id_referencia) VALUES (?, ?, ?, ?)',
                    [post[0].user_id, user_id, 'like', postId]
                );
            }

            res.json({ success: true, action: 'added' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// OBTENER POSTS CON JOIN
router.get('/:userId', async (req, res) => {
    try {
        const sql = `
            SELECT p.*, u.foto_perfil as user_pfp, u.username as user_name,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as loLikeo
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC`;
        const [rows] = await db.query(sql, [req.params.userId]);
        
        const cleanRows = rows.map(p => ({
            ...p,
            user_pfp: p.user_pfp ? (p.user_pfp.startsWith('/uploads/') ? p.user_pfp : `/uploads/${p.user_pfp}`) : '/img/default-avatar.png'
        }));
        
        res.json(cleanRows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- GESTIÓN DE COMENTARIOS ---

// 1. OBTENER COMENTARIOS DE UN POST
router.get('/comentarios/:post_id', async (req, res) => {
    const { post_id } = req.params;
    try {
        const [rows] = await db.query(
            'SELECT * FROM comentarios WHERE post_id = ? ORDER BY created_at ASC', 
            [post_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).send("Error al obtener comentarios: " + err.message);
    }
});

// routes/publicaciones.js
router.post('/comentarios', async (req, res) => {
    const { post_id, user_id, username, texto } = req.body;
    try {
        const sql = 'INSERT INTO comentarios (post_id, user_id, username, texto) VALUES (?, ?, ?, ?)';
        await db.query(sql, [post_id, user_id, username, texto]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;