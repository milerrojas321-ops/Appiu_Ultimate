const db = require('../data/db'); // Esta es la línea que te faltaba
const jwt = require('jsonwebtoken');


const login = async (req, res) => {
    // Intentamos sacar el dato tanto si viene como 'email' o como 'username'
    const identificador = req.body.email || req.body.username;
    const password = req.body.password;

    try {
        // Buscamos en ambas columnas de la DB usando el mismo dato
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ? OR username = ?', 
            [identificador, identificador]
        );

        console.log("Dato recibido del formulario:", identificador);
        console.log("¿Se encontró algo en la DB?:", rows.length > 0 ? "SÍ" : "NO");

        // ... resto de tu código de validación

        if (rows.length > 0) {
            console.log("Usuario de la DB:", rows[0].username);
            console.log("Password de la DB:", rows[0].password);
            console.log("Password del Formulario:", password);
            
            const user = rows[0];

            // TERCERO: Verificamos la contraseña
            if (user.password !== password) { 
                return res.status(401).json({ error: "Contraseña incorrecta" });
            }

            // CUARTO: Generamos el Token
            const token = jwt.sign(
                { id: user.id, username: user.username }, 
                process.env.JWT_SECRET, 
                { expiresIn: '2h' }
            );

            return res.json({ 
                success: true,
                token: token, 
                user: { id: user.id, username: user.username } 
            });
        } else {
            return res.status(401).json({ error: "Usuario o correo no encontrado" });
        }

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// RUTA: /api/usuarios/actualizar/:id
const updateProfile = async (req, res) => {
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
const toggleFollow = async (req, res) => {
    const { seguidor_id, seguido_id } = req.body;
    
    // Validación de seguridad: no puedes seguirte a ti mismo
    if (seguidor_id === seguido_id) {
        return res.status(400).json({ error: "No puedes seguirte a ti mismo" });
    }
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
const getPublicProfile = async (req, res) => {
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

// Dentro de controllers/userController.js, antes del module.exports

const obtenerSugerencias = async (req, res) => {
    const { idLogueado } = req.params;
    try {
        // Buscamos usuarios que NO sea el logueado y a los que NO siga aún
        const sql = `
            SELECT id, username, foto_perfil, is_expert 
            FROM users 
            WHERE id != ? 
            AND id NOT IN (SELECT id_seguido FROM seguidores WHERE id_seguidor = ?)
            LIMIT 5`;
        
        const [rows] = await db.query(sql, [idLogueado, idLogueado]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerNotificaciones = async (req, res) => {
    const { userId } = req.params; // O usa req.userId si ya vienes del middleware
    try {
        const sql = `
            SELECT n.*, u.username, u.foto_perfil 
            FROM notificaciones n
            JOIN users u ON n.id_emisor = u.id
            WHERE n.id_receptor = ?
            ORDER BY n.fecha DESC LIMIT 20`;
        
        const [rows] = await db.query(sql, [userId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


module.exports = {
    login,
    updateProfile,
    toggleFollow,
    getPublicProfile,
    obtenerSugerencias,
    obtenerNotificaciones // <--- ¡Añade esta!
};