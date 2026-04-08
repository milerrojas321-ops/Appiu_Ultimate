const db = require('../data/db');

// Función para obtener el feed
exports.getFeed = async (req, res) => {
    try {
        const sql = `
            SELECT p.*, u.foto_perfil as user_pfp, u.username as user_name,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as loLikeo
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC`;
        const [rows] = await db.query(sql, [req.params.userId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Función para comentarios estilo TikTok
exports.getComments = async (req, res) => {
    const postId = req.params.id;
    try {
        const sql = "SELECT c.*, u.username, u.foto_perfil FROM comentarios c LEFT JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.id ASC";
        const [rows] = await db.query(sql, [postId]);
        res.json(rows); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addComment = async (req, res) => {
    const { usuario_id, publicacion_id, contenido } = req.body;
    try {
        const sql = "INSERT INTO comentarios (post_id, user_id, texto) VALUES (?, ?, ?)";
        await db.query(sql, [publicacion_id, usuario_id, contenido]);
        res.json({ success: true, message: "Comentario publicado" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};