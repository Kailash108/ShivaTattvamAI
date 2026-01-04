const cards = document.querySelectorAll(".samhita-card");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((c) => {
      if (c !== card) c.classList.remove("active");
    });
    card.classList.toggle("active");
  });
});

document.addEventListener("click", function (e) {
  const li = e.target.closest("li");
  if (!li) return;

  const text = li.textContent.trim();
  if (text != "") {
    navigator.clipboard.writeText("Elaborate on " + text).then(() => {
      const original = li.textContent;
      alert("Topic [" + original + "] is copied!");

      setTimeout(() => {
        li.textContent = original;
      }, 1000);
    });
  }
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
