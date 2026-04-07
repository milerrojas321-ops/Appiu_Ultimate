const express = require('express');
const path = require('path');
const rutasUsuarios = require('./routes/usuarios');
const publicacionesRoutes = require('./routes/publicaciones'); 
const db = require('./data/db'); 
const multer = require('multer');
const app = express();
const PORT = 3650;


app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// ESTA LÍNEA ES VITAL:
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, `perfil-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// En server.js (Ruta de actualización)
app.post('/api/usuarios/actualizar/:id', upload.single('foto_perfil'), async (req, res) => {
    const userId = req.params.id;
    const { username, expert_bio } = req.body; 
    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        if (foto) {
            // 1. Actualiza el usuario
            await db.query("UPDATE users SET username = ?, expert_bio = ?, foto_perfil = ? WHERE id = ?", [username, expert_bio, foto, userId]);
            
            // 2. ¡VITAL! Actualiza la foto en todas sus publicaciones antiguas
            // Asegúrate de que el nombre de la columna sea 'foto_perfil' o 'user_pfp' según tu tabla posts
            await db.query("UPDATE posts SET foto_perfil = ? WHERE user_id = ?", [foto, userId]); 
        } else {
            await db.query("UPDATE users SET username = ?, expert_bio = ? WHERE id = ?", [username, expert_bio, userId]);
        }
        res.json({ success: true, message: "¡Perfil y publicaciones actualizados! 🌿" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 1. Middlewares de lectura (SIEMPRE PRIMERO)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 3. Rutas (DESPUÉS DE LOS MIDDLEWARES)
app.use('/api/usuarios', rutasUsuarios);

// RUTA ACTUALIZAR PERFIL (Sincronizada con el Frontend)
// server.js

app.post('/actualizar-perfil', upload.single('fotoPerfil'), async (req, res) => {
    const { nombreUsuario, idUsuario } = req.body;
    const foto = req.file;

    if (!idUsuario) {
        return res.status(400).json({ success: false, error: "ID de usuario no recibido" });
    }

    let conn;
    try {
        conn = await db.getConnection(); // Obtener una conexión del pool
        await conn.beginTransaction(); // Iniciar una transacción

        // 1. Actualizar la tabla 'users'
        let sqlUser = "UPDATE users SET username = ? WHERE id = ?";
        let paramsUser = [nombreUsuario, idUsuario];
        let nuevaFotoUrl = null;

        // Dentro de app.post('/actualizar-perfil'...)
        if (foto) {
            const nuevaFotoUrl = `/uploads/${foto.filename}`;
            // Actualiza usuario
            await db.query("UPDATE users SET username = ?, foto_perfil = ? WHERE id = ?", [nombreUsuario, nuevaFotoUrl, idUsuario]);
            // Sincroniza publicaciones (JOIN o UPDATE según tu lógica)
            await db.query("UPDATE publicaciones SET user_pfp = ? WHERE user_id = ?", [nuevaFotoUrl, idUsuario]);
        }

        const [resultUser] = await conn.query(sqlUser, paramsUser);

        // 2. SINCRONIZAR PUBLICACIONES (Si hay nueva foto o nombre)
        if (resultUser.affectedRows > 0) {
            let sqlPosts = "UPDATE publicaciones SET username = ? WHERE user_id = ?";
            let paramsPosts = [nombreUsuario, idUsuario];

            if (nuevaFotoUrl) {
                // Aquí actualizamos el nombre Y la foto en todas las publicaciones del usuario
                // ASEGÚRATE DE USAR LOS NOMBRES EXACTOS DE TUS COLUMNAS EN 'publicaciones'
                sqlPosts = "UPDATE publicaciones SET username = ?, user_pfp = ? WHERE user_id = ?";
                paramsPosts = [nombreUsuario, nuevaFotoUrl, idUsuario];
            }
            
            await conn.query(sqlPosts, paramsPosts);
        }

        await conn.commit(); // Confirmar la transacción
        
        res.json({ 
            success: true, 
            nuevoUsername: nombreUsuario,
            nuevaFoto: nuevaFotoUrl // null si no se subió foto
        });

    } catch (err) {
        if (conn) await conn.rollback(); // Deshacer cambios si hay error
        console.error("Error en BD:", err);
        res.status(500).json({ success: false, error: "Error al actualizar en base de datos" });
    } finally {
        if (conn) conn.release(); // Liberar la conexión
    }
});

// Obtener notificaciones del usuario
app.get('/api/notificaciones/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const sql = `
            SELECT n.*, u.username as nombre_emisor, u.foto_perfil 
            FROM notificaciones n
            JOIN users u ON n.id_emisor = u.id
            WHERE n.id_receptor = ?
            ORDER BY n.fecha DESC 
            LIMIT 15`;
            
        const [rows] = await db.query(sql, [userId]);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// RUTAS API
app.use('/auth', rutasUsuarios);
app.use('/api/publicaciones', publicacionesRoutes);

// server.js - Nueva ruta de sugerencias con estado de seguimiento
app.get('/api/usuarios/sugerencias/:idLogueado', async (req, res) => {
    const idLogueado = req.params.idLogueado;
    try {
        // Esta consulta trae los usuarios y verifica si ya existe la relación en la tabla seguidores
        const query = `
            SELECT u.id, u.username, u.foto_perfil, 
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = ? AND id_seguido = u.id) as loSigo
            FROM users u 
            WHERE u.id != ? 
            LIMIT 5`;
            
        const [rows] = await db.query(query, [idLogueado, idLogueado]);
        res.json(rows);
    } catch (error) {
        console.error("Error en sugerencias:", error);
        res.status(500).json({ error: "Error en servidor" });
    }
});

// SISTEMA DE SEGUIR (FOLLOW/UNFOLLOW)
app.post('/api/usuarios/follow', async (req, res) => {
    const { seguidor_id, seguido_id } = req.body;
    try {
        const [existe] = await db.query('SELECT * FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?', [seguidor_id, seguido_id]);
        if (existe.length > 0) {
            await db.query('DELETE FROM seguidores WHERE id_seguidor = ? AND id_seguido = ?', [seguidor_id, seguido_id]);
            res.json({ action: 'unfollowed' });
        } else {
            await db.query('INSERT INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)', [seguidor_id, seguido_id]);
            res.json({ action: 'followed' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// NUEVA RUTA CORREGIDA
app.get('/api/plantas', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM explorar_plantas');
        res.json(results);
    } catch (err) {
        console.error("❌ Error en la consulta de plantas:", err.message);
        res.status(500).json({ error: "Error del servidor", detalle: err.message });
    }
});

// CONTADORES DE PERFIL
app.get('/api/usuarios/contadores/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [seguidores] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE seguido_id = ?', [userId]);
        const [seguidos] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE seguidor_id = ?', [userId]);
        res.json({ seguidores: seguidores[0].total, seguidos: seguidos[0].total });
    } catch (e) { res.status(500).json(e); }
});

// VISTA POR DEFECTO
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});

// OBTENER PLANTAS DEL USUARIO
app.get('/api/plantas/:usuario_id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM coleccion_plantas WHERE usuario_id = ? ORDER BY id DESC', [req.params.usuario_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar herbario" });
    }
});

app.get('/api/publicaciones/usuario/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        // Traemos las publicaciones del usuario específico, ordenadas por la más reciente
        const [rows] = await db.query(
            "SELECT * FROM posts WHERE user_id = ? ORDER BY id DESC", 
            [userId]
        );
        res.json(rows); 
    } catch (error) {
        console.error("Error al obtener publicaciones del usuario:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Esta ruta ya existe en tu server.js
app.get('/api/usuarios/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const sql = `
            SELECT u.id, u.username, u.foto_perfil, u.expert_bio, u.is_expert,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguido = u.id) AS seguidores_count,
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = u.id) AS seguidos_count
            FROM users u WHERE u.id = ?`;
        const [rows] = await db.query(sql, [userId]);
        if (rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ error: "Usuario no encontrado" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Busca esta ruta en server.js y reemplázala
app.get('/api/publicaciones/:id', async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.*, 
                u.username AS nombre_real, 
                u.foto_perfil AS foto_real
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.id DESC`;
            
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Error en SQL del feed:", error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/publicaciones/:id', async (req, res) => {
    const postId = req.params.id;
    const { user_id } = req.body; // Verificamos que sea el dueño
    try {
        await db.query("DELETE FROM posts WHERE id = ? AND user_id = ?", [postId, user_id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// SUBIR NUEVA PLANTA A LA COLECCIÓN
app.post('/api/plantas', upload.single('fotoPlanta'), async (req, res) => {
    const { usuario_id, nombre_comun, apodo, fecha_adopcion, estado_salud } = req.body;
    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
        const sql = "INSERT INTO coleccion_plantas (usuario_id, nombre_comun, apodo, fecha_adopcion, estado_salud, foto_url) VALUES (?, ?, ?, ?, ?, ?)";
        await db.query(sql, [usuario_id, nombre_comun, apodo, fecha_adopcion, estado_salud, foto_url]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- RUTA DE FOLLOW ---
app.post('/api/usuarios/follow', async (req, res) => {
    const { seguidor_id, seguido_id } = req.body;
    
    // LOG DE CONTROL: Verás esto en tu terminal negra de Node.js
    console.log(`Intentando follow: De ${seguidor_id} a ${seguido_id}`);

    try {
        // 1. Insertar seguimiento
        const [result] = await db.query("INSERT IGNORE INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)", [seguidor_id, seguido_id]);
        console.log("Resultado Insert Seguidores:", result);

        // 2. Insertar notificación
        const mensaje = `¡Tienes un nuevo seguidor! 🌿`;
        await db.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, tipo, leido) VALUES (?, ?, ?, ?)", 
            [seguido_id, mensaje, 'follow', false]
        );
        console.log("Notificación de follow creada");

        res.json({ success: true, action: 'followed' });
    } catch (error) {
        console.error("ERROR CRÍTICO EN FOLLOW:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- RUTA PARA GUARDAR COMENTARIO ---
// RUTA PARA OBTENER COMENTARIOS (GET)
app.get('/api/publicaciones/:id/comentarios', async (req, res) => {
    const postId = req.params.id;
    try {
        // SQL corregido para usar 'user_id' y unir con 'users' para el nombre
        const sql = `
            SELECT c.*, u.username 
            FROM comentarios c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.post_id = ? 
            ORDER BY c.id DESC`;
            
        const [rows] = await db.query(sql, [postId]);
        res.json(rows); // Esto enviará [] si no hay comentarios
    } catch (error) {
        console.error("❌ Error SQL en GET comentarios:", error);
        res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
    }
});

// RUTA PARA GUARDAR COMENTARIO (POST)
app.post('/api/comentarios', async (req, res) => {
    const { usuario_id, username, publicacion_id, contenido } = req.body;
    try {
        // Usamos los nombres exactos de tu nueva tabla: post_id, user_id, texto
        await db.query(
            "INSERT INTO comentarios (post_id, user_id, username, texto) VALUES (?, ?, ?, ?)", 
            [publicacion_id, usuario_id, username, contenido]
        );
        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error SQL en POST comentarios:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// INICIO DE CONEXIÓN
db.query('SELECT 1')
    .then(() => {
        console.log('✅ Conexión a MySQL exitosa');
        app.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
        });
    })
    .catch(err => console.error('❌ Error de conexión:', err.message));