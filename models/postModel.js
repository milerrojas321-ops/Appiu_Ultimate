const db = require('../data/db');

const Post = {
    // Obtener feed con fotos de usuario y estado de Like
    getAll: async (userId) => {
        const sql = `
            SELECT p.*, u.foto_perfil as user_pfp, u.username as user_name,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as loLikeo
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC`;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    },

    // Posts de un usuario específico
    getByUserId: async (userId) => {
        const sql = 'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC';
        const [rows] = await db.query(sql, [userId]);
        return rows;
    },

    create: async (data) => {
        const { user_id, username, content, image_url, plant_name } = data;
        const sql = 'INSERT INTO posts (user_id, username, content, image_url, plant_name) VALUES (?, ?, ?, ?, ?)';
        return await db.query(sql, [user_id, username, content, image_url, plant_name]);
    },

    toggleLike: async (postId, userId) => {
        const [exist] = await db.query('SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
        if (exist.length > 0) {
            await db.query('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
            await db.query('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
            await db.query('DELETE FROM notificaciones WHERE id_emisor = ? AND id_referencia = ? AND tipo = "like"', [userId, postId]);
            return { action: 'removed' };
        } else {
            await db.query('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
            await db.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);
            const [postOwner] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
            if (postOwner.length > 0 && postOwner[0].user_id != userId) {
                await db.query(
                    'INSERT INTO notificaciones (id_receptor, id_emisor, tipo, id_referencia) VALUES (?, ?, ?, ?)',
                    [postOwner[0].user_id, userId, 'like', postId]
                );
            }
            return { action: 'added' };
        }
    },

    getComments: async (postId) => {
        const sql = "SELECT c.*, u.username, u.foto_perfil FROM comentarios c LEFT JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.id ASC";
        const [rows] = await db.query(sql, [postId]);
        return rows;
    },

    addComment: async (postId, userId, username, texto) => {
        const sql = 'INSERT INTO comentarios (post_id, user_id, username, texto) VALUES (?, ?, ?, ?)';
        return await db.query(sql, [postId, userId, username, texto]);
    }
};

module.exports = Post;