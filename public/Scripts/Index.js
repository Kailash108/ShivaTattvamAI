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

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const btn = document.getElementById("enableNotificationsBtn");
let VAPID_PUBLIC_KEY = null;

async function loadVapidKey() {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;

  const res = await fetch("/api/vapid-public-key");
  const data = await res.json();
  VAPID_PUBLIC_KEY = data.key;

  return VAPID_PUBLIC_KEY;
}

function updateNotificationButton() {
  if (Notification.permission === "granted") {
    btn.textContent = "Notifications Enabled";
    btn.disabled = true;
    btn.style.opacity = "0.7";
  } 
  else if (Notification.permission === "denied") {
    btn.textContent = "Notifications Blocked";
    btn.disabled = true;
    btn.style.opacity = "0.6";
  } 
  else {
    btn.textContent = "Enable Notifications";
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

updateNotificationButton();

async function loadVapidKey() {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;
  const res = await fetch("/api/vapid-public-key");
  const data = await res.json();
  VAPID_PUBLIC_KEY = data.key;
  return VAPID_PUBLIC_KEY;
}

btn.addEventListener("click", async () => {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Notifications not enabled");
    updateNotificationButton();
    return;
  }

  updateNotificationButton();

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey = await loadVapidKey();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await fetch("/api/save-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
});