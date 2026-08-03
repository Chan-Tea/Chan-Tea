document.querySelectorAll(".menu img").forEach((img) => {
    img.addEventListener("click", () => {
        window.open(img.src, "_blank");
    });
});