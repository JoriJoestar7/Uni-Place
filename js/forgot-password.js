document.addEventListener("DOMContentLoaded", () => {
    const API_URL = window.UNIPLACE_CONFIG?.apiBaseUrl || "https://uniplace.up.railway.app/api";

    const cursorGlow = document.querySelector(".cursor-glow");

    const forgotForm = document.getElementById("forgotForm");
    const resetForm = document.getElementById("resetForm");

    const resetEmail = document.getElementById("resetEmail");
    const resetCode = document.getElementById("resetCode");
    const newPassword = document.getElementById("newPassword");
    const confirmNewPassword = document.getElementById("confirmNewPassword");

    const forgotMessage = document.getElementById("forgotMessage");
    const resetMessage = document.getElementById("resetMessage");

    const backToLoginBtn = document.getElementById("backToLoginBtn");
    const backToEmailBtn = document.getElementById("backToEmailBtn");

    let activeEmail = "";

    document.addEventListener("mousemove", (event) => {
        if (!cursorGlow) return;

        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    resetCode.addEventListener("input", () => {
        resetCode.value = resetCode.value.replace(/\D/g, "").slice(0, 6);
    });

    forgotForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = resetEmail.value.trim();

        if (!email) {
            showMessage(forgotMessage, "Ingresa tu correo.");
            return;
        }

        try {
            setButtonLoading(forgotForm, true, "Enviando...");

            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(forgotMessage, data.message || "No se pudo enviar el código.");
                return;
            }

            activeEmail = email;

            showMessage(forgotMessage, "Código enviado. Revisa tu correo.", true);

            setTimeout(() => {
                forgotForm.classList.add("hidden");
                resetForm.classList.remove("hidden");
                resetCode.focus();
            }, 500);

        } catch (error) {
            console.error("FORGOT_FRONT_ERROR:", error);
            showMessage(forgotMessage, "No se pudo conectar con el servidor.");
        } finally {
            setButtonLoading(forgotForm, false, "Enviar código");
        }
    });

    resetForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const code = resetCode.value.trim();
        const password = newPassword.value.trim();
        const confirmPassword = confirmNewPassword.value.trim();

        if (!activeEmail || !code || !password || !confirmPassword) {
            showMessage(resetMessage, "Completa todos los campos.");
            return;
        }

        if (code.length !== 6) {
            showMessage(resetMessage, "El código debe tener 6 dígitos.");
            return;
        }

        if (password.length < 6) {
            showMessage(resetMessage, "La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage(resetMessage, "Las contraseñas no coinciden.");
            return;
        }

        try {
            setButtonLoading(resetForm, true, "Cambiando...");

            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: activeEmail,
                    code,
                    newPassword: password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(resetMessage, data.message || "No se pudo cambiar la contraseña.");
                return;
            }

            showMessage(resetMessage, "Contraseña actualizada correctamente. Redirigiendo...", true);

            localStorage.removeItem("uniplace_token");
            localStorage.removeItem("uniplace_user");
            localStorage.removeItem("uniplace_remember_me");
            localStorage.removeItem("uniplace_pending_email");

            setTimeout(() => {
                window.location.href = "auth.html";
            }, 900);

        } catch (error) {
            console.error("RESET_FRONT_ERROR:", error);
            showMessage(resetMessage, "No se pudo conectar con el servidor.");
        } finally {
            setButtonLoading(resetForm, false, "Cambiar contraseña");
        }
    });

    backToEmailBtn.addEventListener("click", () => {
        resetForm.classList.add("hidden");
        forgotForm.classList.remove("hidden");
        resetMessage.textContent = "";
    });

    backToLoginBtn.addEventListener("click", () => {
        window.location.href = "auth.html";
    });

    function showMessage(element, text, success = false) {
        element.textContent = text;
        element.classList.toggle("success", success);
    }

    function setButtonLoading(form, isLoading, text) {
        const button = form.querySelector("button[type='submit']");

        if (!button) return;

        button.disabled = isLoading;
        button.textContent = text;
    }
});
