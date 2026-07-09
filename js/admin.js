document.addEventListener("DOMContentLoaded", () => {
    const API_URL = window.UNIPLACE_CONFIG?.apiBaseUrl || "https://uniplace.up.railway.app/api";
    const SERVER_URL = window.UNIPLACE_CONFIG?.serverBaseUrl || "https://uniplace.up.railway.app/api";

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
        localStorage.removeItem("uniplace_remember_me");
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

                    <div class="business-badges">
                        <span class="status-badge">
                            ${escapeHtml(formatStatus(business.status))}
                        </span>

                        <span class="status-badge knowledge">
                            IA: ${escapeHtml(formatKnowledgeStatus(business.knowledge_status))}
                        </span>
                    </div>
                </div>

                ${renderBusinessImagePreview(business)}

                <p class="business-description">
                    ${escapeHtml(business.description || "Sin descripción")}
                </p>

                ${business.rejection_reason ? `
                    <div class="business-rejection-note">
                        <strong>Razón de rechazo:</strong>
                        <p>${escapeHtml(business.rejection_reason)}</p>
                    </div>
                ` : ""}

                <div class="business-meta">
                    <p><strong>Tipo:</strong> ${escapeHtml(business.business_type || "No registrado")}</p>
                    <p><strong>Categoría:</strong> ${escapeHtml(business.category_label || "No registrada")}</p>
                    <p><strong>Público:</strong> ${escapeHtml(business.target_audience || "No registrado")}</p>
                    <p><strong>Ciudad:</strong> ${escapeHtml(business.city || "No registrada")}</p>
                    <p><strong>Zona/campus:</strong> ${escapeHtml(business.campus_zone || "No registrada")}</p>
                    <p><strong>Dirección:</strong> ${escapeHtml(business.address || "No registrada")}</p>
                    <p><strong>Referencia:</strong> ${escapeHtml(business.reference_point || "No registrada")}</p>
                    <p><strong>Teléfono:</strong> ${escapeHtml(business.phone || "No registrado")}</p>
                    <p><strong>WhatsApp:</strong> ${escapeHtml(business.whatsapp || "No registrado")}</p>
                    <p><strong>Email:</strong> ${escapeHtml(business.email || "No registrado")}</p>
                    <p><strong>Instagram:</strong> ${escapeHtml(business.instagram_url || "No registrado")}</p>
                    <p><strong>Web:</strong> ${escapeHtml(business.website_url || "No registrado")}</p>
                    <p><strong>Precios:</strong> ${escapeHtml(formatPriceRange(business.price_min, business.price_max))}</p>
                    <p><strong>Pagos:</strong> ${escapeHtml(business.payment_methods || "No registrados")}</p>
                    <p><strong>Entrega:</strong> ${escapeHtml(business.delivery_options || "No registrada")}</p>
                    <p><strong>Keywords:</strong> ${escapeHtml(business.keywords || "No registradas")}</p>
                    <p><strong>Prioridad IA:</strong> ${escapeHtml(business.priority_score ?? "No generada")}</p>
                </div>

                <details class="business-details-block">
                    <summary>Ver menú, horarios, FAQs y conocimiento IA</summary>

                    <div class="admin-detail-grid">
                        <section>
                            <h3>Menú / productos</h3>
                            ${renderMenuItems(business.menu_items)}
                        </section>

                        <section>
                            <h3>Horarios</h3>
                            ${renderHours(business.hours)}
                        </section>

                        <section>
                            <h3>Preguntas frecuentes</h3>
                            ${renderFaqs(business.faqs)}
                        </section>

                        <section>
                            <h3>Fotos del emprendimiento</h3>
                            ${renderBusinessGallery(business.photos)}
                        </section>

                        <section>
                            <h3>Documentos de validación</h3>
                            ${renderBusinessDocuments(business.documents)}
                        </section>

                        <section class="knowledge-preview">
                            <h3>Base de conocimiento IA</h3>
                            <pre>${escapeHtml(business.knowledge_text || "Aún no se generó conocimiento para IA.")}</pre>
                        </section>
                    </div>
                </details>

                <div class="business-actions">
                    <button class="status-btn approve" data-id="${business.id}" data-status="approved">
                        Aprobar y activar IA
                    </button>

                    <button class="status-btn reject" data-id="${business.id}" data-status="rejected">
                        Rechazar con razón
                    </button>

                    <button class="status-btn hide" data-id="${business.id}" data-status="hidden">
                        Ocultar de IA
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
            let rejectionReason = null;

            if (status === "rejected") {
                rejectionReason = prompt("Escribe la razón del rechazo. Esta razón será visible para el emprendedor:");

                if (!rejectionReason || rejectionReason.trim().length < 12) {
                    showMessage("Para rechazar debes escribir una razón clara de al menos 12 caracteres.");
                    return;
                }
            }

            showMessage("Actualizando estado...");

            const response = await fetch(`${API_URL}/admin/businesses/${businessId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status, rejectionReason })
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


    function renderBusinessImagePreview(business) {
        const logoUrl = buildImageUrl(business.logo_url);
        const coverUrl = buildImageUrl(business.cover_image_url);

        if (!logoUrl && !coverUrl) return "";

        return `
            <div class="admin-business-images">
                ${coverUrl ? `<img class="admin-business-cover" src="${escapeHtml(coverUrl)}" alt="Portada del emprendimiento">` : ""}
                ${logoUrl ? `<img class="admin-business-logo" src="${escapeHtml(logoUrl)}" alt="Logo del emprendimiento">` : ""}
            </div>
        `;
    }

    function renderBusinessGallery(photos = []) {
        if (!photos || photos.length === 0) {
            return `<p class="admin-empty-small">No hay fotos de galería registradas.</p>`;
        }

        return `
            <div class="admin-business-gallery">
                ${photos.map((photo) => `
                    <img src="${escapeHtml(buildImageUrl(photo.image_url))}" alt="Foto del emprendimiento">
                `).join("")}
            </div>
        `;
    }

    function renderBusinessDocuments(documents = []) {
        if (!documents || documents.length === 0) {
            return `<p class="admin-empty-small">No hay RUC ni permisos cargados.</p>`;
        }

        return `
            <div class="admin-document-list">
                ${documents.map((document) => `
                    <a href="${escapeHtml(buildImageUrl(document.file_url))}" target="_blank" rel="noopener">
                        <strong>${escapeHtml(document.label || document.type || "Documento")}</strong>
                        <span>${escapeHtml(document.original_name || "Archivo cargado")}</span>
                    </a>
                `).join("")}
            </div>
        `;
    }

    function buildImageUrl(url) {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${SERVER_URL}${url}`;
    }

    function renderMenuItems(items = []) {
        if (!items || items.length === 0) return `<p class="admin-empty-small">No hay productos registrados.</p>`;

        return `
            <div class="admin-mini-list">
                ${items.map((item) => `
                    <article>
                        <strong>${escapeHtml(item.item_name)}</strong>
                        <span>${escapeHtml(item.item_category || "Sin categoría")} · ${escapeHtml(formatMoney(item.price))}</span>
                        <p>${escapeHtml(item.item_description || "Sin descripción")}</p>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function renderHours(hours = []) {
        if (!hours || hours.length === 0) return `<p class="admin-empty-small">No hay horarios registrados.</p>`;

        return `
            <div class="admin-mini-list">
                ${hours.map((item) => `
                    <article>
                        <strong>${escapeHtml(formatDay(item.day_of_week))}</strong>
                        <span>${item.is_closed ? "Cerrado" : `${escapeHtml(formatTime(item.opening_time))} - ${escapeHtml(formatTime(item.closing_time))}`}</span>
                        <p>${escapeHtml(item.notes || "Sin notas")}</p>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function renderFaqs(faqs = []) {
        if (!faqs || faqs.length === 0) return `<p class="admin-empty-small">No hay FAQs registradas.</p>`;

        return `
            <div class="admin-mini-list">
                ${faqs.map((faq) => `
                    <article>
                        <strong>${escapeHtml(faq.question)}</strong>
                        <p>${escapeHtml(faq.answer)}</p>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function showMessage(text) {
        adminMessage.textContent = text;
    }

    function formatStatus(status) {
        const labels = {
            pending: "Pendiente",
            approved: "Aprobado",
            rejected: "Rechazado",
            hidden: "Oculto"
        };

        return labels[status] || status;
    }

    function formatKnowledgeStatus(status) {
        const labels = {
            active: "Activa",
            inactive: "Inactiva",
            draft: "Borrador"
        };

        return labels[status] || "Sin generar";
    }

    function formatPriceRange(min, max) {
        if (min !== null && min !== undefined && max !== null && max !== undefined) return `$${min} - $${max}`;
        if (min !== null && min !== undefined) return `Desde $${min}`;
        if (max !== null && max !== undefined) return `Hasta $${max}`;
        return "No registrado";
    }

    function formatMoney(value) {
        if (value === null || value === undefined || value === "") return "Sin precio";
        return `$${value}`;
    }

    function formatTime(value) {
        if (!value) return "";
        return String(value).slice(0, 5);
    }

    function formatDay(day) {
        const labels = {
            monday: "Lunes",
            tuesday: "Martes",
            wednesday: "Miércoles",
            thursday: "Jueves",
            friday: "Viernes",
            saturday: "Sábado",
            sunday: "Domingo"
        };

        return labels[day] || day;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
});
