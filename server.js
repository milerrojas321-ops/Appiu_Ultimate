const express = require('express');
const path = require('path');
const rutasUsuarios = require('./routes/usuarios');
const publicacionesRoutes = require('./routes/publicaciones'); // Importado una vez 
const db = require('./data/db'); 
const multer = require('multer');

const app = express();
const PORT = 3650;

// Configuración de almacenamiento para fotos de perfil
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, `perfil-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// MIDDLEWARE
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// RUTAS PRINCIPALES
app.use('/auth', rutasUsuarios);
app.use('/api/publicaciones', publicacionesRoutes); // Única declaración necesaria 

// VISTA INICIAL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});

// OTRAS RUTAS DE USUARIO (Sugerencias, Follow, Editar)
app.get('/api/usuarios', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, username FROM users'); 
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar sugerencias" });
    }
});

app.post('/api/usuarios/follow', async (req, res) => {
    const { seguidor_id, seguido_id } = req.body;
    try {
        const [existe] = await db.query('SELECT * FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [seguidor_id, seguido_id]);
        if (existe.length > 0) {
            await db.query('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [seguidor_id, seguido_id]);
            res.json({ action: 'unfollowed' });
        } else {
            await db.query('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [seguidor_id, seguido_id]);
            res.json({ action: 'followed' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/usuarios/contadores/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const [seguidores] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE seguido_id = ?', [userId]);
        const [seguidos] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE seguidor_id = ?', [userId]);
        res.json({ seguidores: seguidores[0].total, seguidos: seguidos[0].total });
    } catch (e) { res.status(500).json(e); }
});

// VERIFICACIÓN E INICIO
db.query('SELECT 1')
    .then(() => {
        console.log('✅ Conexión a MySQL exitosa');
        app.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
        });
    })
    .catch(err => console.error('❌ Error en MySQL:', err.message));

// const express = require('express');
// const path = require('path');
// const rutasUsuarios = require('./routes/usuarios');
// const publicacionesRoutes = require('./routes/publicaciones'); // Importado una vez 
// const db = require('./data/db'); 
// const multer = require('multer');

// const app = express();
// const PORT = 3650;

// // Configuración de almacenamiento para fotos de perfil
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/uploads/'); 
//     },
//     filename: (req, file, cb) => {
//         cb(null, `perfil-${Date.now()}${path.extname(file.originalname)}`);
//     }
// });
// const upload = multer({ storage: storage });

// // MIDDLEWARE
// app.use(express.json()); 
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'public'))); 
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// // RUTAS PRINCIPALES
// app.use('/auth', rutasUsuarios);
// app.use('/api/publicaciones', publicacionesRoutes); // Única declaración necesaria 

// // VISTA INICIAL
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'registro.html'));
// });

// // OTRAS RUTAS DE USUARIO (Sugerencias, Follow, Editar)
// app.get('/api/usuarios', async (req, res) => {
//     try {
//         const [rows] = await db.query('SELECT id, username FROM users'); 
//         res.json(rows);
//     } catch (error) {
//         res.status(500).json({ error: "Error al cargar sugerencias" });
//     }
// });

// app.post('/api/usuarios/follow', async (req, res) => {
//     const { seguidor_id, seguido_id } = req.body;
//     try {
//         const [existe] = await db.query('SELECT * FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [seguidor_id, seguido_id]);
//         if (existe.length > 0) {
//             await db.query('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [seguidor_id, seguido_id]);
//             res.json({ action: 'unfollowed' });
//         } else {
//             await db.query('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [seguidor_id, seguido_id]);
//             res.json({ action: 'followed' });
//         }
//     } catch (e) { res.status(500).json({ error: e.message }); }
// });

// app.get('/api/usuarios/contadores/:id', async (req, res) => {
//     const userId = req.params.id;
//     try {
//         const [seguidores] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE seguido_id = ?', [userId]);
//         const [seguidos] = await db.query('SELECT COUNT(*) as total FROM seguidores WHERE seguidor_id = ?', [userId]);
//         res.json({ seguidores: seguidores[0].total, seguidos: seguidos[0].total });
//     } catch (e) { res.status(500).json(e); }
// });

// // Ejemplo de cómo debe estar en tu server.js
// app.get('/api/usuarios/sugerencias', async (req, res) => {
//     try {
//         // Esta consulta selecciona usuarios que NO sean el actual y que NO esté siguiendo ya
//         // Ajusta los nombres de las tablas según tu base de datos
//         const [rows] = await db.query('SELECT id, username FROM usuarios LIMIT 5'); 
//         res.json(rows);
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Error en el servidor');
//     }
// });

// // VERIFICACIÓN E INICIO
// db.query('SELECT 1')
//     .then(() => {
//         console.log('✅ Conexión a MySQL exitosa');
//         app.listen(PORT, () => {
//             console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
//         });
//     })
//     .catch(err => console.error('❌ Error en MySQL:', err.message));