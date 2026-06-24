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
    const businessStatusTitle = document.getElementById("businessStatusTitle");
    const businessStatusText = document.getElementById("businessStatusText");
    const rejectionReasonBox = document.getElementById("rejectionReasonBox");
    const rejectionReasonText = document.getElementById("rejectionReasonText");
    const retryBusinessBtn = document.getElementById("retryBusinessBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutBtnForm = document.getElementById("logoutBtnForm");

    let existingBusiness = null;
    let isResubmission = false;

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

            const endpoint = isResubmission
                ? `${API_URL}/business/resubmit`
                : `${API_URL}/business/register`;

            const method = isResubmission ? "PATCH" : "POST";

            const response = await fetch(endpoint, {
                method,
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
                showMessage(data.message || "No se pudo guardar el emprendimiento.");
                return;
            }

            showMessage(
                isResubmission
                    ? "Emprendimiento enviado nuevamente. Queda pendiente de revisión."
                    : "Emprendimiento registrado correctamente. Redirigiendo...",
                true
            );

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

    if (retryBusinessBtn) {
        retryBusinessBtn.addEventListener("click", () => {
            if (!existingBusiness) return;

            isResubmission = true;
            fillBusinessForm(existingBusiness);
            businessForm.classList.remove("hidden");
            retryBusinessBtn.classList.add("hidden");

            showMessage("Corrige la información y vuelve a enviarla para revisión.", true);
            businessForm.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

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

            existingBusiness = data.business;
            businessStatusBox.classList.remove("hidden");

            if (existingBusiness.status === "rejected") {
                businessForm.classList.add("hidden");
                retryBusinessBtn?.classList.remove("hidden");
                rejectionReasonBox?.classList.remove("hidden");

                businessStatusTitle.textContent = "Tu emprendimiento fue rechazado";
                businessStatusText.textContent = `El emprendimiento "${existingBusiness.business_name}" no fue aceptado por ahora. Revisa la razón, corrige la información y vuelve a enviarlo.`;
                rejectionReasonText.textContent = existingBusiness.rejection_reason || "El administrador no registró una razón específica.";
                return;
            }

            businessForm.classList.add("hidden");
            retryBusinessBtn?.classList.add("hidden");
            rejectionReasonBox?.classList.add("hidden");

            businessStatusTitle.textContent = "Emprendimiento ya registrado";
            businessStatusText.textContent = `Tu emprendimiento "${existingBusiness.business_name}" ya fue registrado y actualmente está en estado "${existingBusiness.status}".`;

        } catch (error) {
            console.error("CHECK_BUSINESS_ERROR:", error);
            showMessage("No se pudo verificar si ya tienes un emprendimiento registrado.");
        }
    }

    function fillBusinessForm(business) {
        document.getElementById("businessName").value = business.business_name || "";
        document.getElementById("category").value = business.keywords || "";
        document.getElementById("description").value = business.description || "";
        document.getElementById("phone").value = business.phone || "";
        document.getElementById("businessEmail").value = business.email || "";
        document.getElementById("instagram").value = business.instagram_url || "";
        document.getElementById("website").value = business.website_url || "";
        document.getElementById("location").value = business.city || business.address || "";
    }

    function showMessage(text, success = false) {
        businessMessage.textContent = text;
        businessMessage.classList.toggle("success", success);
    }

    function setLoading(isLoading) {
        const button = businessForm.querySelector("button[type='submit']");

        if (!button) return;

        button.disabled = isLoading;
        button.textContent = isLoading
            ? "Enviando..."
            : isResubmission
                ? "Enviar nuevamente"
                : "Enviar registro";
    }

    function logout() {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        window.location.href = "auth.html";
    }
});
