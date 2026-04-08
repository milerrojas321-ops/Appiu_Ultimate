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
            // Actualizamos el localStorage con la info real de la DB
            localStorage.setItem("user", JSON.stringify(datosActualizados));
            
            // Actualizamos la UI
            document.getElementById("mini-username").innerText = `@${datosActualizados.username}`;
            
            let foto = datosActualizados.foto_perfil;
            if (foto && !foto.startsWith('/') && !foto.startsWith('http')) foto = `/uploads/${foto}`;
            document.getElementById("mini-pfp").src = foto || `https://api.dicebear.com/7.x/bottts/svg?seed=${datosActualizados.username}`;
        }
    } catch (e) {
        console.error("Error al sincronizar usuario:", e);
    }
}

// Llama a esta función al final de tu inicialización
sincronizarUsuario();

if (user) {
    let fotoUrl = user.foto_perfil;
    if (fotoUrl && !fotoUrl.startsWith('http') && !fotoUrl.startsWith('/uploads')) {
        fotoUrl = `/uploads/${fotoUrl}`;
    }
    
    document.getElementById("mini-pfp").src = fotoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
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
            // 1. Prioridad: Datos del JOIN -> Datos del post -> "Usuario"
            const nombreAutor = post.nombre_real || post.username || "Usuario";

            // 2. Lógica de la Foto de Perfil
            let fotoAutor = post.foto_real || post.foto_perfil;
            if (fotoAutor && !fotoAutor.startsWith('http') && !fotoAutor.startsWith('/')) {
                fotoAutor = `/uploads/${fotoAutor}`;
            }
            
            // Si tiene foto la usa, si no, usa el icono local (sin robots aleatorios)
            const imgFinal = fotoAutor ? fotoAutor : '/img/icono.jpg'; 
            const claseLikeIcon = post.loLikeo > 0 ? "fa-solid active-like" : "fa-regular";

            feed.innerHTML += `
            <article class="post-card" id="post-${post.id}">
                <div class="post-header" onclick="verPerfil(${post.user_id})" style="cursor:pointer;">
                    <img src="${imgFinal}" class="user-pfp" alt="${nombreAutor}">
                    <div>
                        <b style="font-size:0.95rem; color:var(--text);">${nombreAutor}</b>
                        <small style="color:var(--text-light); display:block; font-size:0.75rem; margin-top:2px;">
                            ${new Date(post.created_at).toLocaleDateString()}
                        </small>
                    </div>
                </div>
                <div class="post-image-container">
                    <img src="${post.image_url}" class="post-image">
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
    // Verificamos que existan la lista y el usuario logueado
    if (!lista || !user || !user.id) return; 

    try {
        // La URL debe ser exacta a como la definiste en server.js (/api/usuarios)
        const res = await fetch(`/api/usuarios/sugerencias/${user.id}`); 
        
        // --- VALIDACIÓN CRÍTICA ---
        // Si el servidor responde 404 (Not Found), nos detenemos aquí
        if (!res.ok) {
            console.warn("La ruta de sugerencias no respondió correctamente:", res.status);
            return;
        }

        const usuarios = await res.json();
        lista.innerHTML = ""; 

        // Si no hay usuarios en la base de datos
        if (usuarios.length === 0) {
            lista.innerHTML = "<p style='padding:10px; font-size:12px; color:#666;'>No hay sugerencias</p>";
            return;
        }

        usuarios.forEach(u => {
            let fotoFinal = u.foto_perfil;
            
            // Ajuste de ruta para imágenes locales
            if (fotoFinal && !fotoFinal.startsWith('http') && !fotoFinal.startsWith('/')) {
                fotoFinal = `/uploads/${fotoFinal}`;
            }

            const imagen = fotoFinal || '/img/icono.jpg'; 
            
            const textoBoton = u.loSigo > 0 ? "Siguiendo" : "Seguir";
            const claseBoton = u.loSigo > 0 ? "btn-followed" : "";

            lista.innerHTML += `
                <div class="user-suggest">
                    <div class="user-suggest-info" onclick="verPerfil(${u.id})" style="cursor:pointer;">
                        <img src="${imagen}" alt="${u.username}" onerror="this.src='/img/icono.jpg'">
                        <b>${u.username}</b>
                    </div>
                    <button class="btn-follow ${claseBoton}" onclick="followUser(event, ${u.id})">
                        ${textoBoton}
                    </button>
                </div>`;
        });
    } catch (e) { 
        // Este catch ahora solo atrapará errores reales de conexión, no errores de formato
        console.error("Error en cargarSugerencias:", e); 
    }
}


async function cargarNotificaciones() {
    const contenedor = document.getElementById('lista-notificaciones');
    // Validación de seguridad inicial
    if (!contenedor || !user || !user.id) return;

    try {
        // 1. URL corregida con el prefijo /api/usuarios
        const res = await fetch(`/api/usuarios/notificaciones/${user.id}`);
        
        // 2. Validación de respuesta para evitar error de "Unexpected token <"
        if (!res.ok) {
            console.warn("No se pudieron cargar las notificaciones:", res.status);
            return;
        }

        const notis = await res.json();

        if(notis.length === 0) {
            contenedor.innerHTML = `<p style="text-align:center; color:#bbb; font-size:0.8rem; padding:20px 0;">No hay actividad nueva.</p>`;
            return;
        }

        contenedor.innerHTML = "";
        notis.forEach(n => {
            // 3. Gestión de imagen de perfil (Prioriza local -> Fallback icono)
            let fotoEmi = n.foto_perfil;
            if (fotoEmi && !fotoEmi.startsWith('http') && !fotoEmi.startsWith('/')) {
                fotoEmi = `/uploads/${fotoEmi}`;
            }
            const fotoFinal = fotoEmi || '/img/icono.jpg';

            let texto = "";
            let iconoClass = "";
            
            // Lógica de tipos de notificación
            if(n.tipo === 'like') { 
                texto = "le dio me gusta a tu planta."; 
                iconoClass = "fa-heart active-like"; 
            } else if(n.tipo === 'comment') { 
                texto = "comentó tu publicación."; 
                iconoClass = "fa-comment"; 
            } else if(n.tipo === 'follow') { 
                texto = "comenzó a seguirte."; 
                iconoClass = "fa-user-plus"; 
            }

            contenedor.innerHTML += `
                <div class="noti-item">
                    <img src="${fotoFinal}" class="noti-pfp" onerror="this.src='/img/icono.jpg'">
                    <div class="noti-text">
                        <b>${n.nombre_emisor}</b> ${texto}
                        <span class="noti-time">${new Date(n.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <i class="fa-solid ${iconoClass}" style="margin-left:auto; font-size:0.8rem;"></i>
                </div>`;
        });
    } catch (e) { 
        console.error("Error en cargarNotificaciones:", e); 
    }
}

// --- EVENTOS Y OTROS ---
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

// menu.js
async function cargarComentarios(postId) {
    currentPostId = postId; 
    const list = document.getElementById('commentsList');
    const panel = document.getElementById('commentsPanel');
    
    if (!list || !panel) return;
    
    panel.classList.add('active'); 
    list.innerHTML = "<p style='text-align:center;'>Cargando comentarios...</p>";

    try {
        // 1. URL CORREGIDA: Debe coincidir con el router.get de publicaciones.js
        // Según tu server.js es: /api/publicaciones/:id/comentarios
        const res = await fetch(`/api/publicaciones/${postId}/comentarios`);
        
        if (!res.ok) throw new Error("Error en la respuesta");
        
        const comments = await res.json();
        list.innerHTML = "";

        if (comments.length === 0) {
            list.innerHTML = "<p style='text-align:center; color:#888; padding:20px;'>Aún no hay brotes en esta conversación. 🌱</p>";
            return;
        }

        comments.forEach(c => {
            // 2. RUTA DE IMAGEN: Usamos /uploads/ para que no de 404
            let foto = c.foto_perfil ? (c.foto_perfil.startsWith('/') ? c.foto_perfil : `/uploads/${c.foto_perfil}`) : '/img/icono.jpg';

            list.innerHTML += `
                <div style="display:flex; gap:10px; margin-bottom:15px; align-items: flex-start;">
                    <img src="${foto}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;" 
                         onerror="this.src='/img/icono.jpg'">
                    <div style="background:#f0f2f5; padding:10px; border-radius:15px; flex:1;">
                        <b style="font-size:0.85rem; color:green;">@${c.username || 'Usuario'}</b>
                        <p style="margin:2px 0 0 0; font-size:0.9rem;">${c.texto}</p>
                    </div>
                </div>`;
        });
        
        list.scrollTop = list.scrollHeight;
    } catch (e) {
        console.error("Error al cargar:", e);
        list.innerHTML = "<p style='text-align:center; color:red;'>Error al conectar con la raíz del servidor.</p>";
    }
}

// Añadimos 'event' como primer parámetro
async function enviarComentario(event, btn) {
    const texto = document.getElementById('comment-text').value;
    const user = JSON.parse(localStorage.getItem("user"));
    
    if(!texto) return;

    try {
        // 1. CAMBIO DE URL: Agregamos /publicaciones
        const res = await fetch('/api/publicaciones/comentarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                // 2. CAMBIO DE NOMBRES: Usamos los que espera tu controlador/tabla
                post_id: currentPostId, 
                user_id: user.id, 
                username: user.username, // Tu tabla pide el username
                texto: texto             // En la base de datos se llama 'texto'
            })
        });

        if (res.ok) {
            document.getElementById('comment-text').value = ""; 
            // 3. CAMBIO DE URL EN CARGAR: También debe llevar /publicaciones
            cargarComentarios(currentPostId); 
        } else {
            console.error("Error en la respuesta del servidor");
        }
    } catch (e) { 
        console.error("Error en el fetch:", e); 
    }
}

document.getElementById('form-publicar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = "Publicando..."; btn.disabled = true;

    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('username', user.username);
    formData.append('plant_name', document.getElementById('plant-name').value);
    formData.append('content', document.getElementById('post-content').value);
    formData.append('image', document.getElementById('image-file').files[0]);

    try {
        await fetch('/api/publicaciones/crear', { method: 'POST', body: formData });
        closeModal();
        e.target.reset();
        document.getElementById('file-name-display').innerText = "Ningún archivo seleccionado";
        cargarFeed();
    } catch(err) { console.error(err); }
    finally { btn.innerText = "Publicar en el Feed"; btn.disabled = false; }
});

function verPerfil(userId) {
    if(!user || !userId) return;
    window.location.href = (userId === user.id) ? "perfil.html" : `perfil-usuario.html?id=${userId}`;
}

async function followUser(event, seguidoId) {
    // Evita que el click haga otras cosas (como abrir el perfil)
    if (event) event.stopPropagation();
    
    const btn = event.target;
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) return alert("Debes iniciar sesión para seguir a alguien");

    try {
        const res = await fetch('/api/usuarios/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                seguidor_id: user.id, 
                seguido_id: seguidoId 
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.action === 'followed') {
                btn.innerText = "Siguiendo";
                btn.classList.add("btn-followed");
            } else {
                btn.innerText = "Seguir";
                btn.classList.remove("btn-followed");
            }
        }
    } catch (e) { 
        console.error("Error en el follow:", e); 
    }
}

function logout() { localStorage.clear(); window.location.href = "login.html"; }

// --- INICIALIZACIÓN ---
cargarFeed();
cargarSugerencias();
cargarNotificaciones();