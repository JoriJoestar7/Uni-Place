document.addEventListener("DOMContentLoaded", () => {
    const API_URL = window.UNIPLACE_CONFIG?.apiBaseUrl || "https://uniplace.up.railway.app/api";
    const SERVER_URL = window.UNIPLACE_CONFIG?.serverBaseUrl || "https://uniplace.up.railway.app";

    const token = localStorage.getItem("uniplace_token");
    const userRaw = localStorage.getItem("uniplace_user");

    if (!token || !userRaw) {
        window.location.href = "auth.html";
        return;
    }

    const cursorGlow = document.querySelector(".cursor-glow");
    const accountForm = document.getElementById("accountForm");
    const avatarForm = document.getElementById("avatarForm");
    const avatarInput = document.getElementById("avatarInput");
    const avatarImage = document.getElementById("avatarImage");
    const avatarInitials = document.getElementById("avatarInitials");
    const accountMessage = document.getElementById("accountMessage");
    const logoutBtn = document.getElementById("logoutBtn");

    document.addEventListener("mousemove", (event) => {
        if (!cursorGlow) return;

        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    loadProfile();

    accountForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            name: document.getElementById("name").value.trim(),
            displayName: document.getElementById("displayName").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            bio: document.getElementById("bio").value.trim()
        };

        if (!payload.name) {
            showMessage("El nombre no puede estar vacío.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/profile/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo actualizar el perfil.");
                return;
            }
if (data.user) {
    localStorage.setItem("uniplace_user", JSON.stringify(data.user));
}
            updateLocalUser(data.user);
            fillProfile(data.user);
            showMessage("Perfil actualizado correctamente.", true);

        } catch (error) {
            console.error("PROFILE_UPDATE_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        }
    });

    avatarInput.addEventListener("change", async () => {
        const file = avatarInput.files[0];

        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        avatarImage.src = previewUrl;
        avatarImage.style.display = "block";
        avatarInitials.style.display = "none";

        await uploadAvatar(file);
    });

    avatarForm.addEventListener("submit", (event) => {
        event.preventDefault();
        avatarInput.click();
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        localStorage.removeItem("uniplace_remember_me");
        window.location.href = "auth.html";
    });

    async function uploadAvatar(file) {
        const formData = new FormData();
        formData.append("avatar", file);

        try {
            showMessage("Guardando foto de perfil...");

            const response = await fetch(`${API_URL}/profile/avatar`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo subir la imagen.");
                return;
            }

            updateLocalUser(data.user);
            fillProfile(data.user);
            avatarInput.value = "";
            showMessage("Foto de perfil actualizada correctamente.", true);

        } catch (error) {
            console.error("AVATAR_UPLOAD_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        }
    }

    async function loadProfile() {
        try {
            const response = await fetch(`${API_URL}/profile/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo cargar el perfil.");
                return;
            }

            updateLocalUser(data.user);
            fillProfile(data.user);

        } catch (error) {
            console.error("PROFILE_LOAD_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        }
    }

    function fillProfile(user) {
        document.getElementById("name").value = user.name || "";
        document.getElementById("displayName").value = user.display_name || user.name || "";
        document.getElementById("email").value = user.email || "";
        document.getElementById("role").value = user.role || "";
        document.getElementById("phone").value = user.phone || "";
        document.getElementById("bio").value = user.bio || "";

        renderAvatar(user);
    }

    function renderAvatar(user) {
        const displayName = user.display_name || user.name || "UniPlace";
        avatarInitials.textContent = getInitials(displayName);

        if (user.avatar_url) {
            avatarImage.src = buildImageUrl(user.avatar_url);
            avatarImage.style.display = "block";
            avatarInitials.style.display = "none";
        } else {
            avatarImage.src = "";
            avatarImage.style.display = "none";
            avatarInitials.style.display = "block";
        }
    }

    function buildImageUrl(url) {
        if (!url) return "";

        if (url.startsWith("data:") || url.startsWith("http")) {
            return url;
        }

        return `${SERVER_URL}${url}`;
    }

    function updateLocalUser(user) {
        const currentUser = JSON.parse(localStorage.getItem("uniplace_user") || "{}");

        const updatedUser = {
            ...currentUser,
            ...user
        };

        localStorage.setItem("uniplace_user", JSON.stringify(updatedUser));
    }

    function getInitials(name) {
        return name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    }

    function showMessage(text, success = false) {
        accountMessage.textContent = text;
        accountMessage.classList.toggle("success", success);
    }
});
