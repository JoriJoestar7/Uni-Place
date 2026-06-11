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

loginForm.addEventListener("submit", (e) => {

    e.preventDefault();

    window.location.href = "dashboard.html";

});

registerForm.addEventListener("submit", (e) => {

    e.preventDefault();

    window.location.href = "dashboard.html";

});