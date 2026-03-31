const express = require('express');
const path = require('path');
const rutasUsuarios = require('./routes/usuarios');
const publicacionesRoutes = require('./routes/publicaciones'); 
const db = require('./data/db'); 
const multer = require('multer');
const app = express();
const PORT = 3650;

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

// MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use('/api/usuarios', rutasUsuarios);

app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// INICIO DE CONEXIÓN
db.query('SELECT 1')
    .then(() => {
        console.log('✅ Conexión a MySQL exitosa');
        app.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
        });
    })
    .catch(err => console.error('❌ Error de conexión:', err.message));