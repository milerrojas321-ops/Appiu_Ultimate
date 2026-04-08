const db = require('../data/db');

// RUTA: /api/usuarios/actualizar/:id
exports.updateProfile = async (req, res) => {
    const userId = req.params.id;
    const { username, expert_bio } = req.body; 
    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        if (foto) {
            // 1. Actualiza el usuario
            await db.query("UPDATE users SET username = ?, expert_bio = ?, foto_perfil = ? WHERE id = ?", [username, expert_bio, foto, userId]);
            // 2. Sincroniza la foto en todas sus publicaciones antiguas
            await db.query("UPDATE posts SET user_pfp = ? WHERE user_id = ?", [foto, userId]); 
        } else {
            await db.query("UPDATE users SET username = ?, expert_bio = ? WHERE id = ?", [username, expert_bio, userId]);
        }
        // 3. Sincroniza el nombre en los posts siempre
        await db.query("UPDATE posts SET user_name = ? WHERE user_id = ?", [username, userId]);

        res.json({ success: true, message: "¡Perfil y publicaciones sincronizados! 🌿" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// RUTA: /api/usuarios/follow
exports.toggleFollow = async (req, res) => {
    const { seguidor_id, seguido_id } = req.body;
    try {
        const [existe] = await db.query('SELECT * FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?', [seguidor_id, seguido_id]);
        if (existe.length > 0) {
            await db.query('DELETE FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?', [seguidor_id, seguido_id]);
            res.json({ action: 'unfollowed', success: true });
        } else {
            await db.query('INSERT INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)', [seguidor_id, seguido_id]);
            // Notificación
            await db.query("INSERT INTO notificaciones (id_receptor, id_emisor, tipo, leido) VALUES (?, ?, ?, ?)", 
                          [seguido_id, seguidor_id, 'follow', false]);
            res.json({ action: 'followed', success: true });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// Perfil completo externo
exports.getPublicProfile = async (req, res) => {
    const { idLogueado, perfilId } = req.params;
    try {
        const sqlUser = `
            SELECT u.id, u.username, u.expert_bio AS biografia, u.foto_perfil, u.is_expert,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguido = u.id) AS seguidores_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = u.id) AS seguidos_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = ? AND id_seguido = u.id) AS loSigo
            FROM users u WHERE u.id = ?`;
        const [userRows] = await db.query(sqlUser, [idLogueado, perfilId]);
        if (userRows.length === 0) return res.status(404).json({ error: "No existe" });

        const [postRows] = await db.query('SELECT * FROM posts WHERE user_id = ? ORDER BY id DESC', [perfilId]);
        res.json({ usuario: userRows[0], publicaciones: postRows });
    } catch (error) { res.status(500).json({ error: error.message }); }
};