document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:3000/api";
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

    const dashboardUserAvatar = document.getElementById("dashboardUserAvatar");
    const dashboardUserName = document.getElementById("dashboardUserName");
    const dashboardUserEmail = document.getElementById("dashboardUserEmail");
    const dashboardUserRole = document.getElementById("dashboardUserRole");
    const dashboardBusinessMini = document.getElementById("dashboardBusinessMini");
    const dashboardBusinessName = document.getElementById("dashboardBusinessName");
    const dashboardBusinessStatus = document.getElementById("dashboardBusinessStatus");

    const accountInfoBtn = document.getElementById("accountInfoBtn");
    const businessInfoBtn = document.getElementById("businessInfoBtn");

    let currentUser = null;
    let currentBusiness = null;

    let conversations = [];
    let activeConversationId = null;

    startDashboard();

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
            const response = await fetch(`${API_URL}/auth/me`, {
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

            if (!["student", "entrepreneur"].includes(currentUser.role)) {
                redirectToAuth();
                return false;
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

        if (chatForm) {
            chatForm.addEventListener("submit", (event) => {
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

                setTimeout(() => {
                    hideTypingIndicator();
                    addMessage("assistant", generateAssistantResponse(text));
                }, 650);
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
                openTemplateMessage(template);
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
    }

    function renderUserPanel() {
        if (!currentUser) return;

        if (dashboardUserAvatar) {
            dashboardUserAvatar.textContent = getInitials(currentUser.name || currentUser.email || "U");
        }

        if (dashboardUserName) {
            dashboardUserName.textContent = currentUser.name || "Usuario";
        }

        if (dashboardUserEmail) {
            dashboardUserEmail.textContent = currentUser.email || "";
        }

        if (dashboardUserRole) {
            const roleLabels = {
                student: "Estudiante",
                entrepreneur: "Emprendimiento",
                admin: "Administrador"
            };

            dashboardUserRole.textContent = roleLabels[currentUser.role] || currentUser.role;
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

    function addMessage(role, content) {
        const conversation = getActiveConversation();

        if (!conversation) return;

        conversation.messages.push({
            role,
            content,
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
            `;

            messageElement.appendChild(bubble);
            chatWindow.appendChild(messageElement);
        });

        chatWindow.scrollTop = chatWindow.scrollHeight;
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
                text: "Tu emprendimiento no será visible por ahora. Más adelante podrás editar la información y volver a mejorar su perfil."
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
                Aquí puedes revisar la información registrada de tu emprendimiento.
                En una siguiente etapa agregaremos la opción para modificar estos datos directamente.
            </p>

            <div class="dashboard-info-grid">
                ${createInfoRow("Estado", statusLabels[currentBusiness.status] || currentBusiness.status || "No registrado")}
                ${createInfoRow("Descripción corta", currentBusiness.short_description || "No registrada")}
                ${createInfoRow("Descripción", currentBusiness.description || "No registrada")}
                ${createInfoRow("Ciudad", currentBusiness.city || "No registrada")}
                ${createInfoRow("Dirección", currentBusiness.address || "No registrada")}
                ${createInfoRow("Teléfono", currentBusiness.phone || "No registrado")}
                ${createInfoRow("WhatsApp", currentBusiness.whatsapp || "No registrado")}
                ${createInfoRow("Correo", currentBusiness.email || "No registrado")}
                ${createInfoRow("Instagram", currentBusiness.instagram_url || "No registrado")}
                ${createInfoRow("Sitio web", currentBusiness.website_url || "No registrado")}
                ${createInfoRow("Keywords", currentBusiness.keywords || "No registradas")}
                ${createInfoRow("Público objetivo", currentBusiness.target_audience || "No registrado")}
                ${createInfoRow("Visible para IA", currentBusiness.is_ai_visible ? "Sí" : "No")}
                ${createInfoRow("Fecha de registro", formatDate(currentBusiness.created_at))}
            </div>

            <div class="dashboard-info-note">
                Futuro pendiente: permitir que el emprendedor edite esta información directamente.
                Los cambios se guardarán automáticamente y el administrador podrá revisar un historial de modificaciones.
            </div>

            <div class="dashboard-info-actions">
                <button class="dashboard-info-btn primary" id="backToChatFromBusiness">
                    Volver al chat
                </button>

                <button class="dashboard-info-btn" type="button" disabled>
                    Editar próximamente
                </button>
            </div>
        `;

        chatWindow.appendChild(card);

        const backBtn = document.getElementById("backToChatFromBusiness");

        if (backBtn) {
            backBtn.addEventListener("click", () => {
                renderMessages();
            });
        }
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

    function generateAssistantResponse(userText) {
        const cleanText = userText.toLowerCase();

        if (currentBusiness?.status === "pending") {
            return "Puedo ayudarte con eso. Recuerda que tu emprendimiento todavía está pendiente de revisión, así que por ahora no será usado en recomendaciones públicas dentro de UniPlace.";
        }

        if (currentBusiness?.status === "rejected") {
            return "Puedo ayudarte con temas académicos y organización de ideas. Tu emprendimiento aparece como rechazado, así que más adelante convendría editar la información del negocio.";
        }

        if (cleanText.includes("resumen")) {
            return "Claro. Puedo ayudarte a convertir tu contenido en un resumen más claro, ordenado y fácil de estudiar. Pega el texto completo y lo estructuro por ideas principales.";
        }

        if (cleanText.includes("ensayo")) {
            return "Perfecto. Para un ensayo académico puedo ayudarte con introducción, tesis, argumentos, desarrollo, conclusión y tono formal. También puedo ayudarte a hacerlo más humano y menos genérico.";
        }

        if (cleanText.includes("examen") || cleanText.includes("estudiar")) {
            return "Podemos organizar un plan de estudio por temas, dificultad y tiempo disponible. También puedo convertir tus apuntes en preguntas de práctica.";
        }

        if (cleanText.includes("cita") || cleanText.includes("apa")) {
            return "Puedo ayudarte con formato APA, citas dentro del texto y referencias. Solo asegúrate de revisar los datos reales de cada fuente antes de entregar.";
        }

        if (
            currentBusiness?.status === "approved" &&
            (cleanText.includes("emprendimiento") || cleanText.includes("negocio") || cleanText.includes("mi negocio"))
        ) {
            return `Tu emprendimiento "${currentBusiness.business_name}" está aprobado. Más adelante podremos hacer que UniPlace lo use dentro de recomendaciones inteligentes para estudiantes.`;
        }

        return "Entendido. UniPlace puede ayudarte a ordenar esa idea, explicarla mejor o convertirla en un formato académico más claro. En una integración futura, esta respuesta vendría desde una API de IA real.";
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
        window.location.href = "auth.html";
    }

    function redirectToAuth() {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        window.location.href = "auth.html";
    }
});