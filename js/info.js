document.addEventListener("DOMContentLoaded", () => {
    const cursorGlow = document.querySelector(".cursor-glow");

    if (cursorGlow) {
        document.addEventListener("mousemove", (event) => {
            cursorGlow.style.opacity = "1";
            cursorGlow.style.left = `${event.clientX}px`;
            cursorGlow.style.top = `${event.clientY}px`;
        });
    }

    const protectedPage = document.body.dataset.protected === "true";

    if (protectedPage) {
        const token = localStorage.getItem("uniplace_token");
        const user = localStorage.getItem("uniplace_user");

        if (!token || !user) {
            window.location.href = "auth.html";
        }
    }
});
