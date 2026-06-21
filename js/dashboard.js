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
    const chatWindow = document.getElementById("chatWindow");
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const currentChatTitle = document.getElementById("currentChatTitle");
    const clearStorageBtn = document.getElementById("clearStorageBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const emptyState = document.getElementById("emptyState");
    const templateButtons = document.querySelectorAll("[data-template]");
    const dashboardUserName = document.getElementById("dashboardUserName");
    const dashboardUserEmail = document.getElementById("dashboardUserEmail");
    const dashboardUserRole = document.getElementById("dashboardUserRole");
    const dashboardBusinessMini = document.getElementById("dashboardBusinessMini");
    const dashboardBusinessName = document.getElementById("dashboardBusinessName");
    const dashboardBusinessStatus = document.getElementById("dashboardBusinessStatus");

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

                if (!hasBusiness) {
                    return false;
                }
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
function renderUserPanel() {
    if (!currentUser) return;

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
        dashboardBusinessMini?.classList.add("hidden");
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
                createConversation();
            });
        }

        if (clearStorageBtn) {
            clearStorageBtn.addEventListener("click", () => {
                const confirmed = confirm("¿Quieres eliminar todas las conversaciones guardadas?");

                if (!confirmed) return;

                conversations = [];
                activeConversationId = null;
                saveConversations();
                createConversation(false);
                renderConversationList();
                renderMessages();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener("click", logout);
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

                setTimeout(() => {
                    addMessage("assistant", generateAssistantResponse(text));
                }, 450);
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
    }

    function createConversation(render = true) {
        const conversation = {
            id: crypto.randomUUID(),
            title: "Nuevo Chat",
            messages: [],
            createdAt: Date.now()
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

        conversations.forEach((conversation) => {
            const button = document.createElement("button");
            button.className = "conversation-item";
            button.textContent = conversation.title;

            if (conversation.id === activeConversationId) {
                button.classList.add("active");
            }

            button.addEventListener("click", () => {
                activeConversationId = conversation.id;
                renderConversationList();
                renderMessages();
            });

            conversationList.appendChild(button);
        });
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
            bubble.textContent = message.content;

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
                text: "Tu emprendimiento no será visible por ahora. Más adelante podemos crear una opción para editar la información y solicitar una nueva revisión."
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
            return "Puedo ayudarte con temas académicos y organización de ideas. Tu emprendimiento aparece como rechazado, así que más adelante convendría agregar una opción para editarlo y volver a solicitar revisión.";
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

    function createTitleFromMessage(message) {
        const clean = message.replace(/\s+/g, " ").trim();

        if (clean.length <= 34) {
            return clean;
        }

        return `${clean.slice(0, 34)}...`;
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