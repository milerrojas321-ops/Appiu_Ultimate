const userLocal = JSON.parse(localStorage.getItem("user"));

async function cargarPerfil() {
    const urlParams = new URLSearchParams(window.location.search);
    const perfilId = urlParams.get('id');

    if (!perfilId || !userLocal) {
        window.location.href = 'menu.html';
        return;
    }

    try {
        const res = await fetch(`/api/usuarios/perfil-completo/${userLocal.id}/${perfilId}`);
        
        // Verificamos que la respuesta sea JSON válido
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
            console.error("Error: El servidor no envió JSON.");
            return;
        }

        const data = await res.json();
        if (data.error) return;

        const u = data.usuario;
        const posts = data.publicaciones;

        // --- LLENAR TEXTOS ---
        document.getElementById('user-name').innerText = `@${u.username}`;
        document.getElementById('top-username').innerText = u.username;
        document.getElementById('user-bio').innerText = u.biografia || "Sin biografía";
        
        // --- CORRECCIÓN DE FOTO DE PERFIL ---
        const pfp = document.getElementById('user-foto');
        let fotoPerfilUrl = u.foto_perfil;

        if (fotoPerfilUrl) {
            // Si la foto no es una URL externa, le ponemos el prefijo de tu carpeta uploads
            if (!fotoPerfilUrl.startsWith('http') && !fotoPerfilUrl.startsWith('/')) {
                fotoPerfilUrl = `/uploads/${fotoPerfilUrl}`;
            }
        } else {
            fotoPerfilUrl = '/img/icono.jpg'; // Imagen por defecto
        }
        
        pfp.src = fotoPerfilUrl;
        // Si el archivo físico no existe en la carpeta, usamos el respaldo
        pfp.onerror = () => { pfp.src = '/img/icono.jpg'; };

        // Stats
        document.getElementById('count-publicaciones').innerText = posts.length;
        document.getElementById('count-seguidores').innerText = u.seguidores_count || 0;
        document.getElementById('count-seguidos').innerText = u.seguidos_count || 0;

        // --- CORRECCIÓN DE IMÁGENES EN LA CUADRÍCULA (POSTS) ---
        const grid = document.getElementById('grid-posts');
        grid.innerHTML = "";
        
        if (posts.length === 0) {
            grid.innerHTML = `<div class="empty-state"><p>No hay brotes aún</p></div>`;
        } else {
            posts.forEach(p => {
                let postImg = p.image_url;
                
                // Aplicamos la misma lógica de rutas que en la foto de perfil
                if (postImg && !postImg.startsWith('http') && !postImg.startsWith('/')) {
                    postImg = `/uploads/${postImg}`;
                }

                grid.innerHTML += `
                    <div class="grid-item">
                        <img src="${postImg || '/img/brote-defecto.png'}" 
                             onerror="this.src='/img/brote-defecto.png'" 
                             style="width: 100%; height: 100%; object-fit: cover;">
                    </div>`;
            });
        }

        // Lógica del botón seguir
        const btn = document.getElementById('btn-follow-main');
        if (btn) {
            btn.innerText = data.loSigo > 0 ? "Siguiendo" : "Seguir";
            if (data.loSigo > 0) btn.classList.add('is-following');
            btn.onclick = () => ejecutarFollow(perfilId, btn);
        }

    } catch (error) {
        console.error("Error al cargar perfil:", error);
    }
}

async function ejecutarFollow(id, btn) {
    try {
        const res = await fetch('/api/usuarios/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seguidor_id: userLocal.id, seguido_id: id })
        });
        const d = await res.json();
        if (d.success) {
            btn.innerText = d.action === 'followed' ? "Siguiendo" : "Seguir";
            btn.classList.toggle('is-following', d.action === 'followed');
        }
    } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', cargarPerfil);