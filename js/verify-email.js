document.addEventListener("DOMContentLoaded", () => {
    const API_URL = window.UNIPLACE_CONFIG?.apiBaseUrl || "https://uniplace-web.vercel.app/";

    const cursorGlow = document.querySelector(".cursor-glow");
    const verifyForm = document.getElementById("verifyForm");
    const verifyEmail = document.getElementById("verifyEmail");
    const verifyCode = document.getElementById("verifyCode");
    const verifyMessage = document.getElementById("verifyMessage");
    const resendCodeBtn = document.getElementById("resendCodeBtn");
    const backToLoginBtn = document.getElementById("backToLoginBtn");

    const pendingEmail = localStorage.getItem("uniplace_pending_email");

    if (pendingEmail) {
        verifyEmail.value = pendingEmail;
    }

    document.addEventListener("mousemove", (event) => {
        if (!cursorGlow) return;

        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    verifyCode.addEventListener("input", () => {
        verifyCode.value = verifyCode.value.replace(/\D/g, "").slice(0, 6);
    });

    verifyForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = verifyEmail.value.trim();
        const code = verifyCode.value.trim();

        if (!email || !code) {
            showMessage("Ingresa tu correo y el código de verificación.");
            return;
        }

        if (code.length !== 6) {
            showMessage("El código debe tener 6 dígitos.");
            return;
        }

        try {
            setLoading(true, "Verificando...");

            const response = await fetch(`${API_URL}/auth/verify-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo verificar la cuenta.");
                return;
            }

            localStorage.removeItem("uniplace_pending_email");
            localStorage.setItem("uniplace_token", data.token);
            localStorage.setItem("uniplace_user", JSON.stringify(data.user));

            showMessage("Cuenta verificada correctamente. Redirigiendo...", true);

            setTimeout(() => {
                redirectByRole(data.user);
            }, 700);

        } catch (error) {
            console.error("VERIFY_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        } finally {
            setLoading(false, "Verificar cuenta");
        }
    });

    resendCodeBtn.addEventListener("click", async () => {
        const email = verifyEmail.value.trim();

        if (!email) {
            showMessage("Ingresa tu correo para reenviar el código.");
            return;
        }

        try {
            resendCodeBtn.disabled = true;
            resendCodeBtn.textContent = "Reenviando...";

            const response = await fetch(`${API_URL}/auth/resend-verification`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo reenviar el código.");
                return;
            }

            localStorage.setItem("uniplace_pending_email", email);
            showMessage("Código reenviado. Revisa tu correo.", true);

        } catch (error) {
            console.error("RESEND_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        } finally {
            resendCodeBtn.disabled = false;
            resendCodeBtn.textContent = "Reenviar código";
        }
    });

    backToLoginBtn.addEventListener("click", () => {
        window.location.href = "auth.html";
    });

    function showMessage(text, success = false) {
        verifyMessage.textContent = text;
        verifyMessage.classList.toggle("success", success);
    }

    function setLoading(isLoading, text) {
        const button = verifyForm.querySelector("button[type='submit']");

        button.disabled = isLoading;
        button.textContent = text;
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
