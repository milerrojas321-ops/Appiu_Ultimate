document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem("user", JSON.stringify(data.user));
      alert("Bienvenido de nuevo, " + data.user.username + " ✅");
      window.location.href = "menu.html";
    } else {
      alert("Error: " + (data.message || "Credenciales incorrectas ❌"));
    }
  } catch (error) {
    console.error("Error en login:", error);
    alert("No se pudo conectar con el servidor ❌");
  }
});