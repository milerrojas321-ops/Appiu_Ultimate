const Plant = require('../models/plantModel');

exports.registerPlant = async (req, res) => {
    try {
        const foto_url = req.file ? `/uploads/${req.file.filename}` : null;
        await Plant.create({ ...req.body, foto_url });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getMyPlants = async (req, res) => {
    try {
        const plants = await Plant.getByUser(req.params.usuario_id);
        res.json(plants);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar herbario" });
    }
};