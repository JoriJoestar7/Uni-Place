document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:3000/api";

    const token = localStorage.getItem("uniplace_token");
    const userRaw = localStorage.getItem("uniplace_user");

    if (!token || !userRaw) {
        window.location.href = "auth.html";
        return;
    }

    const user = JSON.parse(userRaw);

    if (user.role !== "admin") {
        window.location.href = "dashboard.html";
        return;
    }

    const cursorGlow = document.querySelector(".cursor-glow");
    const adminName = document.getElementById("adminName");
    const adminEmail = document.getElementById("adminEmail");
    const businessList = document.getElementById("businessList");
    const adminMessage = document.getElementById("adminMessage");
    const refreshBtn = document.getElementById("refreshBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const statPending = document.getElementById("statPending");
    const statApproved = document.getElementById("statApproved");
    const statRejected = document.getElementById("statRejected");
    const statHidden = document.getElementById("statHidden");

    const filterButtons = document.querySelectorAll(".filter-btn");

    let currentStatus = "all";

    adminName.textContent = user.name || "Admin";
    adminEmail.textContent = user.email || "";

    document.addEventListener("mousemove", (event) => {
        if (!cursorGlow) return;

        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    refreshBtn.addEventListener("click", () => {
        loadAdminData();
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        window.location.href = "auth.html";
    });

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            filterButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            currentStatus = button.dataset.status;
            loadBusinesses();
        });
    });

    loadAdminData();

    async function loadAdminData() {
        await loadStats();
        await loadBusinesses();
    }

    async function loadStats() {
        try {
            const response = await fetch(`${API_URL}/admin/stats`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudieron cargar estadísticas.");
                return;
            }

            statPending.textContent = data.stats.pending || 0;
            statApproved.textContent = data.stats.approved || 0;
            statRejected.textContent = data.stats.rejected || 0;
            statHidden.textContent = data.stats.hidden || 0;

        } catch (error) {
            console.error("ADMIN_STATS_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        }
    }

    async function loadBusinesses() {
        try {
            showMessage("Cargando emprendimientos...");

            const statusQuery = currentStatus === "all" ? "" : `?status=${currentStatus}`;

            const response = await fetch(`${API_URL}/admin/businesses${statusQuery}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudieron cargar emprendimientos.");
                return;
            }

            renderBusinesses(data.businesses);
            showMessage("");

        } catch (error) {
            console.error("ADMIN_BUSINESSES_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        }
    }

    function renderBusinesses(businesses) {
        businessList.innerHTML = "";

        if (!businesses || businesses.length === 0) {
            businessList.innerHTML = `
                <div class="empty-admin">
                    No hay emprendimientos en esta sección.
                </div>
            `;
            return;
        }

        businesses.forEach((business) => {
            const card = document.createElement("article");
            card.className = "business-card";

            card.innerHTML = `
                <div class="business-card-header">
                    <div>
                        <h2>${escapeHtml(business.business_name)}</h2>
                        <p class="business-owner">
                            Dueño: ${escapeHtml(business.owner_name || "Sin nombre")}<br>
                            ${escapeHtml(business.owner_email || "Sin correo")}
                        </p>
                    </div>

                    <span class="status-badge">
                        ${escapeHtml(business.status)}
                    </span>
                </div>

                <p class="business-description">
                    ${escapeHtml(business.description || "Sin descripción")}
                </p>

                <div class="business-meta">
                    <p><strong>Ciudad:</strong> ${escapeHtml(business.city || "No registrada")}</p>
                    <p><strong>Dirección:</strong> ${escapeHtml(business.address || "No registrada")}</p>
                    <p><strong>Teléfono:</strong> ${escapeHtml(business.phone || "No registrado")}</p>
                    <p><strong>WhatsApp:</strong> ${escapeHtml(business.whatsapp || "No registrado")}</p>
                    <p><strong>Email:</strong> ${escapeHtml(business.email || "No registrado")}</p>
                    <p><strong>Instagram:</strong> ${escapeHtml(business.instagram_url || "No registrado")}</p>
                    <p><strong>Web:</strong> ${escapeHtml(business.website_url || "No registrado")}</p>
                    <p><strong>Keywords:</strong> ${escapeHtml(business.keywords || "No registradas")}</p>
                </div>

                <div class="business-actions">
                    <button class="status-btn approve" data-id="${business.id}" data-status="approved">
                        Aprobar
                    </button>

                    <button class="status-btn reject" data-id="${business.id}" data-status="rejected">
                        Rechazar
                    </button>

                    <button class="status-btn hide" data-id="${business.id}" data-status="hidden">
                        Ocultar
                    </button>

                    <button class="status-btn" data-id="${business.id}" data-status="pending">
                        Marcar pendiente
                    </button>
                </div>
            `;

            const actionButtons = card.querySelectorAll(".status-btn");

            actionButtons.forEach((button) => {
                button.addEventListener("click", () => {
                    const businessId = button.dataset.id;
                    const status = button.dataset.status;

                    updateBusinessStatus(businessId, status);
                });
            });

            businessList.appendChild(card);
        });
    }

    async function updateBusinessStatus(businessId, status) {
        try {
            showMessage("Actualizando estado...");

            const response = await fetch(`${API_URL}/admin/businesses/${businessId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showMessage(data.message || "No se pudo actualizar el estado.");
                return;
            }

            showMessage(data.message || "Estado actualizado correctamente.");
            await loadAdminData();

        } catch (error) {
            console.error("ADMIN_UPDATE_STATUS_FRONT_ERROR:", error);
            showMessage("No se pudo conectar con el servidor.");
        }
    }

    function showMessage(text) {
        adminMessage.textContent = text;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
});