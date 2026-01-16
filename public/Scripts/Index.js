window.va =
  window.va ||
  function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
window.si =
  window.si ||
  function () {
    (window.siq = window.siq || []).push(arguments);
  };

const words = ["Shiva Purānam", "Shiva Gita"];
const el = document.getElementById("animated-word");

let wordIndex = 0;
let charIndex = 0;
let deleting = false;

function typeLoop() {
  const word = words[wordIndex];

  if (!deleting) {
    el.textContent = word.substring(0, charIndex++);
    if (charIndex > word.length) {
      setTimeout(() => (deleting = true), 1200);
    }
  } else {
    el.textContent = word.substring(0, charIndex--);
    if (charIndex === 0) {
      deleting = false;
      wordIndex = (wordIndex + 1) % words.length;
    }
  }
  setTimeout(typeLoop, deleting ? 60 : 90);
}

typeLoop();
const sections = document.querySelectorAll(".hero, .section");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("fade-visible");
        entry.target.classList.remove("fade-hidden");
      } else {
        entry.target.classList.remove("fade-visible");
        entry.target.classList.add("fade-hidden");
      }
    });
  },
  {
    threshold: 0.3,
  }
);

sections.forEach((section) => observer.observe(section));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/service-worker.js")
  );
}

const pwaBtn = document.getElementById("installBtn");
let deferredPrompt;

const isInstalled =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

function setButton(installed) {
  pwaBtn.hidden = false;
  pwaBtn.classList.toggle("installed", installed);
  pwaBtn.innerHTML = installed
    ? "ShivaTattvamAI Installed<br><span class='install-sub'>Tap & hold for uninstall info</span>"
    : "Install ShivaTattvamAI";
}

if (isInstalled) setButton(true);

window.addEventListener("beforeinstallprompt", (e) => {
  deferredPrompt = e;
  installBtn.style.display = "block";
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    installBtn.style.display = "none";
  }

  deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
  installBtn.style.display = "none";
});

installBtn.addEventListener("contextmenu", (e) => {
  if (!isInstalled) return;
  e.preventDefault();
  alert(
    "To uninstall ShivaTattvamAI:\n\n" +
      "• Android: Long-press app icon → Uninstall\n" +
      "• Desktop: App menu → Uninstall\n" +
      "• iOS: Long-press icon → Remove App"
  );
});

document.addEventListener("contextmenu", (e) => e.preventDefault());