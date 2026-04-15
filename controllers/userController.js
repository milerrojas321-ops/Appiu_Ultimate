const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 

// 1. Función para obtener el perfil básico por ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            res.json(user); 
        } else {
            res.status(404).json({ error: "Usuario no existe" });
        }
    } catch (error) {
        console.error("Error en getUserById:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// 2. Perfil Público
exports.getPublicProfile = async (req, res) => {
    const { idLogueado, perfilId } = req.params;
    try {
        const data = await User.getPublicProfileData(idLogueado, perfilId);
        if (!data) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(data);
    } catch (error) {
        console.error("Error en getPublicProfile:", error);
        res.status(500).json({ error: error.message });
    }
};

// Login con Bcrypt y JWT
exports.login = async (req, res) => {
    const { email, password } = req.body; // 'email' recibe lo que mandes del front

    try {
        const user = await User.findByEmailOrUsername(email); 
        
        if (!user) {
            return res.status(401).json({ success: false, error: "Usuario no encontrado" });
        }

        // Comparar contraseña plana con el Hash de la DB
        const esCorrecta = await bcrypt.compare(password, user.password);
        
        if (!esCorrecta) {
            return res.status(401).json({ success: false, error: "Contraseña incorrecta" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET || 'clave_secreta', 
            { expiresIn: '2h' }
        );

        // Enviamos 'success: true' para que tu login.js redirija correctamente
        res.json({
            success: true,
            message: "Login exitoso",
            token,
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Error en el servidor" });
    }
};

// Registro con Bcrypt
exports.registro = async (req, res) => {
    try {
        const { username, email, password, expert_bio } = req.body;
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            username, email, 
            password: hashedPassword,
            isExpert: expert_bio ? 1 : 0,
            expertBio: expert_bio || null,
            fotoUrl: req.file ? `/uploads/${req.file.filename}` : null
        };

        await User.create(userData);
        res.status(201).json({ success: true, message: "Registrado con éxito 🌿" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Obtener Sugerencias
exports.obtenerSugerencias = async (req, res) => {
    try {
        const rows = await User.getSuggestions(req.params.idLogueado);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. Seguir o dejar de seguir
exports.toggleFollow = async (req, res) => {
    const { seguidor_id, seguido_id, idSeguidor, idSeguido } = req.body;
    const final_seguidor = seguidor_id || idSeguidor;
    const final_seguido = seguido_id || idSeguido;

    if (final_seguidor == final_seguido) {
        return res.status(400).json({ error: "No puedes seguirte a ti mismo" });
    }

    if (!final_seguidor || !final_seguido) {
        return res.status(400).json({ error: "Faltan IDs de usuario" });
    }

    try {
        const result = await User.toggleFollow(final_seguidor, final_seguido);
        res.json({ success: true, action: result.action });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 7. Actualizar Perfil
exports.actualizarPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, username, expert_bio } = req.body;
        const foto_perfil = req.file ? req.file.filename : null;

        await User.updateProfile(id, { 
            nombre_completo, 
            username, 
            expert_bio, 
            foto_perfil 
        });

        res.json({ success: true, message: "¡Perfil actualizado!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 8. Obtener Notificaciones
exports.obtenerNotificaciones = async (req, res) => {
    try {
        const userId = req.params.userId || req.userId;
        const rows = await User.getNotifications(userId);

        const notificacionesFormateadas = rows.map(nota => {
            let fotoFinal = '/img/default-avatar.png';
            if (nota.foto_perfil) {
                fotoFinal = nota.foto_perfil.startsWith('/uploads') 
                    ? nota.foto_perfil 
                    : `/uploads/${nota.foto_perfil}`;
            }
            return { ...nota, foto_perfil: fotoFinal };
        });

        res.json(notificacionesFormateadas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};