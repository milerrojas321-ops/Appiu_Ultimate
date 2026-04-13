const Post = require('../models/postModel');

exports.getFeed = async (req, res) => {
    try {
        const rows = await Post.getAll(req.params.userId);
        
        // MAPEAMOS para agregar los prefijos /uploads/
        const rowsFormateadas = rows.map(post => {
            return {
                ...post,
                // Foto de la planta
                image_url: post.image_url 
                    ? (post.image_url.startsWith('/') ? post.image_url : `/uploads/${post.image_url}`) 
                    : null,
                // Foto de perfil del autor (user_pfp)
                user_pfp: post.user_pfp 
                    ? (post.user_pfp.startsWith('/') ? post.user_pfp : `/uploads/${post.user_pfp}`) 
                    : '/img/default-avatar.png' // Imagen por defecto si no tiene
            };
        });

        res.json(rowsFormateadas);
    } catch (error) {
        console.error("Error al formatear feed:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getUserPosts = async (req, res) => {
    try {
        const rows = await Post.getByUserId(req.params.id);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createPost = async (req, res) => {
    try {
        const { user_id, username, content, plant_name } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        await Post.create({ user_id, username, content, image_url, plant_name });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.handleLike = async (req, res) => {
    try {
        const result = await Post.toggleLike(req.params.id, req.body.user_id);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPostComments = async (req, res) => {
    try {
        const rows = await Post.getComments(req.params.id);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.saveComment = async (req, res) => {
    try {
        const { post_id, user_id, username, texto } = req.body;
        await Post.addComment(post_id, user_id, username, texto);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};