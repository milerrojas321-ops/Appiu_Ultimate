const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Tu usuario de MySQL
    password: '',      // Tu contraseña
    database: 'appiu_bd', // El nombre de la BD que creaste
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool.promise();