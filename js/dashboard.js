const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebar");

toggleBtn.addEventListener("click", () => {

    sidebar.classList.toggle("collapsed");

});

const menuItems = document.querySelectorAll("nav li");

const content = document.getElementById("content");

menuItems.forEach(item => {

    item.addEventListener("click", () => {

        document
            .querySelector("nav li.active")
            ?.classList.remove("active");

        item.classList.add("active");

        loadSection(item.dataset.section);

    });

});

function loadSection(section){

    if(section === "chat"){

        location.reload();

        return;
    }

    if(section === "uniplace"){

content.innerHTML=`

<div class="section-page">

<h2>¿Cómo Funciona?</h2>

<div class="steps">

<div class="step">

<h3>1</h3>

<p>Describe tu necesidad.</p>

</div>

<div class="step">

<h3>2</h3>

<p>La IA analiza la solicitud.</p>

</div>

<div class="step">

<h3>3</h3>

<p>Obtén recomendaciones.</p>

</div>

</div>

</div>

`;
    }

    if(section === "funciona"){

        content.innerHTML = `
            <div class="section-page">

                <h2>¿Cómo funciona?</h2>

                <p>
                Describe lo que necesitas, la inteligencia artificial analizará
                tu solicitud y generará recomendaciones relevantes según tu contexto.
                </p>

            </div>
        `;
    }

    if(section === "nosotros"){

        content.innerHTML = `
            <div class="section-page">

                <h2>Quiénes Somos</h2>

                <p>
                UniPlace nace como una iniciativa para fortalecer la conexión
                entre la comunidad universitaria y los negocios locales.
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

<h3>Nombre Completo</h3>

<p>Desarrollador Frontend</p>

</div>

<div class="author-card">

<img src="../assets/autores/autor2.jpg">

<h3>Nombre Completo</h3>

<p>Desarrollador Backend</p>

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
                Las recomendaciones generadas por UniPlace tienen carácter
                informativo y deben ser verificadas por el usuario.
                </p>

            </div>
        `;
    }

}

const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", e => {

    if(e.key === "Enter"){

        sendMessage();
    }

});

function sendMessage(){

    const text = input.value.trim();

    if(!text) return;

    const messages = document.getElementById("messages");

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

        messages.scrollTop = messages.scrollHeight;

    },500);

    input.value = "";

}

let chatCounter = 1;

function createNewChat(){

    chatCounter++;

    const chatList = document.getElementById("chatList");

    const chat = document.createElement("div");

    chat.classList.add("chat-item");

    chat.textContent = `Conversación ${chatCounter}`;

    chatList.prepend(chat);

}
document
.getElementById("newChatBtn")
.addEventListener("click",()=>{

    createNewChat();

    loadChatHome();

});
function loadChatHome(){

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