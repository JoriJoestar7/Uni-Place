document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:3000/api";

    const token = localStorage.getItem("uniplace_token");
    const userRaw = localStorage.getItem("uniplace_user");

    if (!token || !userRaw) {
        window.location.href = "auth.html";
        return;
    }

    const user = JSON.parse(userRaw);

    if (user.role !== "entrepreneur") {
        window.location.href = "dashboard.html";
        return;
    }

    const cursorGlow = document.querySelector(".cursor-glow");
    const businessForm = document.getElementById("businessForm");
    const businessMessage = document.getElementById("businessMessage");
    const businessStatusBox = document.getElementById("businessStatusBox");
    const businessStatusText = document.getElementById("businessStatusText");
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutBtnForm = document.getElementById("logoutBtnForm");

    document.addEventListener("mousemove", (event) => {
        if (!cursorGlow) return;

        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    checkExistingBusiness();

    businessForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const businessName = document.getElementById("businessName").value.trim();
        const category = document.getElementById("category").value.trim();
        const description = document.getElementById("description").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const email = document.getElementById("businessEmail").value.trim();
        const instagram = document.getElementById("instagram").value.trim();
        const website = document.getElementById("website").value.trim();
        const location = document.getElementById("location").value.trim();

        if (!businessName || !category || !description || !phone) {
            showMessage("Completa los campos obligatorios marcados con *.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/business/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    businessName,
                    category,
                    description,
                    phone,
                    email,
                    instagram,
                    website,
                    location
                })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo registrar el emprendimiento.");
                return;
            }

            showMessage("Emprendimiento registrado correctamente. Redirigiendo...", true);

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 900);

        } catch (error) {
            console.error("BUSINESS_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    if (logoutBtnForm) {
        logoutBtnForm.addEventListener("click", logout);
    }

    async function checkExistingBusiness() {
        try {
            const response = await fetch(`${API_URL}/business/me`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.status === 404) {
                return;
            }

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo verificar el emprendimiento.");
                return;
            }

            businessForm.classList.add("hidden");
            businessStatusBox.classList.remove("hidden");

            businessStatusText.textContent = `Tu emprendimiento "${data.business.business_name}" ya fue registrado y actualmente está en estado "${data.business.status}".`;

        } catch (error) {
            console.error("CHECK_BUSINESS_ERROR:", error);
            showMessage("No se pudo verificar si ya tienes un emprendimiento registrado.");
        }
    }

    function showMessage(text, success = false) {
        businessMessage.textContent = text;
        businessMessage.classList.toggle("success", success);
    }

    function setLoading(isLoading) {
        const button = businessForm.querySelector("button[type='submit']");

        if (!button) return;

        button.disabled = isLoading;
        button.textContent = isLoading ? "Enviando..." : "Enviar registro";
    }

    function logout() {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        window.location.href = "auth.html";
    }
});