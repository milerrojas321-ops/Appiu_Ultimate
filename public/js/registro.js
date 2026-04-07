document.getElementById("registroForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const expert_bio = document.getElementById("expert_bio").value;
    const fotoInput = document.getElementById("foto_perfil");

    // Validación de seguridad básica
    if (fotoInput.files.length === 0) {
        alert("Por favor, selecciona una foto de perfil para que la comunidad te reconozca.");
        return;
    }

    // Usamos FormData para el envío de archivos (imágenes)
    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("expert_bio", expert_bio);
    formData.append("foto_perfil", fotoInput.files[0]);

    try {
        const res = await fetch("/auth/registro", {
            method: "POST",
            // No establecemos Content-Type manualmente, el navegador lo hace por nosotros con FormData
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            alert("¡Registro exitoso! Ya puedes iniciar sesión con tu nueva cuenta 🌿");
            window.location.href = "login.html";
        } else {
            alert("Error: " + (data.message || "No se pudo completar el registro. Intenta con otro usuario."));
        }
    } catch (err) {
        console.error("Error de conexión:", err);
        alert("Parece que hay un problema con el servidor ❌");
    }
});