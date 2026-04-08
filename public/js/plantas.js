let todasLasPlantas = [];
const grid = document.getElementById('grid');

const plantasIniciales = [
    { id: 1, nombre: "Monstera Deliciosa", categoria: "Interior", imagen_url: "/img/monstera.jpg", descripcion: "Famosa por sus hojas con agujeros, es la reina de la decoración.", luz: "Indirecta brillante", riego: "Cada 7-10 días", clima: "20°C - 30°C", extra: "Limpia sus hojas con un paño húmedo para que brille." },
    { id: 2, nombre: "Suculenta Echeveria", categoria: "Suculenta", imagen_url: "/img/suculentaecheverria.jpg", descripcion: "Parece una rosa de piedra, perfecta para espacios pequeños.", luz: "Sol directo", riego: "Muy poco (cada 15 días)", clima: "Cálido/Seco", extra: "No mojes sus hojas al regar para evitar hongos." },
    { id: 3, nombre: "Lavanda", categoria: "Exterior", imagen_url: "/img/lavanda.jpg", descripcion: "Famosa por su aroma relajante y sus flores púrpuras.", luz: "Pleno sol", riego: "Moderado", clima: "Templado", extra: "Atrae abejas y mariposas a tu jardín." },
    { id: 4, nombre: "Sansevieria", categoria: "Interior", imagen_url: "/img/sansevieria.jpg", descripcion: "Casi indestructible, purifica el aire de noche.", luz: "Baja a media", riego: "Mensual", clima: "Resistente", extra: "Ideal para dormitorios." },
    { id: 5, nombre: "Aloe Vera", categoria: "Medicinal", imagen_url: "/img/sabila.jpg", luz: "Mucha luz", riego: "Escaso", clima: "Cálido", extra: "Úsala para aliviar quemaduras solares." },
    { id: 6, nombre: "Helecho de Boston", categoria: "Interior", imagen_url: "/img/helechodeboston.jpg", descripcion: "Frondoso y elegante, ama la humedad.", luz: "Sombra parcial", riego: "Frecuente", clima: "Húmedo", extra: "Pulveriza agua en sus hojas a diario." },
    { id: 7, nombre: "Cactus de Navidad", categoria: "Suculenta", imagen_url: "/img/captusnavidad.jpg", descripcion: "Florece en invierno con colores vibrantes.", luz: "Indirecta", riego: "Moderado", clima: "Fresco", extra: "Florece mejor si pasa un poco de frío en otoño." },
    { id: 8, nombre: "Menta", categoria: "Medicinal", imagen_url: "/img/menta.jpg", descripcion: "Refrescante y fácil de cultivar en macetas.", luz: "Media", riego: "Abundante", clima: "Templado", extra: "Mantenla en maceta propia porque se expande rápido." },
    { id: 9, nombre: "Palo de Brasil", categoria: "Interior", imagen_url: "/img/palodebrasil.jpg", descripcion: "Símbolo de alegría que sigue la ruta del sol.", luz: "Sol directo", riego: "Frecuente", clima: "Cálido", extra: "Necesita mucho espacio para sus raíces." },
    { id: 11, nombre: "Romero", categoria: "Medicinal", imagen_url: "/img/romero.jpg", descripcion: "Arbusto aromático ideal para la cocina.", luz: "Pleno sol", riego: "Bajo", clima: "Seco/Cálido", extra: "Mejora la memoria y la concentración." },
    { id: 12, nombre: "Orquídea Phalaenopsis", categoria: "Interior", imagen_url: "/img/orquideapha.jpg", descripcion: "Flores sofisticadas que duran meses.", luz: "Filtrada", riego: "Por inmersión semanal", clima: "Estable", extra: "No uses tierra común, usa corteza de pino." },
    { id: 13, nombre: "Jade", categoria: "Suculenta", imagen_url: "/img/jade.jpg", descripcion: "Conocida como la planta de la abundancia.", luz: "Mucha luz", riego: "Bajo", clima: "Cálido", extra: "Puede vivir décadas y volverse un pequeño árbol." },
    { id: 14, nombre: "Buganvilla", categoria: "Exterior", imagen_url: "/img/buganvilla.jpg", descripcion: "Trepadora con colores espectaculares.", luz: "Máxima", riego: "Moderado", clima: "Cálido", extra: "Entre más sol reciba, más flores tendrá." },
    { id: 15, nombre: "Manzanilla", categoria: "Medicinal", imagen_url: "/img/manzanilla.jpg", descripcion: "Flores pequeñas tipo margarita con gran poder curativo.", luz: "Sol directo", riego: "Regular", clima: "Templado", extra: "Cosecha las flores para tus infusiones." }
];

function cargarDatos() {
    todasLasPlantas = plantasIniciales;
    mostrarPlantas(todasLasPlantas);
}

function mostrarPlantas(lista) {
    grid.innerHTML = lista.map(p => `
        <div class="plant-card" onclick="verDetalle(${p.id})">
            <div class="card-img-box">
                <img src="${p.imagen_url}">
                <span class="category-badge">${p.categoria}</span>
            </div>
            <div class="card-info">
                <h3>${p.nombre}</h3>
                <div class="quick-stats">
                    <span><i class="fa-solid fa-sun"></i> ${p.luz.split(' ')[0]}</span>
                    <span><i class="fa-solid fa-droplet"></i> ${p.riego.split(' ')[0]}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function verDetalle(id) {
    const p = todasLasPlantas.find(x => x.id === id);
    document.getElementById('modalImg').src = p.imagen_url;
    document.getElementById('modalTitulo').innerText = p.nombre;
    document.getElementById('modalTag').innerText = p.categoria;
    document.getElementById('modalDescripcion').innerText = p.descripcion;
    document.getElementById('careLuz').innerText = p.luz;
    document.getElementById('careRiego').innerText = p.riego;
    document.getElementById('careClima').innerText = p.clima;
    document.getElementById('careExtra').innerText = p.extra;
    document.getElementById('modal').style.display = 'flex';
}

function filtrar() {
    const txt = document.getElementById('buscar').value.toLowerCase();
    mostrarPlantas(todasLasPlantas.filter(p => p.nombre.toLowerCase().includes(txt)));
}

function filtrarCategoria(cat, e) {
    document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    if(cat === 'Todas') mostrarPlantas(todasLasPlantas);
    else mostrarPlantas(todasLasPlantas.filter(p => p.categoria === cat));
}

function cerrar() { document.getElementById('modal').style.display = 'none'; }

cargarDatos();