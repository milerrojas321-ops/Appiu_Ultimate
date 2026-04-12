document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    // Apunta a la ruta de autenticación de tu servidor
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    
    const data = await res.json();

    if (res.ok && data.success) {
      // Guardamos el objeto de usuario en localStorage para usarlo en perfil.html o menu.html
      localStorage.setItem("user", JSON.stringify(data.user));
      alert("Bienvenido de nuevo, " + data.user.username + " ✅");
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);

      // Redirigir al menú principal
      window.location.href = "menu.html";
    } else {
      alert("Error: " + (data.message || "Credenciales incorrectas ❌"));
    }
  } catch (error) {
    console.error("Error en login:", error);
    alert("No se pudo conectar con el servidor ❌");
  }
});