document.addEventListener("DOMContentLoaded", () => {
    const cursorGlow = document.querySelector(".cursor-glow");
    const glowTargets = document.querySelectorAll(".glow-target");
    const heroTitle = document.querySelector(".hero-title");
    const startBtn = document.getElementById("startBtn");

    if (cursorGlow) {
        document.addEventListener("mousemove", (event) => {
            cursorGlow.style.opacity = "1";
            cursorGlow.style.left = `${event.clientX}px`;
            cursorGlow.style.top = `${event.clientY}px`;
        });
    }

    glowTargets.forEach((target) => {
        target.addEventListener("mouseenter", () => {
            cursorGlow?.classList.add("active");

            if (target.classList.contains("hero-title")) {
                heroTitle?.classList.add("is-glowing");
            }
        });

        target.addEventListener("mouseleave", () => {
            cursorGlow?.classList.remove("active");
            heroTitle?.classList.remove("is-glowing");
        });
    });

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            window.location.href = "pages/auth.html";
        });
    }
});