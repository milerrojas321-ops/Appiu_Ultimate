const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Tu usuario de MySQL
    password: '',      // Tu contraseña
    database: 'appiu_bd', // El nombre de la BD que creaste
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool.promise();






// -- ============================================================
// -- SCRIPT DE RECREACIÓN COMPLETA PARA appiu_bd
// -- Ejecutar en phpMyAdmin para limpiar y recrear la estructura.
// -- ============================================================

// -- 1. Desactivar revisión de seguridad para borrar tablas en cascada
// SET FOREIGN_KEY_CHECKS = 0;

// -- 2. Eliminar tablas antiguas si existen (para empezar de cero)
// DROP TABLE IF EXISTS `notificaciones`;
// DROP TABLE IF EXISTS `post_likes`;
// DROP TABLE IF EXISTS `likes`;
// DROP TABLE IF EXISTS `comentarios`;
// DROP TABLE IF EXISTS `seguidores`;
// DROP TABLE IF EXISTS `coleccion_plantas`;
// DROP TABLE IF EXISTS `posts`;
// DROP TABLE IF EXISTS `users`;
// -- Por limpieza, borramos también las tablas con guiones o en inglés si existen
// DROP TABLE IF EXISTS `post-likes`;
// DROP TABLE IF EXISTS `user`;
// DROP TABLE IF EXISTS `comments`;

// -- 3. Reactivar revisión de seguridad
// SET FOREIGN_KEY_CHECKS = 1;

// -- ============================================================
// -- CREACIÓN DE TABLAS (Ordenado para respetar Foreign Keys)
// -- ============================================================

// -- A. Tabla de Usuarios (La base de todo) - Ref: image_3.png
// CREATE TABLE `users` (
//   `id` int(11) NOT NULL AUTO_INCREMENT,
//   `username` varchar(50) NOT NULL,
//   `email` varchar(100) NOT NULL,
//   `password` varchar(255) NOT NULL,
//   `is_expert` tinyint(1) DEFAULT 0,
//   `expert_bio` text DEFAULT NULL,
//   `status` enum('pending','verified') DEFAULT 'pending',
//   `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
//   `foto_perfil` varchar(255) DEFAULT NULL,
//   PRIMARY KEY (`id`),
//   UNIQUE KEY `email` (`email`) -- Evita correos duplicados
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

// -- B. Tabla de Posts (Publicaciones) - Ref: image_6.png
// CREATE TABLE `posts` (
//   `id` int(11) NOT NULL AUTO_INCREMENT,
//   `user_id` int(11) DEFAULT NULL, -- Relación con users.id
//   `username` varchar(50) DEFAULT NULL,
//   `content` text NOT NULL,
//   `plant_name` varchar(100) DEFAULT NULL,
//   `image_url` varchar(255) DEFAULT NULL,
//   `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
//   `likes` int(11) DEFAULT 0,
//   PRIMARY KEY (`id`),
//   KEY `user_id` (`user_id`),
//   CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

// -- C. Tabla de Comentarios (Sincronizada con server.js) - Ref: image_9.png
// CREATE TABLE `comentarios` (
//   `id` int(11) NOT NULL AUTO_INCREMENT,
//   `post_id` int(11) NOT NULL, -- Relación con posts.id
//   `user_id` int(11) NOT NULL, -- Relación con users.id
//   `username` varchar(255) NOT NULL,
//   `texto` text NOT NULL,
//   `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
//   PRIMARY KEY (`id`),
//   KEY `post_id` (`post_id`),
//   KEY `user_id` (`user_id`),
//   CONSTRAINT `comentarios_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
//   CONSTRAINT `comentarios_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

// -- D. Tabla de Post-Likes (Interacciones rápidas) - Ref: image_5.png
// CREATE TABLE `post_likes` (
//   `id` int(11) NOT NULL AUTO_INCREMENT,
//   `user_id` int(11) NOT NULL, -- Relación con users.id
//   `post_id` int(11) NOT NULL, -- Relación con posts.id
//   `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
//   PRIMARY KEY (`id`),
//   UNIQUE KEY `user_post` (`user_id`, `post_id`), -- Evita likes duplicados del mismo usuario
//   KEY `post_id` (`post_id`),
//   CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
//   CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

// -- E. Tabla de Seguidores (Red Social) - Ref: image_4.png
// CREATE TABLE `seguidores` (
//   `id` int(11) NOT NULL AUTO_INCREMENT,
//   `id_seguidor` int(11) NOT NULL, -- Relación con users.id (quien sigue)
//   `id_seguido` int(11) NOT NULL,   -- Relación con users.id (a quien siguen)
//   `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
//   PRIMARY KEY (`id`),
//   UNIQUE KEY `seguidor_seguido` (`id_seguidor`, `id_seguido`), -- Evita seguimientos duplicados
//   KEY `id_seguido` (`id_seguido`),
//   CONSTRAINT `seguidores_ibfk_1` FOREIGN KEY (`id_seguidor`) REFERENCES `users` (`id`) ON DELETE CASCADE,
//   CONSTRAINT `seguidores_ibfk_2` FOREIGN KEY (`id_seguido`) REFERENCES `users` (`id`) ON DELETE CASCADE
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

// -- F. Tabla de Notificaciones - Ref: image_7.png
// CREATE TABLE `notificaciones` (
//   `id` int(11) NOT NULL AUTO_INCREMENT,
//   `id_receptor` int(11) NOT NULL, -- Relación con users.id
//   `id_emisor` int(11) NOT NULL,   -- Relación con users.id
//   `tipo` enum('like','follow','comment') NOT NULL,
//   `id_referencia` int(11) DEFAULT NULL, -- ID del post o comentario relacionado
//   `leido` tinyint(1) DEFAULT 0,
//   `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
//   PRIMARY KEY (`id`),
//   KEY `id_receptor` (`id_receptor`),
//   KEY `id_emisor` (`id_emisor`),
//   CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`id_receptor`) REFERENCES `users` (`id`) ON DELETE CASCADE,
//   CONSTRAINT `notificaciones_ibfk_2` FOREIGN KEY (`id_emisor`) REFERENCES `users` (`id`) ON DELETE CASCADE
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

// -- G. Tabla de Colección de Plantas (Herbario) - Ref: image_10.png
// CREATE TABLE `coleccion_plantas` (
//   `id` int(11) NOT NULL AUTO_INCREMENT,
//   `usuario_id` int(11) NOT NULL, -- Relación con users.id
//   `nombre_comun` varchar(100) NOT NULL,
//   `nombre_cientifico` varchar(100) DEFAULT NULL,
//   `apodo` varchar(50) DEFAULT NULL,
//   `fecha_adopcion` date DEFAULT NULL,
//   `estado_salud` enum('Saludable','Sedienta','Necesita Luz','Enferma') DEFAULT 'Saludable',
//   `foto_url` varchar(255) DEFAULT NULL,
//   `ultimo_riego` datetime DEFAULT current_timestamp(),
//   PRIMARY KEY (`id`),
//   KEY `usuario_id` (`usuario_id`),
//   CONSTRAINT `coleccion_plantas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

// -- H. Tabla 'likes' (Opcional, parece obsoleta frente a 'post_likes') - Ref: image_8.png
// -- Se incluye por fidelidad a las fotos, pero revisa si tu código la usa.
// CREATE TABLE `likes` (
//   `id` int(11) NOT NULL AUTO_INCREMENT,
//   `post_id` int(11) NOT NULL,
//   `user_id` int(11) NOT NULL,
//   `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
//   PRIMARY KEY (`id`),
//   KEY `post_id` (`post_id`),
//   KEY `user_id` (`user_id`),
//   CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
//   CONSTRAINT `likes_ibfk_2` WHERE `user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

// -- ============================================================
// -- FIN DEL SCRIPT
// -- ============================================================