const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebar");
const content = document.getElementById("content");
const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const newChatBtn = document.getElementById("newChatBtn");
const chatList = document.getElementById("chatList");

let chatCounter = 1;

// Cargar chats desde localStorage
let chats = JSON.parse(localStorage.getItem("uniplaceChats")) || [{id:1, title:"Nueva conversación", messages:[]}];

// Mostrar chats en sidebar
function renderChats(){
    chatList.innerHTML = "";
    chats.forEach((chat, idx) => {
        const div = document.createElement("div");
        div.className = "chat-item";
        if(idx === chats.length - 1) div.classList.add("active-chat");
        div.textContent = chat.title;
        div.addEventListener("click", () => {
            selectChat(idx);
        });
        chatList.appendChild(div);
    });
}
renderChats();

// Guardar chats
function saveChats(){
    localStorage.setItem("uniplaceChats", JSON.stringify(chats));
}

// Sidebar colapsable
toggleBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

// Secciones
document.querySelectorAll(".menu-section li[data-section]").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".menu-section li").forEach(li => li.classList.remove("active"));
        item.classList.add("active");
        loadSection(item.dataset.section);
    });
});

function loadSection(section){
    chatBar.style.display = "none";
    if(section === "uniplace"){
        content.innerHTML = `<div class="section-page"><h2>¿Qué es UniPlace?</h2><p>UniPlace es una plataforma impulsada por IA que conecta estudiantes, docentes y negocios locales.</p></div>`;
    }
    if(section === "funciona"){
        content.innerHTML = `<div class="section-page"><h2>¿Cómo funciona?</h2><div class="steps"><div class="step"><h3>1</h3><p>Describe tu necesidad.</p></div><div class="step"><h3>2</h3><p>La IA analiza tu solicitud.</p></div><div class="step"><h3>3</h3><p>Obtén recomendaciones.</p></div></div></div>`;
    }
    if(section === "nosotros"){
        content.innerHTML = `<div class="section-page"><h2>Quiénes Somos</h2><p>UniPlace nace para fortalecer la conexión entre estudiantes y negocios locales.</p></div>`;
    }
    if(section === "autores"){
        content.innerHTML = `<div class="section-page"><h2>Autores</h2><div class="author-grid"><div class="author-card"><img src="../assets/autores/autor1.jpg"><h3>Autor 1</h3><p>Frontend Developer</p></div><div class="author-card"><img src="../assets/autores/autor2.jpg"><h3>Autor 2</h3><p>Backend Developer</p></div></div></div>`;
    }
    if(section === "terminos"){
        content.innerHTML = `<div class="section-page"><h2>Términos de Uso</h2><p>Las recomendaciones generadas por UniPlace tienen carácter informativo.</p></div>`;
    }
}

// Chat home
function loadChatHome(chatIdx = chats.length - 1){
    chatBar.style.display = "flex";
    const chat = chats[chatIdx];
    content.innerHTML = `<div class="chat-home"><div class="hero-center"><h1>UniPlace</h1><p>¿Qué necesitas encontrar hoy?</p></div><div id="messages"></div></div>`;
    const messagesDiv = document.getElementById("messages");
    chat.messages.forEach(msg => {
        const div = document.createElement("div");
        div.className = msg.sender;
        div.textContent = msg.text;
        messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    selectChat(chatIdx);
}

// Seleccionar chat
function selectChat(idx){
    document.querySelectorAll(".chat-item").forEach(el => el.classList.remove("active-chat"));
    document.querySelectorAll(".chat-item")[idx].classList.add("active-chat");
    loadChatHome(idx);
}

// Nuevo chat
newChatBtn.addEventListener("click", () => {
    chatCounter++;
    chats.push({id:chatCounter, title:`Conversación ${chatCounter}`, messages:[]});
    saveChats();
    renderChats();
    loadChatHome(chats.length-1);
});

// Enviar mensaje
function sendMessage(){
    const text = input.value.trim();
    if(!text) return;
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML += `<div class="message user">${text}</div>`;
    chats[chats.length-1].messages.push({sender:"message user", text});
    saveChats();
    input.value = "";
    setTimeout(() => {
        messagesDiv.innerHTML += `<div class="message bot">Esta es una respuesta simulada de UniPlace.</div>`;
        chats[chats.length-1].messages.push({sender:"message bot", text:"Esta es una respuesta simulada de UniPlace."});
        saveChats();
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 500);
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", e => { if(e.key==="Enter") sendMessage(); });

loadChatHome();