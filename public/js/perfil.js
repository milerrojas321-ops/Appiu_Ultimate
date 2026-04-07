// --- CONFIGURACIÓN INICIAL (Appiu Perfil) ---
const userLogueado = JSON.parse(localStorage.getItem("user"));

// Si no hay usuario, forzar login
if (!userLogueado) {
    window.location.href = "login.html";
}

// Variable global para el post que se está gestionando
let currentActivePostId = null;

// --- FUNCIONES PRINCIPALES DE CARGA ---

async function inicializarVista() {
    console.log("Cargando jardín de Appiu...");
    try {
        // 1. Cargar datos del perfil (seguidores, bio, etc)
        // Asegúrate de que esta ruta en server.js devuelva TODO (counts, bio, nombre_completo, etc)
        const resUser = await fetch(`/api/usuarios/${userLogueado.id}`);
        const info = await resUser.json();

        if (info && !info.error) {
            actualizarInterfazUsuario(info);
            // Llenar el formulario de edición con los datos actuales
            llenarFormularioEdicion(info);
        } else {
            console.error("Error obteniendo info de usuario:", info.error);
        }

        // 2. Cargar sus publicaciones (Brotes)
        await cargarMisPublicaciones();

    } catch (e) {
        console.error("Error crítico cargando perfil:", e);
    }
}

// Función auxiliar para actualizar la interfaz con datos frescos
function actualizarInterfazUsuario(info) {
    document.getElementById('username-display').innerText = `@${info.username}`;
    document.getElementById('nombre-completo').innerText = info.nombre_completo || info.username;
    document.getElementById('bio-text').innerText = info.biografia || "Cultivando mi historia verde... 🌿";
    
    // Contadores reales de la base de datos
    document.getElementById('count-seguidores').innerText = info.seguidores_count || 0;
    document.getElementById('count-seguidos').innerText = info.seguidos_count || 0;
    
    // LÓGICA DE LA FOTO:
    // Si la foto empieza con 'http', se usa tal cual. 
    // Si es solo un nombre de archivo (ej: 'perfil-123.jpg'), le ponemos el prefijo /uploads/
    let urlFoto = `https://api.dicebear.com/7.x/bottts/svg?seed=${info.username}`; // Default
    
    if (info.foto_perfil && info.foto_perfil !== 'null' && info.foto_perfil !== '') {
        urlFoto = info.foto_perfil.startsWith('http') 
                  ? info.foto_perfil 
                  : `/uploads/${info.foto_perfil}`;
    }
    
    document.getElementById('pfp-grande').src = urlFoto;
}

// Carga y renderiza la cuadrícula de publicaciones
async function cargarMisPublicaciones() {
    const grid = document.getElementById('grid-publicaciones');
    grid.innerHTML = "<p style='text-align:center; color:#888; padding:20px;'>Cargando brotes...</p>";

    try {
        const resPosts = await fetch(`/api/publicaciones/usuario/${userLogueado.id}`);
        const posts = await resPosts.json();
        
        document.getElementById('count-posts').innerText = posts.length;
        grid.innerHTML = ""; // Limpiar skeletons/mensajes

        if (posts.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: span 3; text-align:center; color:#888; padding:50px; background:white; border-radius:16px;">
                    <i class="fa-solid fa-seedling" style="font-size:3rem; color: #ccd5d0; margin-bottom:15px; display:block;"></i>
                    Este jardín aún no tiene brotes publicados. <br> ¡Comparte tu primera planta en Inicio!
                </div>
            `;
            return;
        }

        posts.forEach(p => {
            // Validación de imagen del post
            const imgPost = (p.image_url && p.image_url !== 'null' && p.image_url !== '') 
                            ? p.image_url 
                            : 'https://via.placeholder.com/300?text=Appiu+Brote';
            
            grid.innerHTML += `
                <div class="gallery-item" onclick="verDetallePost(${p.id})">
                    <img src="${imgPost}" alt="Brote de ${userLogueado.username}">
                    <div class="gallery-overlay">
                        <span><i class="fa-solid fa-heart"></i> ${p.likes || 0}</span>
                        <div class="overlay-options" onclick="abrirOpcionesPost(event, ${p.id})">
                            <i class="fa-solid fa-ellipsis"></i>
                        </div>
                    </div>
                </div>
            `;
        });

    } catch (e) {
        console.error("Error cargando publicaciones:", e);
        grid.innerHTML = "<p style='color:red; text-align:center;'>Error al conectar con el servidor.</p>";
    }
}

// --- GESTIÓN DE MODAL Y EDICIÓN (Mejorado) ---

function abrirModalEdicion() {
    document.getElementById('modal-edit').classList.add('active');
}

function cerrarModalEdicion() {
    document.getElementById('modal-edit').classList.remove('active');
}

function llenarFormularioEdicion(info) {
    document.getElementById('edit-username').value = info.username;
    document.getElementById('edit-nombre').value = info.nombre_completo || "";
    document.getElementById('edit-bio').value = info.biografia || "";
}

// Manejar el submit del formulario de edición
document.getElementById('form-edit-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const saveBtn = e.target.querySelector('.btn-save-changes');
    const originalText = saveBtn.innerText;
    
    saveBtn.innerText = "Guardando cambios...";
    saveBtn.disabled = true;

    try {
        // Asegúrate de que esta ruta '/api/usuarios/actualizar/:id' funcione en tu server.js
        const res = await fetch(`/api/usuarios/actualizar/${userLogueado.id}`, {
            method: 'POST', // Usamos POST porque enviamos FormData (con foto)
            body: formData
        });
        
        const result = await res.json();
        
        if (result.success) {
            // Actualizar el localStorage si cambió el username o la foto
            const updatedUser = { ...userLogueado };
            if (result.nuevoUsername) updatedUser.username = result.nuevoUsername;
            if (result.nuevaFoto) updatedUser.foto_perfil = result.nuevaFoto;
            localStorage.setItem("user", JSON.stringify(updatedUser));

            alert("Tu jardín ha sido actualizado ✅");
            cerrarModalEdicion();
            inicializarVista(); // Recargar todo con datos frescos
        } else {
            alert(`Error: ${result.error || "No se pudo actualizar"}`);
        }
    } catch (err) {
        console.error("Error actualizando perfil:", err);
        alert("Ocurrió un error en la conexión");
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
});

// Listener para el input de foto rápido (el ícono de cámara)
document.getElementById('edit-foto-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('foto_perfil', file);

    // Mismo envío pero solo para la foto
    try {
        document.getElementById('pfp-grande').style.opacity = '0.5';
        const res = await fetch(`/api/usuarios/actualizar/${userLogueado.id}`, {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if (result.success) {
            inicializarVista(); // Recargar para ver la nueva foto
        }
    } catch (err) { console.error(err); }
    finally { document.getElementById('pfp-grande').style.opacity = '1'; }
});

// --- FUNCIONES DE BORRADO DE PUBLICACIONES ---

function abrirOpcionesPost(event, postId) {
    // Evitar que el click abra el detalle del post
    if (event) event.stopPropagation();
    
    currentActivePostId = postId;
    const menu = document.getElementById('postOptionsMenu');
    menu.classList.add('active');
}

function cerrarOpcionesPost() {
    const menu = document.getElementById('postOptionsMenu');
    menu.classList.remove('active');
    currentActivePostId = null;
}

// Listener para confirmar eliminar brote
document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
    if (!currentActivePostId) return;

    if (!confirm("¿Estás seguro de que quieres eliminar este brote? Esta acción no se puede deshacer. 🛑")) {
        cerrarOpcionesPost();
        return;
    }

    try {
        // Asegúrate de crear esta ruta DELETE en server.js: '/api/publicaciones/:id'
        const response = await fetch(`/api/publicaciones/${currentActivePostId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userLogueado.id }) // Por seguridad
        });
        
        const data = await response.json();

        if (data.success) {
            alert("Brote eliminado correctamente 🌿");
            cerrarOpcionesPost();
            await cargarMisPublicaciones(); // Recargar la cuadrícula
        } else {
            alert(`Error: ${data.error || "No se pudo eliminar"}`);
        }
    } catch (e) {
        console.error("Error eliminando post:", e);
        alert("Error de conexión");
    }
});

// --- OTRAS FUNCIONES (Skeletons/Detalle) ---

function verDetallePost(postId) {
    // Implementar lógica si tienes una vista de detalle de post
    console.log("Ver detalle del post:", postId);
    // location.href = `brote.html?id=${postId}`;
}

// Funciones para ver listas (puedes implementar modales más adelante)
function verSeguidores() { console.log("Ver seguidores"); }
function verSeguidos() { console.log("Ver seguidos"); }

// Logout de Appiu
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

// --- INICIALIZACIÓN ---
inicializarVista();