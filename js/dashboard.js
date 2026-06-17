document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("uniplace_token");
const user = localStorage.getItem("uniplace_user");

if (!token || !user) {
    window.location.href = "auth.html";
    return;
}   
    const STORAGE_KEY = "uniplace_conversations";

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
    if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("uniplace_token");
        localStorage.removeItem("uniplace_user");
        window.location.href = "auth.html";
    });
}
    const emptyState = document.getElementById("emptyState");
    const templateButtons = document.querySelectorAll("[data-template]");

    let conversations = loadConversations();
    let activeConversationId = conversations[0]?.id || null;

    document.addEventListener("mousemove", (event) => {
        cursorGlow.style.opacity = "1";
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
    });

    sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
    });

    newChatBtn.addEventListener("click", () => {
        createConversation();
    });

    clearStorageBtn.addEventListener("click", () => {
        const confirmed = confirm("¿Quieres eliminar todas las conversaciones guardadas?");

        if (!confirmed) return;

        conversations = [];
        activeConversationId = null;
        saveConversations();
        renderConversationList();
        renderMessages();
    });

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

    chatInput.addEventListener("input", autoResizeTextarea);

    chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            chatForm.requestSubmit();
        }
    });

    templateButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const template = button.dataset.template;
            openTemplateMessage(template);
        });
    });

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
            chatInput.focus();
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

        chatWindow.innerHTML = "";

        if (!conversation || conversation.messages.length === 0) {
            chatWindow.appendChild(emptyState);
            currentChatTitle.textContent = "Nuevo Chat";
            return;
        }

        currentChatTitle.textContent = conversation.title;

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
        chatInput.style.height = "auto";
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    }

    if (!activeConversationId) {
        createConversation(false);
    }

    renderConversationList();
    renderMessages();
});