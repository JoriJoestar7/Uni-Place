const modal = document.getElementById("termsModal");

const termsBtn = document.getElementById("termsBtn");

const closeBtn = document.getElementById("closeModal");

termsBtn.addEventListener("click", () => {

    modal.style.display = "flex";

});

closeBtn.addEventListener("click", () => {

    modal.style.display = "none";

});

window.addEventListener("click", (e) => {

    if (e.target === modal) {

        modal.style.display = "none";
    }

});

document.getElementById("startBtn")
.addEventListener("click", () => {

    window.location.href = "pages/login.html";

});