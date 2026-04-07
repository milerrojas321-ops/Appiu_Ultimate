// 1. VALIDAR SESIÓN
const user = JSON.parse(localStorage.getItem("user"));
if (!user) {
    window.location.href = "login.html";
}

// 2. PREVISUALIZACIÓN DE ARCHIVOS
const archivoInput = document.getElementById("archivo");
const previewContainer = document.getElementById("preview");

archivoInput.addEventListener("change", () => {
    const file = archivoInput.files[0];
    if (!file) return;

    previewContainer.innerHTML = ""; // Limpiar mensaje previo

    const fileURL = URL.createObjectURL(file);

    if (file.type.startsWith("image")) {
        const img = document.createElement("img");
        img.src = fileURL;
        previewContainer.appendChild(img);
    } 
    else if (file.type.startsWith("video")) {
        const video = document.createElement("video");
        video.src = fileURL;
        video.controls = true;
        previewContainer.appendChild(video);
    }
});

// 3. ENVIAR PUBLICACIÓN
document.getElementById("form-publicar").addEventListener("submit", async (e) => {
    e.preventDefault();

    const titulo = document.getElementById("titulo").value;
    const descripcion = document.getElementById("descripcion").value;
    const ubicacion = document.getElementById("ubicacion").value;
    const archivo = archivoInput.files[0];

    // Usamos FormData para enviar el archivo real al servidor
    const formData = new FormData();
    formData.append("usuario_id", user.id);
    formData.append("username", user.username);
    formData.append("titulo", titulo);
    formData.append("descripcion", descripcion);
    formData.append("ubicacion", ubicacion);
    formData.append("archivo", archivo);

    try {
        const res = await fetch("/api/publicaciones", {
            method: "POST",
            body: formData // No enviar headers de Content-Type, el navegador lo hace solo con FormData
        });

        const data = await res.json();

        if (data.success) {
            alert("¡Brote publicado con éxito! 🌿");
            window.location.href = "menu.html";
        } else {
            alert("Error al publicar: " + data.message);
        }
    } catch (error) {
        console.error("Error en la publicación:", error);
        alert("Hubo un problema al conectar con el servidor.");
    }
});