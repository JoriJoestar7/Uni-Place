document.addEventListener("DOMContentLoaded", () => {
    const API_URL = window.UNIPLACE_CONFIG?.apiBaseUrl || "https://uniplace.up.railway.app/api";

    const cursorGlow = document.querySelector(".cursor-glow");

    document.addEventListener("mousemove", (event) => {
        if (!cursorGlow) return;

        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    const tabButtons = document.querySelectorAll(".tab-btn");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const rememberMeInput = document.getElementById("rememberMe");

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

    loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const rememberMe = Boolean(rememberMeInput?.checked);

    if (!email || !password) {
        showMessage(loginMessage, "Completa todos los campos para continuar.");
        return;
    }

    try {
        setLoading(loginForm, true);

        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password, rememberMe })
        });

        const data = await response.json();

        console.log("LOGIN RESPONSE:", data);

        if (!response.ok || !data.ok) {
            if (data.requiresVerification === true) {
                localStorage.removeItem("uniplace_token");
                localStorage.removeItem("uniplace_user");
                localStorage.removeItem("uniplace_remember_me");
                localStorage.setItem("uniplace_pending_email", data.email || email);

                showMessage(loginMessage, "Debes verificar tu correo. Redirigiendo...");

                setTimeout(() => {
                    window.location.href = "verify-email.html";
                }, 700);

                return;
            }

            showMessage(loginMessage, data.message || "No se pudo iniciar sesión.");
            return;
        }

        localStorage.removeItem("uniplace_pending_email");

        localStorage.setItem("uniplace_token", data.token);
        localStorage.setItem("uniplace_user", JSON.stringify(data.user));
        localStorage.setItem("uniplace_remember_me", rememberMe ? "1" : "0");

        showMessage(loginMessage, "Acceso correcto. Redirigiendo...", true);

        setTimeout(() => {
            redirectByRole(data.user);
        }, 650);

    } catch (error) {
        console.error("LOGIN_FRONT_ERROR:", error);
        showMessage(loginMessage, "No se pudo conectar con el servidor.");
    } finally {
        setLoading(loginForm, false);
    }
});

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const role = document.getElementById("registerRole").value;
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

        try {
            setLoading(registerForm, true);

            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(registerMessage, data.message || "No se pudo crear la cuenta.");
                return;
            }

localStorage.removeItem("uniplace_token");
localStorage.removeItem("uniplace_user");
localStorage.removeItem("uniplace_remember_me");
localStorage.setItem("uniplace_pending_email", data.email || email);

showMessage(registerMessage, "Cuenta creada. Revisa tu correo para verificarla...", true);

setTimeout(() => {
    window.location.href = "verify-email.html";
}, 650);    

        } catch (error) {
            console.error("REGISTER_FRONT_ERROR:", error);
            showMessage(registerMessage, "No se pudo conectar con el servidor.");
        } finally {
            setLoading(registerForm, false);
        }
    });

    function saveSession(data) {
        localStorage.setItem("uniplace_token", data.token);
        localStorage.setItem("uniplace_user", JSON.stringify(data.user));
    }

    function showMessage(element, text, success = false) {
        element.textContent = text;
        element.classList.toggle("success", success);
    }

    function setLoading(form, isLoading) {
        const button = form.querySelector("button[type='submit']");

        if (!button) return;

        button.disabled = isLoading;

        if (form.id === "loginForm") {
            button.textContent = isLoading ? "Entrando..." : "Entrar";
        }

        if (form.id === "registerForm") {
            button.textContent = isLoading ? "Creando cuenta..." : "Crear cuenta";
        }
    }

function redirectByRole(user) {
    if (user.role === "admin") {
        window.location.href = "admin.html";
        return;
    }

    if (user.role === "entrepreneur") {
        window.location.href = "business-register.html";
        return;
    }

    if (user.role === "student" || user.role === "professor") {
        window.location.href = "dashboard.html";
        return;
    }

    window.location.href = "dashboard.html";
}
});
