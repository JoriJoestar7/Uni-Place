document.addEventListener("DOMContentLoaded", () => {
    const API_URL = window.UNIPLACE_CONFIG?.apiBaseUrl || "https://uniplace.up.railway.app/api";
    const API_BASE_URL = window.UNIPLACE_CONFIG?.serverBaseUrl || "https://uniplace.up.railway.app/api";
    const STORAGE_KEY = "uniplace_conversations";

    const token = localStorage.getItem("uniplace_token");
    const userRaw = localStorage.getItem("uniplace_user");

    const cursorGlow = document.querySelector(".cursor-glow");
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const newChatBtn = document.getElementById("newChatBtn");
    const conversationList = document.getElementById("conversationList");
    const conversationSearch = document.getElementById("conversationSearch");
    const conversationCount = document.getElementById("conversationCount");
    const chatWindow = document.getElementById("chatWindow");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const currentChatTitle = document.getElementById("currentChatTitle");
    const clearStorageBtn = document.getElementById("clearStorageBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const emptyState = document.getElementById("emptyState");
    const templateButtons = document.querySelectorAll("[data-template]");

const dashboardUserAvatar = document.getElementById("sidebarUserAvatar");
const dashboardUserName = document.getElementById("sidebarUserName");
const dashboardUserEmail = document.getElementById("sidebarUserEmail");
const dashboardUserRole = document.getElementById("sidebarUserRole");
    const dashboardBusinessMini = document.getElementById("dashboardBusinessMini");
    const dashboardBusinessName = document.getElementById("dashboardBusinessName");
    const dashboardBusinessStatus = document.getElementById("dashboardBusinessStatus");

    const accountInfoBtn = document.getElementById("accountInfoBtn");
    const businessInfoBtn = document.getElementById("businessInfoBtn");
    const mapViewBtn = document.getElementById("mapViewBtn");
    const infoAccordionBtn = document.getElementById("infoAccordionBtn");
    const infoAccordionContent = document.getElementById("infoAccordionContent");
    const collapsedNewChatBtn = document.getElementById("collapsedNewChatBtn");
    const collapsedSearchBtn = document.getElementById("collapsedSearchBtn");
    const collapsedChatsBtn = document.getElementById("collapsedChatsBtn");
    const collapsedMapBtn = document.getElementById("collapsedMapBtn");
    const collapsedInfoBtn = document.getElementById("collapsedInfoBtn");
    const collapsedUserBtn = document.getElementById("collapsedUserBtn");
    const collapsedUserInitial = document.getElementById("collapsedUserInitial");

    let currentUser = null;
    let currentBusiness = null;
    let mariscalMap = null;
    let mariscalMarkers = [];

    let conversations = [];
    let activeConversationId = null;

    startDashboard();

    const accountBtn = document.getElementById("accountBtn");

if (accountBtn) {
    accountBtn.addEventListener("click", () => {
        window.location.href = "account.html";
    });
}
    async function startDashboard() {
        const canEnter = await validateDashboardAccess();

        if (!canEnter) return;

        conversations = loadConversations();
        activeConversationId = conversations[0]?.id || null;

        if (!activeConversationId) {
            createConversation(false);
        }

        renderUserPanel();
        setupEvents();
        renderConversationList();
        renderMessages();
    }

    async function validateDashboardAccess() {
        if (!token || !userRaw) {
            redirectToAuth();
            return false;
        }

        try {
            currentUser = JSON.parse(userRaw);
        } catch {
            redirectToAuth();
            return false;
        }

        try {
            const response = await fetch(`${API_URL}/profile/me`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                redirectToAuth();
                return false;
            }

            currentUser = data.user;
            localStorage.setItem("uniplace_user", JSON.stringify(currentUser));

            if (currentUser.role === "admin") {
                window.location.href = "admin.html";
                return false;
            }

            if (currentUser.role === "entrepreneur") {
                const hasBusiness = await validateEntrepreneurBusiness();

                if (!hasBusiness) return false;
            }

const allowedRoles = ["student", "professor", "entrepreneur"];

if (!allowedRoles.includes(currentUser.role)) {
    redirectToAuth();
    return;
}
            return true;

        } catch (error) {
            console.error("DASHBOARD_ACCESS_ERROR:", error);
            redirectToAuth();
            return false;
        }
    }

    async function validateEntrepreneurBusiness() {
        try {
            const response = await fetch(`${API_URL}/business/me`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 404) {
                window.location.href = "business-register.html";
                return false;
            }

            const data = await response.json();

            if (!response.ok || !data.ok) {
                window.location.href = "business-register.html";
                return false;
            }

            currentBusiness = data.business;
            return true;

        } catch (error) {
            console.error("ENTREPRENEUR_BUSINESS_CHECK_ERROR:", error);
            window.location.href = "business-register.html";
            return false;
        }
    }

    function setupEvents() {
        document.addEventListener("mousemove", (event) => {
            if (!cursorGlow) return;

            cursorGlow.style.opacity = "1";
            cursorGlow.style.left = `${event.clientX}px`;
            cursorGlow.style.top = `${event.clientY}px`;
        });

        if (sidebarToggle) {
            sidebarToggle.addEventListener("click", () => {
                sidebar.classList.toggle("collapsed");
            });
        }


        if (collapsedNewChatBtn) {
            collapsedNewChatBtn.addEventListener("click", () => {
                startNewChat();
            });
        }

        if (collapsedSearchBtn) {
            collapsedSearchBtn.addEventListener("click", () => {
                sidebar?.classList.remove("collapsed");

                setTimeout(() => {
                    conversationSearch?.focus();
                }, 0);
            });
        }

        if (collapsedChatsBtn) {
            collapsedChatsBtn.addEventListener("click", () => {
                sidebar?.classList.remove("collapsed");
            });
        }

        if (collapsedMapBtn) {
            collapsedMapBtn.addEventListener("click", () => {
                renderMapView();
            });
        }

        if (collapsedInfoBtn) {
            collapsedInfoBtn.addEventListener("click", () => {
                window.location.href = "about.html";
            });
        }

        if (collapsedUserBtn) {
            collapsedUserBtn.addEventListener("click", () => {
                window.location.href = "account.html";
            });
        }

        if (newChatBtn) {
            newChatBtn.addEventListener("click", () => {
                startNewChat();
            });
        }

        if (clearStorageBtn) {
            clearStorageBtn.addEventListener("click", () => {
                deleteActiveConversation();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener("click", logout);
        }

        if (conversationSearch) {
            conversationSearch.addEventListener("input", () => {
                renderConversationList();
            });
        }

        if (infoAccordionBtn && infoAccordionContent) {
            infoAccordionBtn.addEventListener("click", () => {
                const accordion = infoAccordionBtn.closest(".sidebar-info-accordion");
                const isOpen = !infoAccordionContent.classList.contains("hidden");

                infoAccordionContent.classList.toggle("hidden", isOpen);
                infoAccordionBtn.setAttribute("aria-expanded", String(!isOpen));

                const icon = infoAccordionBtn.querySelector("strong");

                if (icon) {
                    icon.textContent = isOpen ? "+" : "−";
                }

                if (accordion) {
                    accordion.classList.toggle("open", !isOpen);
                }
            });
        }


        if (chatForm) {
            chatForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const text = chatInput.value.trim();

                if (!text) return;

                if (!activeConversationId) {
                    createConversation(false);
                }

                addMessage("user", text);

                chatInput.value = "";
                autoResizeTextarea();

                showTypingIndicator();

                try {
                    const data = await sendMessageToChatApi(text);
                    hideTypingIndicator();

                    addMessage(
                        "assistant",
                        data.reply,
                        data.recommendedBusinesses || []
                    );
                } catch (error) {
                    console.error("CHAT_FRONT_ERROR:", error);
                    hideTypingIndicator();
                    addMessage("assistant", buildOfflineFallback(text));
                }
            });
        }

        if (chatInput) {
            chatInput.addEventListener("input", autoResizeTextarea);

            chatInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    chatForm.requestSubmit();
                }
            });
        }

        templateButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const template = button.dataset.template;
                
            });
        });

        if (chatWindow) {
            chatWindow.addEventListener("click", (event) => {
                const suggestionButton = event.target.closest("[data-prompt]");

                if (!suggestionButton) return;

                const prompt = suggestionButton.dataset.prompt;

                if (!prompt || !chatInput) return;

                chatInput.value = prompt;
                chatInput.focus();
                autoResizeTextarea();
            });
        }

        if (accountInfoBtn) {
            accountInfoBtn.addEventListener("click", () => {
                renderAccountView();
            });
        }

        if (businessInfoBtn) {
            businessInfoBtn.addEventListener("click", () => {
                renderBusinessView();
            });
        }

        if (mapViewBtn) {
            mapViewBtn.addEventListener("click", () => {
                renderMapView();
            });
        }
    }

function renderUserPanel() {
    if (!currentUser) return;

    const displayName = currentUser.display_name || currentUser.name || "Usuario";
    const email = currentUser.email || "";
    const avatarUrl = currentUser.avatar_url || null;

    if (dashboardUserAvatar) {
        dashboardUserAvatar.innerHTML = "";

        if (avatarUrl) {
            const img = document.createElement("img");
            img.src = buildUploadUrl(avatarUrl);
            img.alt = displayName;
            dashboardUserAvatar.appendChild(img);
        } else {
            dashboardUserAvatar.textContent = getInitials(displayName || email || "U");
        }
    }


    if (collapsedUserInitial) {
        collapsedUserInitial.innerHTML = "";

        if (avatarUrl) {
            const img = document.createElement("img");
            img.src = buildUploadUrl(avatarUrl);
            img.alt = displayName;
            collapsedUserInitial.appendChild(img);
        } else {
            collapsedUserInitial.textContent = getInitials(displayName || email || "U");
        }
    }

    if (dashboardUserName) {
        dashboardUserName.textContent = displayName;
    }

    if (dashboardUserEmail) {
        dashboardUserEmail.textContent = email;
    }

    if (dashboardUserRole) {
        const roleLabels = {
            student: "Estudiante",
            professor: "Profesor",
            entrepreneur: "Emprendedor",
            admin: "Administrador"
        };

        dashboardUserRole.textContent = roleLabels[currentUser.role] || currentUser.role || "Usuario";
    }

    if (currentUser.role === "entrepreneur" && currentBusiness) {
        businessInfoBtn?.classList.remove("hidden");
        dashboardBusinessMini?.classList.remove("hidden");

        if (dashboardBusinessName) {
            dashboardBusinessName.textContent = currentBusiness.business_name || "Mi emprendimiento";
        }

        if (dashboardBusinessStatus) {
            const statusLabels = {
                pending: "Pendiente",
                approved: "Aprobado",
                rejected: "Rechazado",
                hidden: "Oculto"
            };

            dashboardBusinessStatus.textContent = statusLabels[currentBusiness.status] || currentBusiness.status;
        }
    } else {
        businessInfoBtn?.classList.add("hidden");
        dashboardBusinessMini?.classList.add("hidden");
    }
}

    function startNewChat() {
        const activeConversation = getActiveConversation();

        if (activeConversation && activeConversation.messages.length === 0) {
            activeConversationId = activeConversation.id;
            renderConversationList();
            renderMessages();
            chatInput?.focus();
            return;
        }

        createConversation(true);
    }

    function createConversation(render = true) {
        const conversation = {
            id: crypto.randomUUID(),
            title: "Nuevo Chat",
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        conversations.unshift(conversation);
        activeConversationId = conversation.id;

        saveConversations();

        if (render) {
            renderConversationList();
            renderMessages();
            chatInput?.focus();
        }
    }

    function getActiveConversation() {
        return conversations.find((conversation) => conversation.id === activeConversationId);
    }

    function addMessage(role, content, sources = []) {
        const conversation = getActiveConversation();

        if (!conversation) return;

        conversation.messages.push({
            role,
            content,
            sources,
            createdAt: Date.now()
        });

        conversation.updatedAt = Date.now();

        if (role === "user" && conversation.title === "Nuevo Chat") {
            conversation.title = createTitleFromMessage(content);
        }

        saveConversations();
        renderConversationList();
        renderMessages();
    }

    function renderConversationList() {
        if (!conversationList) return;

        conversationList.innerHTML = "";

        const searchValue = conversationSearch
            ? conversationSearch.value.trim().toLowerCase()
            : "";

        const filteredConversations = conversations.filter((conversation) => {
            const title = conversation.title.toLowerCase();
            const messagesText = conversation.messages
                .map((message) => message.content)
                .join(" ")
                .toLowerCase();

            return title.includes(searchValue) || messagesText.includes(searchValue);
        });

        if (conversationCount) {
            conversationCount.textContent = filteredConversations.length;
        }

        if (filteredConversations.length === 0) {
            conversationList.innerHTML = `
                <div class="conversation-empty">
                    No se encontraron conversaciones.
                </div>
            `;
            return;
        }

        filteredConversations.forEach((conversation) => {
            const item = document.createElement("article");
            item.className = "conversation-item";
            item.setAttribute("role", "button");
            item.setAttribute("tabindex", "0");

            const messageCount = conversation.messages.length;
            const lastUpdated = formatConversationDate(conversation.updatedAt || conversation.createdAt);

            item.innerHTML = `
                <div class="conversation-content">
                    <span class="conversation-item-title">
                        ${escapeHtml(conversation.title)}
                    </span>

                    <span class="conversation-item-meta">
                        ${messageCount} mensaje${messageCount === 1 ? "" : "s"} · ${lastUpdated}
                    </span>
                </div>

                <button class="conversation-delete" type="button" title="Eliminar chat">
                    ×
                </button>
            `;

            if (conversation.id === activeConversationId) {
                item.classList.add("active");
            }

            item.addEventListener("click", () => {
                activeConversationId = conversation.id;
                renderConversationList();
                renderMessages();
            });

            item.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    activeConversationId = conversation.id;
                    renderConversationList();
                    renderMessages();
                }
            });

            const deleteButton = item.querySelector(".conversation-delete");

            deleteButton.addEventListener("click", (event) => {
                event.stopPropagation();
                deleteConversationById(conversation.id);
            });

            conversationList.appendChild(item);
        });
    }

    function deleteActiveConversation() {
        if (!activeConversationId) return;

        deleteConversationById(activeConversationId);
    }

    function deleteConversationById(conversationId) {
        const conversation = conversations.find((item) => item.id === conversationId);

        if (!conversation) return;

        const shouldConfirm = conversation.messages.length > 0;

        if (shouldConfirm) {
            const confirmed = confirm(`¿Quieres eliminar el chat "${conversation.title}"?`);

            if (!confirmed) return;
        }

        conversations = conversations.filter((item) => item.id !== conversationId);

        if (activeConversationId === conversationId) {
            activeConversationId = conversations[0]?.id || null;
        }

        if (conversations.length === 0) {
            createConversation(false);
        }

        saveConversations();
        renderConversationList();
        renderMessages();
    }

    function renderMessages() {
        const conversation = getActiveConversation();

        if (!chatWindow) return;

        chatWindow.innerHTML = "";

        renderUserStatusBanner();

        if (!conversation || conversation.messages.length === 0) {
            if (emptyState) {
                updateEmptyState();
                chatWindow.appendChild(emptyState);
            }

            if (currentChatTitle) {
                currentChatTitle.textContent = "Nuevo Chat";
            }

            return;
        }

        if (currentChatTitle) {
            currentChatTitle.textContent = conversation.title;
        }

        conversation.messages.forEach((message) => {
            const messageElement = document.createElement("div");
            messageElement.className = `message ${message.role}`;

            const bubble = document.createElement("div");
            bubble.className = "bubble";

            const label = message.role === "user" ? "Tú" : "UniPlace";

            bubble.innerHTML = `
                <span class="message-label">${label}</span>
                <p>${formatMessageContent(message.content)}</p>
                ${message.role === "assistant" ? createSourceCards(message.sources) : ""}
            `;

            messageElement.appendChild(bubble);
            chatWindow.appendChild(messageElement);
        });

        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function createSourceCards(sources) {
        if (!Array.isArray(sources) || sources.length === 0) return "";

        const cards = sources.map((source) => {
            const location = formatSourceLocation(source);
            const contact = formatSourceContact(source);
            const price = source.price_range ? `<span>${escapeHtml(source.price_range)}</span>` : "";
            const schedule = source.schedule_summary ? `<span>${escapeHtml(source.schedule_summary)}</span>` : "";
            const tokens = Array.isArray(source.matched_tokens) && source.matched_tokens.length > 0
                ? `<small>Coincidencias: ${escapeHtml(source.matched_tokens.join(", "))}</small>`
                : "";

            return `
                <article class="message-source-card">
                    <div>
                        <strong>${escapeHtml(source.business_name || "Emprendimiento UniPlace")}</strong>
                        <p>${escapeHtml(source.short_description || source.category || "Negocio aprobado dentro de UniPlace.")}</p>
                    </div>

                    <div class="message-source-meta">
                        ${source.category ? `<span>${escapeHtml(source.category)}</span>` : ""}
                        ${price}
                        ${location ? `<span>${escapeHtml(location)}</span>` : ""}
                        ${schedule}
                        ${contact ? `<span>${escapeHtml(contact)}</span>` : ""}
                    </div>

                    ${tokens}
                </article>
            `;
        }).join("");

        return `<div class="message-sources">${cards}</div>`;
    }

    function formatSourceLocation(source) {
        return [source.city, source.campus_zone, source.address]
            .filter(Boolean)
            .join(" · ");
    }

    function formatSourceContact(source) {
        if (source.whatsapp) return `WhatsApp: ${source.whatsapp}`;
        if (source.phone) return `Tel: ${source.phone}`;
        if (source.instagram_url) return `Instagram: ${source.instagram_url}`;
        if (source.website_url) return `Web: ${source.website_url}`;
        return "";
    }

    function renderUserStatusBanner() {
        if (!currentUser) return;
        if (currentUser.role !== "entrepreneur" || !currentBusiness) return;

        const banner = document.createElement("section");
        banner.className = `dashboard-status-banner status-${currentBusiness.status}`;

        const content = getBusinessStatusContent(currentBusiness);

        banner.innerHTML = `
            <div>
                <span>${content.label}</span>
                <h2>${content.title}</h2>
                <p>${content.text}</p>
                ${content.action ? `<a href="${content.action.href}" class="dashboard-status-action">${content.action.label}</a>` : ""}
            </div>
        `;

        chatWindow.appendChild(banner);
    }

    function getBusinessStatusContent(business) {
        const businessName = business.business_name || "tu emprendimiento";

        const statusContent = {
            pending: {
                label: "Emprendimiento en revisión",
                title: `${businessName} está pendiente de aprobación`,
                text: "Puedes usar UniPlace con normalidad, pero tu emprendimiento todavía no será visible para recomendaciones hasta que un administrador lo apruebe."
            },
            approved: {
                label: "Emprendimiento aprobado",
                title: `${businessName} ya está aprobado`,
                text: "Tu emprendimiento ya puede formar parte de las recomendaciones y futuras respuestas inteligentes de UniPlace."
            },
            rejected: {
                label: "Emprendimiento rechazado",
                title: `${businessName} fue rechazado`,
                text: business.rejection_reason
                    ? `Razón del rechazo: ${business.rejection_reason}. Puedes corregir tu ficha completa y volver a enviarla a revisión.`
                    : "Tu emprendimiento no será visible por ahora. Puedes revisar tu ficha completa y volver a enviarla a revisión.",
                action: {
                    label: "Ver razón y volver a intentar",
                    href: "business-register.html"
                }
            },
            hidden: {
                label: "Emprendimiento oculto",
                title: `${businessName} está oculto`,
                text: "El emprendimiento existe en la base de datos, pero no está visible para estudiantes ni para futuras recomendaciones."
            }
        };

        return statusContent[business.status] || {
            label: "Estado del emprendimiento",
            title: businessName,
            text: "No se pudo identificar el estado actual del emprendimiento."
        };
    }

    function updateEmptyState() {
        if (!emptyState) return;

        const title = emptyState.querySelector("h2");
        const paragraph = emptyState.querySelector("p");

        if (!title || !paragraph) return;

        if (currentUser?.role === "entrepreneur" && currentBusiness) {
            title.textContent = `Hola, ${currentUser.name}`;
            paragraph.textContent = "Puedes conversar con UniPlace, organizar ideas y preparar información académica. El estado de tu emprendimiento aparece arriba.";
            return;
        }

        title.textContent = `Hola, ${currentUser?.name || "estudiante"}`;
        paragraph.textContent = "Pregunta, organiza una idea, estructura una tarea o prepara un tema universitario.";
    }

    function renderAccountView() {
        if (!chatWindow || !currentUser) return;

        chatWindow.innerHTML = "";

        if (currentUser.role === "entrepreneur" && currentBusiness) {
            renderUserStatusBanner();
        }

        if (currentChatTitle) {
            currentChatTitle.textContent = "Mi cuenta";
        }

        const card = document.createElement("section");
        card.className = "dashboard-info-card";

        const roleLabels = {
            student: "Estudiante",
            professor: "Profesor",
            entrepreneur: "Emprendimiento",
            admin: "Administrador"
        };

        card.innerHTML = `
            <span class="dashboard-info-kicker">Perfil de usuario</span>

            <h2>Mi cuenta</h2>

            <p class="dashboard-info-description">
                Aquí puedes revisar la información principal de tu cuenta dentro de UniPlace.
                Más adelante esta sección podrá incluir edición de perfil, preferencias y configuración.
            </p>

            <div class="dashboard-info-grid">
                ${createInfoRow("Nombre", currentUser.name || "No registrado")}
                ${createInfoRow("Correo", currentUser.email || "No registrado")}
                ${createInfoRow("Rol", roleLabels[currentUser.role] || currentUser.role || "No registrado")}
                ${createInfoRow("ID de usuario", currentUser.id || "No registrado")}
                ${createInfoRow("Fecha de creación", formatDate(currentUser.created_at))}
            </div>

            <div class="dashboard-info-note">
                En esta versión, la sesión se guarda en el navegador mediante localStorage.
                Más adelante se puede mejorar con cookies seguras y configuración avanzada de cuenta.
            </div>

            <div class="dashboard-info-actions">
                <button class="dashboard-info-btn primary" id="backToChatFromAccount">
                    Volver al chat
                </button>
            </div>
        `;

        chatWindow.appendChild(card);

        const backBtn = document.getElementById("backToChatFromAccount");

        if (backBtn) {
            backBtn.addEventListener("click", () => {
                renderMessages();
            });
        }
    }

    function renderBusinessView() {
        if (!chatWindow || !currentBusiness) return;

        chatWindow.innerHTML = "";

        renderUserStatusBanner();

        if (currentChatTitle) {
            currentChatTitle.textContent = "Mi emprendimiento";
        }

        const statusLabels = {
            pending: "Pendiente de revisión",
            approved: "Aprobado",
            rejected: "Rechazado",
            hidden: "Oculto"
        };

        const card = document.createElement("section");
        card.className = "dashboard-info-card";

        card.innerHTML = `
            <span class="dashboard-info-kicker">Perfil del emprendimiento</span>

            <h2>${escapeHtml(currentBusiness.business_name || "Mi emprendimiento")}</h2>

            <p class="dashboard-info-description">
                Aquí puedes revisar la información registrada de tu emprendimiento y el estado de su base de conocimiento para IA.
                Si actualizas la ficha, volverá a revisión para mantener la calidad de las recomendaciones.
            </p>

            <div class="dashboard-info-grid">
                ${createInfoRow("Estado", statusLabels[currentBusiness.status] || currentBusiness.status || "No registrado")}
                ${currentBusiness.rejection_reason ? createInfoRow("Razón de rechazo", currentBusiness.rejection_reason) : ""}
                ${createInfoRow("Tipo", currentBusiness.business_type || "No registrado")}
                ${createInfoRow("Descripción corta", currentBusiness.short_description || "No registrada")}
                ${createInfoRow("Descripción", currentBusiness.description || "No registrada")}
                ${createInfoRow("Ciudad", currentBusiness.city || "No registrada")}
                ${createInfoRow("Zona / campus", currentBusiness.campus_zone || "No registrada")}
                ${createInfoRow("Dirección", currentBusiness.address || "No registrada")}
                ${createInfoRow("Referencia", currentBusiness.reference_point || "No registrada")}
                ${createInfoRow("Teléfono", currentBusiness.phone || "No registrado")}
                ${createInfoRow("WhatsApp", currentBusiness.whatsapp || "No registrado")}
                ${createInfoRow("Correo", currentBusiness.email || "No registrado")}
                ${createInfoRow("Instagram", currentBusiness.instagram_url || "No registrado")}
                ${createInfoRow("Sitio web", currentBusiness.website_url || "No registrado")}
                ${createInfoRow("Rango de precios", formatBusinessPriceRange(currentBusiness.price_min, currentBusiness.price_max))}
                ${createInfoRow("Métodos de pago", currentBusiness.payment_methods || "No registrados")}
                ${createInfoRow("Entrega / retiro", currentBusiness.delivery_options || "No registrado")}
                ${createInfoRow("Productos principales", currentBusiness.main_products || "No registrados")}
                ${createInfoRow("Keywords", currentBusiness.keywords || "No registradas")}
                ${createInfoRow("Público objetivo", currentBusiness.target_audience || "No registrado")}
                ${createInfoRow("Visible para IA", currentBusiness.is_ai_visible ? "Sí" : "No")}
                ${createInfoRow("Base IA", currentBusiness.ai_knowledge?.knowledge_status || "No generada")}
                ${createInfoRow("Prioridad IA", currentBusiness.ai_knowledge?.priority_score ?? "No generada")}
                ${createInfoRow("Fecha de registro", formatDate(currentBusiness.created_at))}
            </div>

            <div class="dashboard-info-note">
                La IA solo usará esta información para recomendaciones cuando el emprendimiento esté aprobado, visible y con base de conocimiento activa.
            </div>

            <div class="dashboard-info-actions">
                <button class="dashboard-info-btn primary" id="backToChatFromBusiness">
                    Volver al chat
                </button>

                <button class="dashboard-info-btn" type="button" id="editBusinessProfileBtn">
                    Editar ficha completa
                </button>
            </div>
        `;

        chatWindow.appendChild(card);

        const backBtn = document.getElementById("backToChatFromBusiness");
        const editBtn = document.getElementById("editBusinessProfileBtn");

        if (backBtn) {
            backBtn.addEventListener("click", () => {
                renderMessages();
            });
        }

        if (editBtn) {
            editBtn.addEventListener("click", () => {
                window.location.href = "business-register.html";
            });
        }
    }

    async function renderMapView() {
        if (!chatWindow) return;

        chatWindow.innerHTML = "";

        if (currentChatTitle) {
            currentChatTitle.textContent = "Mapa La Mariscal";
        }

        const view = document.createElement("section");
        view.className = "dashboard-map-view";
        view.innerHTML = `
            <div class="dashboard-map-head">
                <div>
                    <span class="dashboard-info-kicker">Emprendimientos aprobados</span>
                    <h2>La Mariscal</h2>
                    <p>Negocios visibles para IA dentro del sector La Mariscal. El mapa usa posiciones aproximadas cuando la ficha no tiene coordenadas reales.</p>
                </div>

                <button class="dashboard-info-btn" type="button" id="refreshMapBtn">Actualizar mapa</button>
            </div>

            <div class="dashboard-map-shell">
                <div class="dashboard-map-canvas" id="dashboardMapCanvas">
                    <div class="map-zone-label">La Mariscal · Quito</div>
                    <div class="map-loading">Cargando mapa...</div>
                </div>

                <aside class="dashboard-map-list" id="dashboardMapList"></aside>
            </div>
        `;

        chatWindow.appendChild(view);

        document.getElementById("refreshMapBtn")?.addEventListener("click", loadMapBusinesses);

        await loadMapBusinesses();
    }

    async function loadMapBusinesses() {
        const canvas = document.getElementById("dashboardMapCanvas");
        const list = document.getElementById("dashboardMapList");

        if (!canvas || !list) return;

        canvas.querySelectorAll(".map-marker").forEach((marker) => marker.remove());
        const loading = canvas.querySelector(".map-loading");
        if (loading) loading.textContent = "Cargando mapa...";
        list.innerHTML = "";

        try {
            const response = await fetch(`${API_URL}/business/map`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.message || "No se pudo cargar el mapa.");
            }

            renderMapBusinesses(data.businesses || []);

        } catch (error) {
            console.error("MAP_FRONT_ERROR:", error);
            if (loading) loading.textContent = "No se pudo cargar el mapa.";
            list.innerHTML = `<p class="dashboard-map-empty">Revisa que el servidor esté activo y vuelve a intentar.</p>`;
        }
    }

    function renderMapBusinesses(businesses) {
        const canvas = document.getElementById("dashboardMapCanvas");
        const list = document.getElementById("dashboardMapList");
        const loading = canvas?.querySelector(".map-loading");

        if (!canvas || !list) return;

        resetLeafletMap();

        if (loading) {
            loading.textContent = businesses.length
                ? `${businesses.length} emprendimiento${businesses.length === 1 ? "" : "s"}`
                : "Sin emprendimientos aprobados en La Mariscal.";
        }

        if (businesses.length === 0) {
            list.innerHTML = `
                <p class="dashboard-map-empty">
                    Cuando apruebes emprendimientos ubicados en La Mariscal y activos para IA, aparecerán aquí.
                </p>
            `;
            return;
        }

        list.innerHTML = businesses.map((business) => createMapBusinessCard(business)).join("");

        if (window.L) {
            renderLeafletMap(businesses);
        } else {
            renderStaticFallbackMap(businesses);
        }

        list.querySelectorAll("[data-map-card]").forEach((card) => {
            card.addEventListener("click", () => {
                focusMapBusiness(card.dataset.mapCard);
            });
        });
    }

    function renderLeafletMap(businesses) {
        const canvas = document.getElementById("dashboardMapCanvas");

        if (!canvas || !window.L) return;

        mariscalMap = L.map(canvas, {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([-0.2009, -78.4898], 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(mariscalMap);

        const markerBounds = [];

        mariscalMarkers = businesses.map((business, index) => {
            const marker = L.marker([business.lat, business.lng], {
                title: business.business_name
            }).addTo(mariscalMap);

            marker.bindPopup(createMapPopup(business, index + 1));
            marker.on("click", () => focusMapBusiness(business.id, false));

            markerBounds.push([business.lat, business.lng]);

            return {
                businessId: String(business.id),
                marker
            };
        });

        if (markerBounds.length > 1) {
            mariscalMap.fitBounds(markerBounds, {
                padding: [34, 34],
                maxZoom: 16
            });
        }

        setTimeout(() => {
            mariscalMap?.invalidateSize();
        }, 80);
    }

    function renderStaticFallbackMap(businesses) {
        const canvas = document.getElementById("dashboardMapCanvas");

        if (!canvas) return;

        canvas.classList.add("map-fallback");
        canvas.insertAdjacentHTML("beforeend", `
            <div class="map-street horizontal street-one"></div>
            <div class="map-street horizontal street-two"></div>
            <div class="map-street horizontal street-three"></div>
            <div class="map-street vertical street-four"></div>
            <div class="map-street vertical street-five"></div>
        `);

        const bounds = {
            north: -0.1908,
            south: -0.2116,
            west: -78.4986,
            east: -78.4810
        };

        businesses.forEach((business, index) => {
            const marker = document.createElement("button");
            marker.className = "map-marker";
            marker.type = "button";
            marker.title = business.business_name;
            marker.dataset.businessId = business.id;
            marker.textContent = String(index + 1);

            const left = ((business.lng - bounds.west) / (bounds.east - bounds.west)) * 100;
            const top = ((bounds.north - business.lat) / (bounds.north - bounds.south)) * 100;

            marker.style.left = `${Math.min(92, Math.max(8, left))}%`;
            marker.style.top = `${Math.min(88, Math.max(12, top))}%`;

            marker.addEventListener("click", () => {
                focusMapBusiness(business.id);
            });

            canvas.appendChild(marker);
        });
    }

    function resetLeafletMap() {
        if (mariscalMap) {
            mariscalMap.remove();
            mariscalMap = null;
        }

        mariscalMarkers = [];
    }

    function createMapBusinessCard(business) {
        const location = [business.campus_zone, business.address, business.reference_point]
            .filter(Boolean)
            .join(" · ");
        const contact = business.whatsapp || business.phone || business.instagram_url || business.website_url || "";

        return `
            <article class="dashboard-map-card" data-map-card="${escapeHtml(business.id)}">
                <strong>${escapeHtml(business.business_name)}</strong>
                <span>${escapeHtml(business.category || "Emprendimiento")}</span>
                <p>${escapeHtml(business.description || "Negocio aprobado y visible para IA.")}</p>
                ${location ? `<small>${escapeHtml(location)}</small>` : ""}
                ${business.price_range ? `<small>${escapeHtml(business.price_range)}</small>` : ""}
                ${contact ? `<small>${escapeHtml(contact)}</small>` : ""}
            </article>
        `;
    }

    function focusMapBusiness(businessId) {
        document.querySelectorAll(".map-marker, .dashboard-map-card").forEach((element) => {
            element.classList.remove("active");
        });

        document.querySelector(`.map-marker[data-business-id="${CSS.escape(String(businessId))}"]`)?.classList.add("active");

        const card = document.querySelector(`.dashboard-map-card[data-map-card="${CSS.escape(String(businessId))}"]`);
        card?.classList.add("active");
        card?.scrollIntoView({ block: "nearest", behavior: "smooth" });

        const markerEntry = mariscalMarkers.find((entry) => entry.businessId === String(businessId));

        if (markerEntry && mariscalMap) {
            mariscalMap.setView(markerEntry.marker.getLatLng(), Math.max(mariscalMap.getZoom(), 16), {
                animate: true
            });
            markerEntry.marker.openPopup();
        }
    }

    function createMapPopup(business, position) {
        const location = [business.campus_zone, business.address, business.reference_point]
            .filter(Boolean)
            .join(" · ");
        const contact = business.whatsapp || business.phone || business.instagram_url || business.website_url || "";

        return `
            <div class="map-popup">
                <span>${position}. ${escapeHtml(business.category || "Emprendimiento")}</span>
                <strong>${escapeHtml(business.business_name)}</strong>
                ${business.description ? `<p>${escapeHtml(business.description)}</p>` : ""}
                ${location ? `<small>${escapeHtml(location)}</small>` : ""}
                ${business.price_range ? `<small>${escapeHtml(business.price_range)}</small>` : ""}
                ${contact ? `<small>${escapeHtml(contact)}</small>` : ""}
            </div>
        `;
    }

    function formatBusinessPriceRange(min, max) {
        if (min !== null && min !== undefined && max !== null && max !== undefined) return `$${min} - $${max}`;
        if (min !== null && min !== undefined) return `Desde $${min}`;
        if (max !== null && max !== undefined) return `Hasta $${max}`;
        return "No registrado";
    }

    function openTemplateMessage(template) {
        if (!activeConversationId) {
            createConversation(false);
        }

        const templates = {
            about:
                "UniPlace es un asistente académico con IA pensado para estudiantes universitarios. Su objetivo es ayudarte a organizar tareas, resolver dudas, estudiar mejor y estructurar ideas con claridad.",

            how:
                "UniPlace funciona como un chat inteligente. Puedes escribir una pregunta, pedir una explicación, organizar apuntes, resumir temas o preparar trabajos académicos. En esta versión, las respuestas son simuladas y luego pueden conectarse a una API real.",

            team:
                "Somos un proyecto enfocado en crear una experiencia académica más ordenada, simple y elegante para estudiantes. UniPlace combina diseño minimalista, tecnología e inteligencia artificial.",

            authors:
                "Autores del proyecto:\n\nAutor 1\nAutor 2\n\nPuedes reemplazar esta sección con fotos, nombres, roles y una breve descripción de cada integrante.",

            terms:
                "Términos generales:\n\nUniPlace debe utilizarse como apoyo académico. Las respuestas deben revisarse y contrastarse antes de usarlas en trabajos finales. La IA acompaña el aprendizaje, pero no reemplaza el criterio del estudiante."
        };

        addMessage("assistant", templates[template]);
    }

    async function sendMessageToChatApi(userText) {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                message: userText,
                conversationId: activeConversationId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.message || "No se pudo generar la respuesta del chat.");
        }

        return data;
    }

    function buildOfflineFallback(userText) {
        const cleanText = userText.toLowerCase();

        if (currentBusiness?.status === "pending") {
            return "Puedo ayudarte con eso. Recuerda que tu emprendimiento todavía está pendiente de revisión, así que por ahora no será usado en recomendaciones públicas dentro de UniPlace.";
        }

        if (currentBusiness?.status === "rejected") {
            return "Puedo ayudarte con temas académicos y organización de ideas. Tu emprendimiento aparece como rechazado. Puedes revisar la razón y volver a enviar tu ficha completa desde el registro de emprendimiento.";
        }

        if (cleanText.includes("resumen")) {
            return "Claro. Puedo ayudarte a convertir tu contenido en un resumen más claro, ordenado y fácil de estudiar. Pega el texto completo y lo estructuro por ideas principales.";
        }

        if (cleanText.includes("ensayo")) {
            return "Perfecto. Para un ensayo académico puedo ayudarte con introducción, tesis, argumentos, desarrollo, conclusión y tono formal.";
        }

        if (cleanText.includes("examen") || cleanText.includes("estudiar")) {
            return "Podemos organizar un plan de estudio por temas, dificultad y tiempo disponible. También puedo convertir tus apuntes en preguntas de práctica.";
        }

        return `No pude conectar con el motor de respuestas del backend en este momento. Revisa que el servidor esté corriendo en ${API_BASE_URL} y vuelve a intentarlo.`;
    }

    function showTypingIndicator() {
        if (!chatWindow) return;

        hideTypingIndicator();

        const typingElement = document.createElement("div");
        typingElement.className = "typing-indicator";
        typingElement.id = "typingIndicator";

        typingElement.innerHTML = `
            <div class="typing-bubble">
                UniPlace está escribiendo
                <span class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </div>
        `;

        chatWindow.appendChild(typingElement);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingElement = document.getElementById("typingIndicator");

        if (typingElement) {
            typingElement.remove();
        }
    }

    function createInfoRow(label, value) {
        return `
            <div class="dashboard-info-row">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value || "No registrado")}</strong>
            </div>
        `;
    }

    function createTitleFromMessage(message) {
        const clean = message.replace(/\s+/g, " ").trim();

        if (clean.length <= 42) {
            return clean;
        }

        return `${clean.slice(0, 42)}...`;
    }

    function saveConversations() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }

    function loadConversations() {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return [];

        try {
            return JSON.parse(saved);
        } catch {
            return [];
        }
    }

    function autoResizeTextarea() {
        if (!chatInput) return;

        chatInput.style.height = "auto";
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    }

    function formatMessageContent(content) {
        return escapeHtml(content).replace(/\n/g, "<br>");
    }

    function formatConversationDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Sin fecha";
        }

        return date.toLocaleDateString("es-EC", {
            month: "short",
            day: "numeric"
        });
    }

    function formatDate(value) {
        if (!value) return "No registrada";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "No registrada";
        }

        return date.toLocaleDateString("es-EC", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }
    function buildUploadUrl(url) {
    if (!url) return "";

    if (url.startsWith("http")) {
        return url;
    }

    return `${API_BASE_URL}${url}`;
    }
    function getInitials(value) {
        const parts = value.trim().split(/\s+/);

        if (parts.length === 1) {
            return parts[0].slice(0, 1).toUpperCase();
        }

        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function logout() {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        localStorage.removeItem("uniplace_remember_me");
        window.location.href = "auth.html";
    }

    function redirectToAuth() {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        localStorage.removeItem("uniplace_remember_me");
        window.location.href = "auth.html";
    }

});
