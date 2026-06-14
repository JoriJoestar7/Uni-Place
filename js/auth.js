const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.style.display = "flex";
    registerForm.style.display = "none";
});

registerTab.addEventListener("click", () => {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    registerForm.style.display = "flex";
    loginForm.style.display = "none";
});

// Validación y redirección
loginForm.addEventListener("submit", e => {
    e.preventDefault();
    if(loginForm[0].value && loginForm[1].value){
        window.location.href = "dashboard.html";
    } else {
        alert("Completa todos los campos.");
    }
});

registerForm.addEventListener("submit", e => {
    e.preventDefault();
    if(registerForm[0].value && registerForm[1].value && registerForm[2].value && registerForm[3].value){
        if(registerForm[2].value !== registerForm[3].value){
            alert("Las contraseñas no coinciden.");
            return;
        }
        window.location.href = "dashboard.html";
    } else {
        alert("Completa todos los campos.");
    }
});