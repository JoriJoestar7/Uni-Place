const termsModal = document.getElementById("termsModal");
const privacyModal = document.getElementById("privacyModal");
const ethicsModal = document.getElementById("ethicsModal");

document.getElementById("termsBtn").addEventListener("click", () => termsModal.style.display = "flex");
document.getElementById("privacyBtn").addEventListener("click", () => privacyModal.style.display = "flex");
document.getElementById("ethicsBtn").addEventListener("click", () => ethicsModal.style.display = "flex");

document.getElementById("closeModal").addEventListener("click", () => termsModal.style.display = "none");
document.getElementById("closePrivacy").addEventListener("click", () => privacyModal.style.display = "none");
document.getElementById("closeEthics").addEventListener("click", () => ethicsModal.style.display = "none");

window.addEventListener("click", e => {
    if(e.target === termsModal) termsModal.style.display = "none";
    if(e.target === privacyModal) privacyModal.style.display = "none";
    if(e.target === ethicsModal) ethicsModal.style.display = "none";
});

document.getElementById("startBtn").addEventListener("click", () => {
    window.location.href = "pages/auth.html";
});