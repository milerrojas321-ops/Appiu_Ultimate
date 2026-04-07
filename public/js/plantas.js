let todasLasPlantas = [];
const grid = document.getElementById('grid');

async function cargarDatos() {
    try {
        const res = await fetch('http://localhost:3650/api/plantas');
        todasLasPlantas = await res.json();
        mostrarPlantas(todasLasPlantas);
    } catch (e) {
        grid.innerHTML = "<h2>Error al conectar con el servidor</h2>";
    }
}

function mostrarPlantas(lista) {
    grid.innerHTML = lista.map(p => `
        <div class="plant-card" onclick="verDetalle(${p.id})">
            <img src="${p.imagen_url}">
            <div class="card-info">
                <h3>${p.nombre}</h3>
                <p><i class="fa-solid fa-tag"></i> ${p.categoria}</p>
            </div>
        </div>
    `).join('');
}

function verDetalle(id) {
    const p = todasLasPlantas.find(x => x.id === id);
    document.getElementById('modalImg').src = p.imagen_url;
    document.getElementById('modalTitulo').innerText = p.nombre;
    document.getElementById('modalDescripcion').innerText = p.descripcion;
    document.getElementById('careLuz').innerText = p.luz;
    document.getElementById('careRiego').innerText = p.riego;
    document.getElementById('careClima').innerText = p.clima;
    document.getElementById('careExtra').innerText = p.extra;
    document.getElementById('modal').style.display = 'block';
}

function filtrar() {
    const txt = document.getElementById('buscar').value.toLowerCase();
    mostrarPlantas(todasLasPlantas.filter(p => p.nombre.toLowerCase().includes(txt)));
}

function filtrarCategoria(cat, e) {
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    mostrarPlantas(cat === 'Todas' ? todasLasPlantas : todasLasPlantas.filter(p => p.categoria === cat));
}

function cerrar() { document.getElementById('modal').style.display = 'none'; }

cargarDatos();