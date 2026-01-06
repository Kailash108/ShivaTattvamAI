import { inject } from "@vercel/analytics"
inject()
import { injectSpeedInsights } from '@vercel/speed-insights';
injectSpeedInsights();

const words = ["reading", "understanding"];
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

function hideLoader() {
  loader.classList.add("hidden");
  setTimeout(() => {
    loader.style.display = "none";
  }, 700);
}