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

        content.innerHTML = `
            <div class="section-page">

                <h2>¿Qué es UniPlace?</h2>

                <p>
                UniPlace es una plataforma impulsada por inteligencia artificial
                diseñada para conectar estudiantes, docentes y negocios locales
                mediante recomendaciones personalizadas.
                </p>

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

                <p>
                Aquí podrás mostrar los integrantes del proyecto,
                fotografías y enlaces profesionales.
                </p>

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