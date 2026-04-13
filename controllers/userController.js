const User = require('../models/userModel');
const jwt = require('jsonwebtoken');


// Función para obtener el perfil básico por ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (user) {
            // Enviamos el JSON que el frontend espera
            res.json(user); 
        } else {
            res.status(404).json({ error: "Usuario no existe" });
        }
    } catch (error) {
        console.error("Error en getUserById:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

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

// Lógica de Registro
exports.registro = async (req, res) => {
    try {
        const { username, email, password, expert_bio } = req.body;
        const userData = {
            username, email, password,
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

// Lógica de Login
exports.login = async (req, res) => {
    const identificador = req.body.email || req.body.username;
    const { password } = req.body;
    try {
        const user = await User.findByEmailOrUsername(identificador);
        if (!user || user.password !== password) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ success: true, token, user: { id: user.id, username: user.username } });
    } catch (error) {
        res.status(500).json({ error: "Error interno" });
    }
};

// Obtener Sugerencias
exports.obtenerSugerencias = async (req, res) => {
    try {
        const rows = await User.getSuggestions(req.params.idLogueado);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


//seguir o dejar de seguir a un usuario
exports.toggleFollow = async (req, res) => {
    // 1. Capturamos todas las posibles variantes de nombres que envía el frontend
    const { seguidor_id, seguido_id, idSeguidor, idSeguido } = req.body;
    
    // 2. Normalizamos los IDs para usar siempre la misma variable
    const final_seguidor = seguidor_id || idSeguidor;
    const final_seguido = seguido_id || idSeguido;

    // 3. Validación de seguridad (no seguirse a sí mismo)
    if (final_seguidor == final_seguido) {
        return res.status(400).json({ error: "No puedes seguirte a ti mismo" });
    }

    // 4. Validación de existencia de datos
    if (!final_seguidor || !final_seguido) {
        return res.status(400).json({ error: "Faltan IDs de usuario para completar la acción" });
    }

    try {
        // 5. Llamamos al modelo con los IDs ya limpios
        const result = await User.toggleFollow(final_seguidor, final_seguido);
        
        // 6. Respondemos al frontend
        res.json({ 
            success: true, 
            action: result.action // Esto devolverá 'followed' o 'unfollowed'
        });
    } catch (error) {
        console.error("Error en toggleFollow:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Actualizar Perfil (Lógica de negocio + Sincronización)
exports.actualizarPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, username, expert_bio } = req.body;
        
        // Si Multer procesó una foto, usamos el nombre; si no, null
        const foto_perfil = req.file ? req.file.filename : null;

        await User.updateProfile(id, { 
            nombre_completo, 
            username, 
            expert_bio, 
            foto_perfil 
        });

        res.json({ success: true, message: "¡Perfil actualizado!" });
    } catch (error) {
        console.error("ERROR EN EL CONTROLADOR:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Obtener Notificaciones
exports.obtenerNotificaciones = async (req, res) => {
    try {
        const userId = req.params.userId || req.userId;
        const rows = await User.getNotifications(userId);

        const notificacionesFormateadas = rows.map(nota => {
            // Verificamos si la foto existe
            let fotoFinal = '/img/default-avatar.png'; // Imagen por defecto
            
            if (nota.foto_perfil) {
                // Si la foto ya empieza con /uploads, la dejamos igual
                // Si no, le ponemos el prefijo una SOLA vez
                fotoFinal = nota.foto_perfil.startsWith('/uploads') 
                    ? nota.foto_perfil 
                    : `/uploads/${nota.foto_perfil}`;
            }

            return {
                ...nota,
                foto_perfil: fotoFinal
            };
        });

        res.json(notificacionesFormateadas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};