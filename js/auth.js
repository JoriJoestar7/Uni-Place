document.addEventListener("DOMContentLoaded", () => {
    const cursorGlow = document.querySelector(".cursor-glow");

    document.addEventListener("mousemove", (event) => {
        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    const tabButtons = document.querySelectorAll(".tab-btn");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const loginMessage = document.getElementById("loginMessage");
    const registerMessage = document.getElementById("registerMessage");

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedTab = button.dataset.tab;

            tabButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            if (selectedTab === "login") {
                loginForm.classList.remove("hidden");
                registerForm.classList.add("hidden");
            } else {
                registerForm.classList.remove("hidden");
                loginForm.classList.add("hidden");
            }

            loginMessage.textContent = "";
            registerMessage.textContent = "";
        });
    });

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!email || !password) {
            showMessage(loginMessage, "Completa todos los campos para continuar.");
            return;
        }

        localStorage.setItem("uniplace_user", JSON.stringify({
            email,
            name: email.split("@")[0]
        }));

        showMessage(loginMessage, "Acceso correcto. Redirigiendo...", true);

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 650);
    });

    registerForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value.trim();
        const confirmPassword = document.getElementById("registerConfirmPassword").value.trim();

        if (!name || !email || !password || !confirmPassword) {
            showMessage(registerMessage, "Completa todos los campos para crear tu cuenta.");
            return;
        }

        if (password.length < 6) {
            showMessage(registerMessage, "La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage(registerMessage, "Las contraseñas no coinciden.");
            return;
        }

        localStorage.setItem("uniplace_user", JSON.stringify({
            name,
            email
        }));

        showMessage(registerMessage, "Cuenta creada correctamente. Redirigiendo...", true);

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 650);
    });

    function showMessage(element, text, success = false) {
        element.textContent = text;
        element.classList.toggle("success", success);
    }
});