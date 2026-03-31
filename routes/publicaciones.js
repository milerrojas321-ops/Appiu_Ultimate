const express = require('express');
const router = express.Router();
const db = require('../data/db'); 
const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento para fotos de posts
const storage = multer.diskStorage({
    destination: 'public/uploads/', 
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
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

// 3. AGREGAR COMENTARIO + NOTIFICACIÓN
router.post('/:id/comentar', async (req, res) => {
    const post_id = req.params.id;
    const { user_id, username, content } = req.body;

    try {
        // Insertar el comentario
        await db.query(
            'INSERT INTO comments (post_id, user_id, username, content) VALUES (?, ?, ?, ?)', 
            [post_id, user_id, username, content]
        );

        // --- LÓGICA DE NOTIFICACIÓN ---
        // 1. Buscamos quién es el dueño del post
        const [post] = await db.query('SELECT user_id FROM posts WHERE id = ?', [post_id]);
        const idReceptor = post[0].user_id;

        // 2. Notificamos al dueño (si no es el mismo que comenta)
        if (idReceptor != user_id) {
            await db.query(
                'INSERT INTO notificaciones (id_receptor, id_emisor, tipo, id_referencia) VALUES (?, ?, ?, ?)',
                [idReceptor, user_id, 'comment', post_id]
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. OBTENER COMENTARIOS
router.get('/:id/comentarios', async (req, res) => {
    const post_id = req.params.id;
    try {
        const [rows] = await db.query('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', [post_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. DAR O QUITAR LIKE + NOTIFICACIÓN
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
            
            // Opcional: Borrar la notificación de ese like si quieres limpiar la DB
            await db.query('DELETE FROM notificaciones WHERE id_emisor = ? AND id_referencia = ? AND tipo = "like"', [user_id, postId]);
            
            res.json({ success: true, action: 'removed' });
        } else {
            // Dar Like
            await db.query('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [user_id, postId]);
            await db.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);

            // --- LÓGICA DE NOTIFICACIÓN ---
            const [post] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
            const idReceptor = post[0].user_id;

            if (idReceptor != user_id) {
                await db.query(
                    'INSERT INTO notificaciones (id_receptor, id_emisor, tipo, id_referencia) VALUES (?, ?, ?, ?)',
                    [idReceptor, user_id, 'like', postId]
                );
            }

            res.json({ success: true, action: 'added' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;