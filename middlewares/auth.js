const jwt = require('jsonwebtoken');
const db = require('../data/db'); // Tu conexión a la base de datos

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscamos al usuario en la base de datos
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });
        const user = rows[0];

        // 2. Aquí va tu lógica de comparar contraseñas (ej: bcrypt.compare)
        // Si la contraseña es correcta, procedemos:
        
        // 3. GENERAMOS EL TOKEN (Aquí "soltamos" la manilla)
        const token = jwt.sign(
            { id: user.id }, // El payload (lo que queremos saber del usuario)
            process.env.JWT_SECRET, // Nuestra llave secreta del .env
            { expiresIn: '2h' } // Duración del pasaporte
        );

        // 4. Respondemos al cliente con el token
        res.json({
            message: "Login exitoso",
            token: token, // <-- Este es el token que el frontend debe guardar
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" });
    }
};


module.exports = (req, res, next) => {
    // lógica...
};