// --- CONFIGURACIÓN INICIAL ---
const user = JSON.parse(localStorage.getItem("user"));
const ICONO_DEFECTO = '/img/icono.jpg';
let currentPostId = null;

async function sincronizarUsuario() {
    const userLocal = JSON.parse(localStorage.getItem("user"));
    if (!userLocal) return;

    try {
        const res = await fetch(`/api/usuarios/${userLocal.id}`);
        const datosActualizados = await res.json();

        if (datosActualizados && !datosActualizados.error) {
            localStorage.setItem("user", JSON.stringify(datosActualizados));
            document.getElementById("mini-username").innerText = `@${datosActualizados.username}`;
            
            // El controlador ya debe enviar la foto procesada
            document.getElementById("mini-pfp").src = datosActualizados.foto_perfil || ICONO_DEFECTO;
        }
    } catch (e) {
        console.error("Error al sincronizar usuario:", e);
    }
}

sincronizarUsuario();

if (user) {
    document.getElementById("mini-pfp").src = user.foto_perfil || ICONO_DEFECTO;
}

// --- FUNCIONES DE INTERFAZ ---
function openModal() { document.getElementById('modalPost').classList.add('open'); }
function closeModal() { document.getElementById('modalPost').classList.remove('open'); }
function closeComments() { document.getElementById('commentsPanel').classList.remove('active'); }

document.getElementById('image-file').addEventListener('change', function(e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : "Ningún archivo seleccionado";
    document.getElementById('file-name-display').innerText = fileName;
});

// --- LÓGICA DE DATOS (API) ---
async function cargarFeed() {
    const feed = document.getElementById("feed-dinamico");
    try {
        const res = await fetch(`/api/publicaciones/${user.id}`); 
        const posts = await res.json();
        feed.innerHTML = "";

        if(posts.length === 0) {
            feed.innerHTML = `<p style="text-align:center; color:#888; margin-top:50px;">Aún no hay brotes.</p>`;
            return;
        }

        posts.forEach(post => {
            // USAMOS LAS VARIABLES QUE ENVÍA EL CONTROLADOR (ya vienen con /uploads/)
            const imgFinal = post.user_pfp || ICONO_DEFECTO; 
            const claseLikeIcon = post.loLikeo > 0 ? "fa-solid active-like" : "fa-regular";

            feed.innerHTML += `
            <article class="post-card" id="post-${post.id}">
                <div class="post-header" onclick="verPerfil(${post.user_id})" style="cursor:pointer;">
                    <img src="${imgFinal}" class="user-pfp" onerror="this.src='${ICONO_DEFECTO}'">
                    <div>
                        <b style="font-size:0.95rem; color:var(--text);">${post.user_name}</b>
                        <small style="color:var(--text-light); display:block; font-size:0.75rem; margin-top:2px;">
                            ${new Date(post.created_at).toLocaleDateString()}
                        </small>
                    </div>
                </div>
                <div class="post-image-container">
                    <img src="${post.image_url}" class="post-image" onerror="this.style.display='none'">
                </div>
                <div class="post-body">
                    <h4 style="color:var(--primary); font-weight:800;">🌿 ${post.plant_name}</h4>
                    <p>${post.content}</p>
                </div>
                <div class="post-footer">
                    <div class="interaction-item" onclick="darLike(event, ${post.id})">
                        <div class="btn-like-visual">
                            <i class="${claseLikeIcon} fa-heart"></i>
                        </div> 
                        <span id="count-${post.id}">${post.likes || 0}</span>
                    </div>
                    <div class="interaction-item" onclick="abrirComentarios(${post.id})">
                        <div class="btn-like-visual">
                            <i class="fa-solid fa-comment" style="color: #ccc;"></i>
                        </div>
                        Comentar
                    </div>
                </div>
            </article>`;
        });
    } catch (e) { console.error("Error cargando feed:", e); }
}

async function cargarSugerencias() {
    const lista = document.getElementById("lista-sugerencias");
    if (!lista || !user) return;

    try {
        const res = await fetch(`/api/usuarios/sugerencias/${user.id}`);
        const usuarios = await res.json();
        lista.innerHTML = ""; 

        usuarios.forEach(u => {
            const imagen = u.foto_perfil || ICONO_DEFECTO;
            const textoBoton = u.loSigo > 0 ? "Siguiendo" : "Seguir";
            const claseBoton = u.loSigo > 0 ? "btn-follow btn-followed" : "btn-follow";

            lista.innerHTML += `
                <div class="user-suggest" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div class="user-suggest-info" onclick="verPerfil(${u.id})" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <img src="${imagen}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.src='${ICONO_DEFECTO}'">
                        <div style="display: flex; flex-direction: column;">
                            <b style="font-size: 0.9em;">${u.username}</b>
                            <span style="font-size: 0.7em; color: #888;">Sugerencia</span>
                        </div>
                    </div>
                    <button class="${claseBoton}" onclick="followUser(event, ${u.id})">${textoBoton}</button>
                </div>`;
        });
    } catch (e) { console.error("Error en sugerencias:", e); }
}

async function cargarNotificaciones() {
    const contenedor = document.getElementById('lista-notificaciones');
    if (!contenedor || !user) return;

    try {
        const res = await fetch(`/api/usuarios/notificaciones/${user.id}`);
        if (!res.ok) return;

        const notis = await res.json();
        contenedor.innerHTML = notis.length === 0 ? `<p style="text-align:center; color:#bbb; padding:20px 0;">No hay actividad.</p>` : "";

        notis.forEach(n => {
            let texto = n.tipo === 'like' ? "le dio me gusta a tu planta." : n.tipo === 'comment' ? "comentó tu publicación." : "comenzó a seguirte.";
            let iconoClass = n.tipo === 'like' ? "fa-heart active-like" : n.tipo === 'comment' ? "fa-comment" : "fa-user-plus";

            contenedor.innerHTML += `
                <div class="noti-item">
                    <img src="${n.foto_perfil || ICONO_DEFECTO}" class="noti-pfp" onerror="this.src='${ICONO_DEFECTO}'">
                    <div class="noti-text">
                        <b>${n.nombre_emisor}</b> ${texto}
                        <span class="noti-time">${new Date(n.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <i class="fa-solid ${iconoClass}" style="margin-left:auto; font-size:0.8rem;"></i>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

async function darLike(event, postId) {
    const heartIcon = document.querySelector(`#post-${postId} .fa-heart`);
    const countSpan = document.getElementById(`count-${postId}`);
    try {
        const res = await fetch(`/api/publicaciones/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id })
        });
        const data = await res.json();
        if (data.success) {
            if (data.action === 'added') {
                heartIcon.classList.replace('fa-regular', 'fa-solid');
                heartIcon.classList.add('active-like');
                countSpan.innerText = parseInt(countSpan.innerText) + 1;
            } else {
                heartIcon.classList.replace('fa-solid', 'fa-regular');
                heartIcon.classList.remove('active-like');
                countSpan.innerText = parseInt(countSpan.innerText) - 1;
            }
        }
    } catch (e) { console.error(e); }
}

async function abrirComentarios(postId) {
    currentPostId = postId;
    document.getElementById('commentsPanel').classList.add('active');
    cargarComentarios(postId);
}

async function cargarComentarios(postId) {
    const list = document.getElementById('commentsList');
    try {
        const res = await fetch(`/api/publicaciones/comentarios/${postId}`);
        const comments = await res.json();
        list.innerHTML = comments.length === 0 ? "<p style='text-align:center; color:#888; padding:20px;'>Aún no hay brotes. 🌱</p>" : "";

        comments.forEach(c => {
            list.innerHTML += `
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <img src="${c.foto_perfil || ICONO_DEFECTO}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                    <div style="background:#f0f2f5; padding:10px; border-radius:15px; flex:1;">
                        <b style="font-size:0.85rem; color:green;">@${c.username}</b>
                        <p style="margin:2px 0 0 0; font-size:0.9rem;">${c.texto}</p>
                    </div>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

async function enviarComentario() {
    const texto = document.getElementById('comment-text').value;
    if(!texto) return;
    try {
        const res = await fetch('/api/publicaciones/comentarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: currentPostId, user_id: user.id, username: user.username, texto })
        });
        if (res.ok) {
            document.getElementById('comment-text').value = ""; 
            cargarComentarios(currentPostId); 
        }
    } catch (e) { console.error(e); }
}

// 1. Escuchar el evento submit del formulario
// 1. Buscamos el formulario primero
const formEditar = document.getElementById('form-edit-perfil');

// 2. Solo si el formulario existe (es decir, estamos en la página de editar perfil), ponemos el listener
if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target); 

        try {
            const response = await fetch(`/api/usuarios/${userLogueado.id}`, {
                method: 'PUT',
                body: formData 
            });

            const data = await response.json();

            if (data.success) {
                alert("¡Perfil actualizado con éxito! 🌿");
                const resActualizada = await fetch(`/api/usuarios/${userLogueado.id}`);
                const nuevoUsuario = await resActualizada.json();
                localStorage.setItem("user", JSON.stringify(nuevoUsuario));
                window.location.reload();
            } else {
                alert("Error al actualizar: " + data.error);
            }
        } catch (error) {
            console.error("Error en la petición:", error);
            alert("Hubo un problema al conectar con el servidor.");
        }
    });
}

function verPerfil(userId) {
    if(!user || !userId) return;
    window.location.href = (Number(userId) === Number(user.id)) ? "perfil.html" : `perfil-usuario.html?id=${userId}`;
}

async function followUser(event, seguidoId) {
    if (event) event.stopPropagation();
    try {
        const res = await fetch('/api/usuarios/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seguidor_id: user.id, seguido_id: seguidoId })
        });
        if (res.ok) {
            const data = await res.json();
            event.target.innerText = data.action === 'followed' ? "Siguiendo" : "Seguir";
            event.target.classList.toggle("btn-followed", data.action === 'followed');
        }
    } catch (e) { console.error(e); }
}

function logout() { localStorage.clear(); window.location.href = "login.html"; }

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarFeed();
    cargarSugerencias();
    cargarNotificaciones();
});