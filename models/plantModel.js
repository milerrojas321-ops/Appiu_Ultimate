const db = require('../data/db');

const Plant = {
    // Para el herbario personal
    getByUserId: async (userId) => {
        const sql = "SELECT * FROM coleccion_plantas WHERE usuario_id = ? ORDER BY id DESC";
        const [rows] = await db.query(sql, [userId]);
        return rows;
    },

    // El registro que tenías en server.js
    create: async (data) => {
        const { nombre_comun, apodo, fecha_adopcion, estado_salud, foto_url, usuario_id } = data;
        const sql = `INSERT INTO coleccion_plantas 
            (nombre_comun, apodo, fecha_adopcion, estado_salud, foto_url, usuario_id) 
            VALUES (?, ?, ?, ?, ?, ?)`;
        return await db.query(sql, [nombre_comun, apodo, fecha_adopcion, estado_salud, foto_url, usuario_id]);
    }
};

module.exports = Plant;