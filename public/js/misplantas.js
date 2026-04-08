const user = JSON.parse(localStorage.getItem("user"));
const plantForm = document.getElementById('plantForm');
const plantsGrid = document.getElementById('plantsGrid');


// 1. Cargar Plantas desde BD
async function cargarMisPlantas() {
    try {
        const res = await fetch(`/api/plantas/usuario/${user.id}`);
        const plantas = await res.json();
        renderizarPlantas(plantas);
        actualizarStats(plantas.length);
    } catch (e) {
        console.error("Error cargando el jardín", e);
    }
}

// 2. Renderizar con Lógica de Cuidado
function renderizarPlantas(plantas) {
    plantsGrid.innerHTML = "";
    plantas.forEach(p => {
        // Lógica de salud (se mantiene igual)
        const salud = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
        const necesitaAgua = salud < 75;
        
        const card = document.createElement('div');
        card.className = `plant-card ${necesitaAgua ? 'alert-water' : ''}`;
        
        // CORRECCIÓN 1: Usar 'foto_url' que es el nombre en tu tabla coleccion_plantas
        // Cambio en la función renderizarPlantas
        const imgUrl = p.foto_url 
            ? (p.foto_url.startsWith('http') ? p.foto_url : `/uploads/${p.foto_url}`) 
            : '/img/default-plant.jpg';

        card.innerHTML = `
            <div class="card-image">
                <img src="${imgUrl}" onerror="this.src='/img/default-plant.jpg'">
                <div class="health-bar-container">
                    <div class="health-fill" style="width: ${salud}%"></div>
                </div>
            </div>
            <div class="card-content">
                <span class="type-tag">${p.categoria || 'Sin categoría'}</span>
                
                <h3>${p.nombre_comun || 'Planta sin nombre'}</h3>
                
                <div class="care-indicators">
                    <div class="ind ${necesitaAgua ? 'warning' : ''}">
                        <i class="fa-solid fa-droplet"></i> 
                        <span>${necesitaAgua ? 'Regar ya' : 'Hidratada'}</span>
                    </div>
                    <div class="ind">
                        <i class="fa-solid fa-calendar-day"></i>
                        <span>${p.fecha_adopcion ? new Date(p.fecha_adopcion).toLocaleDateString() : 'Reciente'}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-care" onclick="regarPlanta(${p.id})">Regar</button>
                    <button class="btn-delete" onclick="eliminarPlanta(${p.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        plantsGrid.appendChild(card);
    });
}


async function eliminarPlanta(id) {
    if (!confirm("¿Estás seguro de que quieres arrancar esta planta de tu jardín?")) return;

    try {
        // La URL debe incluir el prefijo '/api/plantas' definido en server.js
        const res = await fetch(`/api/plantas/eliminar/${id}`, {
            method: 'DELETE'
        });

        // Verificamos si la respuesta es exitosa antes de procesar el JSON
        if (res.ok) {
            const resultado = await res.json();
            alert("Planta eliminada correctamente");
            cargarMisPlantas(); // Recarga la cuadrícula para reflejar el cambio
        } else {
            const errorData = await res.json();
            alert("Error del servidor: " + (errorData.message || "No se pudo eliminar"));
        }
    } catch (e) {
        console.error("Error en la petición DELETE:", e);
        alert("No se pudo conectar con el servidor.");
    }
}

// 3. Manejo de Imagen y Formulario
const dropZone = document.getElementById('dropZone');
const plantImage = document.getElementById('plantImage');
const preview = document.getElementById('preview');

dropZone.onclick = () => plantImage.click();

const formData = new FormData();
formData.append('nombre', document.getElementById('plantName').value);
formData.append('tipo', document.getElementById('plantType').value);
formData.append('usuario_id', user.id);
// ESTE NOMBRE DEBE SER 'imagen'
formData.append('imagen', document.getElementById('plantImage').files[0]);

plantImage.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src = ev.target.result;
            preview.style.display = 'block';
            document.getElementById('preview-container').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
};

plantForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(plantForm);
    formData.append('usuario_id', user.id);

    try {
        const res = await fetch('/api/plantas/registrar', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            plantForm.reset();
            preview.style.display = 'none';
            document.getElementById('preview-container').style.display = 'flex';
            cargarMisPlantas();
        }
    } catch (err) { alert("Error al plantar"); }
};

// misplantas.js

function regarPlanta(id) {
    // Por ahora, simulamos el riego visualmente
    alert("¡Planta hidratada! 💧");
    
    // Aquí podrías añadir un fetch si quieres guardar la fecha de riego en la BD
    console.log("Regando planta con ID:", id);
    
    // Opcional: Recargar la lista para actualizar el estado visual
    cargarMisPlantas();
}

// misplantas.js
const botonesFiltro = document.querySelectorAll('.filter-btn'); // Asegúrate de que tengan esta clase en el HTML

botonesFiltro.forEach(boton => {
    boton.addEventListener('click', () => {
        const categoriaSeleccionada = boton.textContent.trim();
        const plantasFiltradas = todasLasPlantas.filter(p => {
            if (categoriaSeleccionada === 'Todas') return true;
            if (categoriaSeleccionada === 'Necesitan Agua') return (Math.random() * 100) < 75; // O tu lógica de salud
            return p.categoria === categoriaSeleccionada;
        });
        renderizarPlantas(plantasFiltradas);
    });
});


function actualizarStats(total) {
    document.getElementById('stats-text').innerText = `Tienes ${total} plantas bajo tu cuidado experto.`;
}

// Consejos dinámicos
const tips = [
    "No riegues al mediodía, el sol puede quemar las raíces.",
    "El vinagre blanco ayuda a combatir hongos en las hojas.",
    "Canta a tus plantas, el CO2 de tu voz les ayuda.",
    "Si las puntas están cafés, falta humedad ambiental."
];
document.getElementById('daily-tip').innerText = `Tip del día: ${tips[Math.floor(Math.random() * tips.length)]}`;

cargarMisPlantas();