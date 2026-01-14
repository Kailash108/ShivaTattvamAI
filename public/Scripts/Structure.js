window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };

const cards = document.querySelectorAll(".samhita-card");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((c) => {
      if (c !== card) c.classList.remove("active");
    });
    card.classList.toggle("active");
  });
});

document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/topics")
    .then((res) => res.json())
    .then((data) => {
      document.querySelectorAll(".samhita-card").forEach((card) => {
        const samhitaId = card.getAttribute("data-samhita-id");
        const samhitaData = data[samhitaId];

        if (!samhitaData) return;

        const titleEl = card.querySelector(".samhita-title");
        titleEl.textContent = samhitaData.title;

        const ul = card.querySelector(".samhita-content ul");
        ul.innerHTML = "";

        samhitaData.topics.forEach((topic) => {
          const li = document.createElement("li");
          li.textContent = topic;
          ul.appendChild(li);
        });
      });
    })
    .catch((err) => {
      console.error("Failed to update HTML:", err);
    });
});

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});
document.addEventListener("contextmenu", e => e.preventDefault());
