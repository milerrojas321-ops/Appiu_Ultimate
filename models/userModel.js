const db = require('../data/db');

const User = {
    findById: async (id) => {
        const sql = `
            SELECT u.id, u.username, u.email, u.expert_bio, u.foto_perfil, u.is_expert,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguido = u.id) as seguidores_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = u.id) as seguidos_count
            FROM users u WHERE u.id = ?`;
        const [rows] = await db.query(sql, [id]);
        return rows[0];
    },
    updateProfile: async (id, nombre, foto) => {
        if (foto) {
            return await db.query('UPDATE users SET username = ?, foto_perfil = ? WHERE id = ?', [nombre, foto, id]);
        }
        return await db.query('UPDATE users SET username = ? WHERE id = ?', [nombre, id]);
    }
};

module.exports = User;