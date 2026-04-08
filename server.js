require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./data/db'); 
const multer = require('multer');
const app = express();
const PORT = 3650;

// 1. CONFIGURACIÓN DE MIDDLEWARES
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));



const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'public', 'uploads');

// 1. Servir archivos de la raíz de public (HTML, CSS, JS)
app.use(express.static(publicPath));

// 2. Servir la carpeta de uploads con el prefijo /uploads
// Esto hace que http://localhost:3650/uploads/archivo.jpg funcione
app.use('/uploads', express.static(uploadsPath));

// 4. IMPORTAR RUTAS EXTERNAS
const publicacionesRoutes = require('./routes/publicaciones'); 
const rutasUsuarios = require('./routes/usuarios');


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