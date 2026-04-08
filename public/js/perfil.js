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

// Función para obtener datos frescos de la DB
// perfil.js
async function cargarDatosPerfil() {
    const userLocal = JSON.parse(localStorage.getItem("user"));
    if (!userLocal) return;

    try {
        const response = await fetch(`/api/usuarios/${userLocal.id}`);
        const datosReales = await response.json();

        if (datosReales && !datosReales.error) {
            // USAR SELECTORES SEGUROS (Verifica que estos IDs existan en tu HTML)
            const elNombre = document.getElementById("nombre-usuario");
            const elBio = document.getElementById("bio-usuario");
            const laFoto = document.getElementById("foto-perfil-v");

            // Solo asignamos si el elemento existe en el HTML
            if (elNombre) elNombre.innerText = `@${datosReales.username}`;
            if (elBio) elBio.innerText = datosReales.expert_bio || "Me gustan las plantas en el hogar";
            
            if (laFoto) {
                let foto = datosReales.foto_perfil;
                if (foto && !foto.startsWith('http') && !foto.startsWith('/')) {
                    foto = `/uploads/${foto}`;
                }
                laFoto.src = foto || "/img/icono.jpg";
            }

            // Actualizamos el local para que el resto de la app se entere del cambio
            localStorage.setItem("user", JSON.stringify(datosReales));
        }
    } catch (error) {
        console.error("❌ Error al cargar datos:", error);
    }
}
// Ejecutar al cargar la página
window.onload = cargarDatosPerfil;

// Función auxiliar para actualizar la interfaz con datos frescos
function actualizarInterfazUsuario(info) {
    // 1. Nombres: Usamos username para el display y el título
    document.getElementById('username-display').innerText = `@${info.username}`;
    document.getElementById('nombre-completo').innerText = info.username; 
    
    // 2. Bio: Tu columna real se llama expert_bio
    document.getElementById('bio-text').innerText = info.expert_bio || "Cultivando mi historia verde... 🌿";
    
    // 3. Contadores: Ahora sí llegarán como seguidores_count y seguidos_count
    document.getElementById('count-seguidores').innerText = info.seguidores_count || 0;
    document.getElementById('count-seguidos').innerText = info.seguidos_count || 0;
    

    // 4. Foto de Perfil:
    let urlFoto = `https://api.dicebear.com/7.x/bottts/svg?seed=${info.username}`;
    
    if (info.foto_perfil && info.foto_perfil !== 'null') {
        // Si ya trae '/uploads/', lo usamos directo. Si no, se lo ponemos.
        urlFoto = info.foto_perfil.includes('/uploads/') 
            ? info.foto_perfil 
            : `/uploads/${info.foto_perfil}`;
    }
    
    const pfpGrande = document.getElementById('pfp-grande');
    if (pfpGrande) pfpGrande.src = urlFoto;

// IMPORTANTE: Limpiar posibles dobles barras por si acaso
    document.getElementById('pfp-grande').src = urlFoto.replace(/\/\/+/g, '/').replace('http:/', 'http://');
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
    document.getElementById('edit-bio').value = info.expert_bio || "";
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