require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./data/db'); 
const multer = require('multer');
const app = express();
const PORT = 3650;

// 1. CONFIGURACIÓN DE MIDDLEWARES (EL ORDEN ES VITAL)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));


// Busca estas líneas y déjalas EXACTAMENTE así:
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'public', 'uploads');

// 1. Servir archivos de la raíz de public (HTML, CSS, JS)
app.use(express.static(publicPath));

// 2. Servir la carpeta de uploads con el prefijo /uploads
// Esto hace que http://localhost:3650/uploads/archivo.jpg funcione
app.use('/uploads', express.static(uploadsPath));


// 3. CONFIGURACIÓN DE MULTER (Para fotos)
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 4. IMPORTAR RUTAS EXTERNAS
const rutasUsuarios = require('./routes/usuarios');
const publicacionesRoutes = require('./routes/publicaciones'); 

// 5. USAR RUTAS
app.use('/auth', rutasUsuarios);
app.use('/api/usuarios', rutasUsuarios);
app.use('/api/publicaciones', publicacionesRoutes);

// --- RUTA PRINCIPAL ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});

const plantRoutes = require('./routes/plantRoutes'); // Asegúrate que el nombre coincida
app.use('/api/plantas', plantRoutes);

// --- API: SUGERENCIAS DE USUARIOS ---
app.get('/api/usuarios/sugerencias/:idLogueado', async (req, res) => {
    const idLogueado = req.params.idLogueado;
    try {
        const query = `
            SELECT id, username, foto_perfil, 
            (SELECT COUNT(*) FROM seguidores WHERE id_seguidor = ? AND id_seguido = u.id) as loSigo
            FROM users u WHERE id != ? ORDER BY RAND() LIMIT 5`;
        const [rows] = await db.query(query, [idLogueado, idLogueado]);
        
        const procesados = rows.map(u => ({
            ...u,
            foto_perfil: u.foto_perfil ? (u.foto_perfil.startsWith('/') ? u.foto_perfil : `/uploads/${u.foto_perfil}`) : '/img/icono.jpg'
        }));
        res.json(procesados);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- API: NOTIFICACIONES ---
app.get('/api/notificaciones/:userId', async (req, res) => {
    try {
        const sql = `
            SELECT n.*, u.username as nombre_emisor, u.foto_perfil 
            FROM notificaciones n
            JOIN users u ON n.id_emisor = u.id
            WHERE n.id_receptor = ? ORDER BY n.id DESC LIMIT 15`;
        const [rows] = await db.query(sql, [req.params.userId]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- API: COMENTARIOS ---
app.get('/api/publicaciones/:id/comentarios', async (req, res) => {
    try {
        const sql = "SELECT c.*, u.username, u.foto_perfil FROM comentarios c LEFT JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.id ASC";
        const [rows] = await db.query(sql, [req.params.id]);
        res.json(rows); 
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- CONEXIÓN Y ARRANQUE ---
db.query('SELECT 1')
    .then(() => {
        console.log('✅ Conexión a MySQL exitosa');
        app.listen(PORT, () => console.log(`🚀 App corriendo en: http://localhost:${PORT}`));
    })
    .catch(err => console.error('❌ Error de conexión:', err.message));