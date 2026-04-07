async function cargarDatosPerfil() {
    // Obtener el ID del usuario de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const perfilId = urlParams.get('id');

    if (!perfilId) {
        window.location.href = 'menu.html';
        return;
    }

    try {
        const res = await fetch(`/api/usuarios/perfil/${perfilId}`);
        const data = await res.json();

        if (data.error) {
            document.getElementById('user-name').innerText = "Usuario no encontrado";
            return;
        }

        // Llenar datos básicos con protección contra 'null'
        document.getElementById('user-name').innerText = data.usuario.username;
        
        const fotoPerfil = (data.usuario.foto_perfil && data.usuario.foto_perfil !== 'null')
            ? data.usuario.foto_perfil 
            : `https://api.dicebear.com/7.x/bottts/svg?seed=${data.usuario.username}`;
        
        document.getElementById('user-foto').src = fotoPerfil;
        document.getElementById('user-bio').innerText = data.usuario.biografia || "Sin biografía aún.";

        // Llenar la cuadrícula de publicaciones
        const grid = document.getElementById('grid-posts');
        grid.innerHTML = "";
        
        if (!data.publicaciones || data.publicaciones.length === 0) {
            grid.innerHTML = "<p style='grid-column: span 3; text-align:center; color:#888; margin-top: 20px;'>Este usuario aún no tiene brotes publicados.</p>";
        } else {
            data.publicaciones.forEach(post => {
                // Validación de imagen del post para evitar error 404/null
                const imgUrl = (post.image_url && post.image_url !== 'null')
                    ? post.image_url
                    : 'https://via.placeholder.com/300?text=Appiu+Brote';

                grid.innerHTML += `<img src="${imgUrl}" class="grid-item" alt="Brote de ${data.usuario.username}">`;
            });
        }

    } catch (error) {
        console.error("Error al cargar perfil externo:", error);
    }
}

// Ejecutar al cargar
cargarDatosPerfil();