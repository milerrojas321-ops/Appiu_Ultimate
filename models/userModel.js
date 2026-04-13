const db = require('../data/db');

const User = {
    
    // Registro de nuevo usuario
    create: async (userData) => {
        const { username, email, password, isExpert, expertBio, fotoUrl } = userData;
        const query = 'INSERT INTO users (username, email, password, is_expert, expert_bio, foto_perfil) VALUES (?, ?, ?, ?, ?, ?)';
        return await db.query(query, [username, email, password, isExpert, expertBio, fotoUrl]);
    },

    // Buscar por Email o Username (para Login)
    findByEmailOrUsername: async (identificador) => {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [identificador, identificador]);
        return rows[0];
    },

    // Buscar por ID con contadores (para Perfil)
    findByIdWithStats: async (id) => {
        const sql = `
            SELECT u.*, 
            (SELECT COUNT(*) FROM seguidores WHERE id_seguido = u.id) as seguidores_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = u.id) as seguidos_count
            FROM users u WHERE u.id = ?`;
        const [rows] = await db.query(sql, [id]);
        return rows[0];
    },

    // Buscar perfil con contadores
    findById: async (id) => {
        const sql = `
            SELECT u.*, 
            (SELECT COUNT(*) FROM seguidores WHERE id_seguido = u.id) as seguidores_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = u.id) as seguidos_count
            FROM users u WHERE u.id = ?`;
        const [rows] = await db.query(sql, [id]);
        return rows[0];
    },

    getPublicProfileData: async (idLogueado, perfilId) => {
        const sqlUser = `
            SELECT u.id, u.username, u.expert_bio, u.foto_perfil, u.is_expert,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguido = ?) as seguidores_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = ?) as seguidos_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?) as loSigo
            FROM users u WHERE u.id = ?`;
        const [userRows] = await db.query(sqlUser, [perfilId, perfilId, idLogueado, perfilId, perfilId]);

        if (userRows.length === 0) return null;

        const [postRows] = await db.query('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC', [perfilId]);

        return {
            usuario: userRows[0],
            publicaciones: postRows
        };
    },

    
toggleFollow: async (seguidorId, seguidoId) => {
        const [existe] = await db.query("SELECT * FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?", [seguidorId, seguidoId]);
        if (existe.length > 0) {
            await db.query("DELETE FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?", [seguidorId, seguidoId]);
            await db.query("DELETE FROM notificaciones WHERE id_receptor = ? AND id_emisor = ? AND tipo = 'follow'", [seguidoId, seguidorId]);
            return { action: 'unfollowed' };
        } else {
            await db.query("INSERT INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)", [seguidorId, seguidoId]);
            await db.query("INSERT INTO notificaciones (id_receptor, id_emisor, tipo, id_referencia, leido) VALUES (?, ?, 'follow', ?, 0)", [seguidoId, seguidorId, seguidorId]);
            return { action: 'followed' };
        }
    },

    // Actualización de perfil con sincronización en cascada a Publicaciones
    updateFullProfile: async (id, data) => {
        const { username, expert_bio, foto } = data;
        if (foto) {
            await db.query("UPDATE users SET username = ?, expert_bio = ?, foto_perfil = ? WHERE id = ?", [username, expert_bio, foto, id]);
            await db.query("UPDATE posts SET user_pfp = ? WHERE user_id = ?", [foto, id]); 
        } else {
            await db.query("UPDATE users SET username = ?, expert_bio = ? WHERE id = ?", [username, expert_bio, id]);
        }
        await db.query("UPDATE posts SET user_name = ? WHERE user_id = ?", [username, id]);
        return true;
    },

    // models/userModel.js
    updateProfile: async (id, data) => {
        const { nombre_completo, username, expert_bio, foto_perfil } = data;
        
        if (foto_perfil) {
            // Caso con foto nueva: 5 parámetros (?,?,?,?,?)
            const sql = `UPDATE users SET nombre_completo = ?, username = ?, expert_bio = ?, foto_perfil = ? WHERE id = ?`;
            return await db.query(sql, [nombre_completo, username, expert_bio, foto_perfil, id]);
        } else {
            // Caso sin foto nueva: 4 parámetros (?,?,?)
            const sql = `UPDATE users SET nombre_completo = ?, username = ?, expert_bio = ? WHERE id = ?`;
            return await db.query(sql, [nombre_completo, username, expert_bio, id]);
        }
    },

    // Sugerencias inteligentes (Usuarios que no sigues)
    getSuggestions: async (idLogueado) => {
        const sql = `
            SELECT u.id, u.username, u.foto_perfil, 
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = ? AND id_seguido = u.id) as loSigo
            FROM users u WHERE u.id != ? 
            HAVING loSigo = 0 ORDER BY RAND() LIMIT 5`;
        const [rows] = await db.query(sql, [idLogueado, idLogueado]);
        return rows;
    },

    // Notificaciones con JOIN de usuario
    getNotifications: async (userId) => {
        const sql = `
            SELECT n.*, u.username as nombre_emisor, u.foto_perfil 
            FROM notificaciones n
            JOIN users u ON n.id_emisor = u.id
            WHERE n.id_receptor = ? 
            ORDER BY n.id DESC LIMIT 20`;
        const [rows] = await db.query(sql, [userId]);
        return rows;
    }
};

module.exports = User;