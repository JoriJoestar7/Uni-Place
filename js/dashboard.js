const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebar");

const content = document.getElementById("content");

const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");

const newChatBtn = document.getElementById("newChatBtn");

const chatBar = document.getElementById("chatBar");

let chatCounter = 1;

/* ====================================
SIDEBAR
==================================== */

toggleBtn.addEventListener("click", () => {

    sidebar.classList.toggle("collapsed");

});

/* ====================================
SECCIONES
==================================== */

const menuItems =
document.querySelectorAll(
    ".menu-section li[data-section]"
);

menuItems.forEach(item => {

    item.addEventListener("click", () => {

        document
            .querySelectorAll(".menu-section li")
            .forEach(li => {

                li.classList.remove("active");

            });

        item.classList.add("active");

        loadSection(item.dataset.section);

    });

});

/* ====================================
CARGAR SECCIONES
==================================== */

function loadSection(section){

    chatBar.style.display = "none";

    if(section === "uniplace"){

        content.innerHTML = `

        <div class="section-page">

            <h2>¿Qué es UniPlace?</h2>

            <p>
            UniPlace es una plataforma impulsada por
            inteligencia artificial que conecta
            estudiantes, docentes y negocios locales.
            </p>

        </div>

        `;

    }

    if(section === "funciona"){

        content.innerHTML = `

        <div class="section-page">

            <h2>¿Cómo funciona?</h2>

            <div class="steps">

                <div class="step">

                    <h3>1</h3>

                    <p>
                    Describe tu necesidad.
                    </p>

                </div>

                <div class="step">

                    <h3>2</h3>

                    <p>
                    La IA analiza tu solicitud.
                    </p>

                </div>

                <div class="step">

                    <h3>3</h3>

                    <p>
                    Obtén recomendaciones.
                    </p>

                </div>

            </div>

        </div>

        `;

    }

    if(section === "nosotros"){

        content.innerHTML = `

        <div class="section-page">

            <h2>Quiénes Somos</h2>

            <p>
            UniPlace nace para fortalecer la conexión
            entre estudiantes y negocios locales.
            </p>

        </div>

        `;

    }

    if(section === "autores"){

        content.innerHTML = `

        <div class="section-page">

            <h2>Autores</h2>

            <div class="author-grid">

                <div class="author-card">

                    <img src="../assets/autores/autor1.jpg">

                    <h3>Autor 1</h3>

                    <p>Frontend Developer</p>

                </div>

                <div class="author-card">

                    <img src="../assets/autores/autor2.jpg">

                    <h3>Autor 2</h3>

                    <p>Backend Developer</p>

                </div>

            </div>

        </div>

        `;

    }

    if(section === "terminos"){

        content.innerHTML = `

        <div class="section-page">

            <h2>Términos de Uso</h2>

            <p>
            Las recomendaciones generadas por UniPlace
            tienen carácter informativo.
            </p>

        </div>

        `;

    }

}

/* ====================================
CHAT HOME
==================================== */

function loadChatHome(){

    chatBar.style.display = "flex";

    content.innerHTML = `

        <div class="chat-home">

            <div class="hero-center">

                <h1>UniPlace</h1>

                <p>
                    ¿Qué necesitas encontrar hoy?
                </p>

            </div>

            <div id="messages"></div>

        </div>

    `;

}

/* ====================================
SELECCIONAR CHAT
==================================== */

function selectChat(chatElement){

    document
        .querySelectorAll(".chat-item")
        .forEach(chat => {

            chat.classList.remove("active-chat");

        });

    chatElement.classList.add("active-chat");

}

/* ====================================
NUEVO CHAT
==================================== */

newChatBtn.addEventListener("click", () => {

    document
        .querySelectorAll(".menu-section li")
        .forEach(item => {

            item.classList.remove("active");

        });

    newChatBtn.classList.add("active");

    document
        .querySelectorAll(".chat-item")
        .forEach(chat => {

            chat.classList.remove("active-chat");

        });

    chatCounter++;

    const chatList =
    document.getElementById("chatList");

    const newChat =
    document.createElement("div");

    newChat.className =
    "chat-item active-chat";

    newChat.textContent =
    `Conversación ${chatCounter}`;

    chatList.prepend(newChat);

    newChat.addEventListener("click", () => {

        selectChat(newChat);

        loadChatHome();

    });

    loadChatHome();

});

/* ====================================
MENSAJES
==================================== */

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", e => {

    if(e.key === "Enter"){

        sendMessage();

    }

});

function sendMessage(){

    const text = input.value.trim();

    if(!text) return;

    const messages =
    document.getElementById("messages");

    if(!messages) return;

    messages.innerHTML += `

        <div class="message user">

            ${text}

        </div>

    `;

    setTimeout(() => {

        messages.innerHTML += `

            <div class="message bot">

                Esta es una respuesta simulada de UniPlace.

            </div>

        `;

        messages.scrollTop =
        messages.scrollHeight;

    },500);

    input.value = "";

}

/* ====================================
CHAT INICIAL
==================================== */

loadChatHome();