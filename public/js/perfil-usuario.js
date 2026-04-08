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
        const data = await res.json();

        if (data.error) return;

        const u = data.usuario;
        const posts = data.publicaciones;

        // Llenar interfaz
        document.getElementById('user-name').innerText = `@${u.username}`;
        document.getElementById('top-username').innerText = u.username;
        document.getElementById('user-bio').innerText = u.biografia;
        
        // Foto de perfil con validación local
        const pfp = document.getElementById('user-foto');
        pfp.src = u.foto_perfil;
        pfp.onerror = () => pfp.src = '/img/icono.jpg';

        // Expert Badge
        if(u.is_expert) document.getElementById('badge-expert').style.display = 'flex';

        // Stats
        document.getElementById('count-publicaciones').innerText = posts.length;
        document.getElementById('count-seguidores').innerText = u.seguidores_count;
        document.getElementById('count-seguidos').innerText = u.seguidos_count;

        // Botón Seguir
        const btn = document.getElementById('btn-follow-main');
        if (u.id == userLocal.id) {
            btn.style.display = 'none';
        } else {
            btn.innerText = u.loSigo > 0 ? "Siguiendo" : "Seguir";
            if(u.loSigo > 0) btn.classList.add('is-following');
            btn.onclick = (e) => ejecutarFollow(u.id);
        }

        // Cargar Galería
        const grid = document.getElementById('grid-posts');
        grid.innerHTML = "";
        
        if (posts.length === 0) {
            grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-seedling"></i><p>Aún no hay brotes compartidos</p></div>`;
        } else {
            posts.forEach(p => {
                let imgUrl = p.image_url;
                if(imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
                    imgUrl = `/uploads/${imgUrl}`;
                }
                grid.innerHTML += `
                    <div class="grid-item">
                        <img src="${imgUrl}" onerror="this.src='/img/brote-defecto.png'">
                    </div>`;
            });
        }

    } catch (error) {
        console.error("Error al cargar perfil:", error);
    }
}

async function ejecutarFollow(id) {
    try {
        await fetch('/api/usuarios/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seguidor_id: userLocal.id, seguido_id: id })
        });
        location.reload();
    } catch (e) { console.error(e); }
}

function switchTab(type) {
    // Lógica para cambiar entre galería e info si decides expandirlo
    console.log("Cambiando a:", type);
}

cargarPerfil();