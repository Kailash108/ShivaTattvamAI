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

let data = null;
let currentLang = "en";
let currentChapter = null;
let currentUtterance = null;

fetch("/api/shivagita")
  .then((res) => res.json())
  .then((json) => {
    data = json;
    renderChapterGrid();
  });

function speakMeaning(text, lang, iconEl) {
  if (!("speechSynthesis" in window)) return;

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    currentUtterance = null;
    if (iconEl) iconEl.innerText = "▶";
    return;
  }

  const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
  utterance.lang = lang === "te" ? "te-IN" : "en-IN";

  utterance.onstart = () => {
    currentUtterance = utterance;
    if (iconEl) iconEl.innerText = "⏸";
  };

  utterance.onend = utterance.onerror = () => {
    currentUtterance = null;
    if (iconEl) iconEl.innerText = "▶";
  };

  speechSynthesis.speak(utterance);
}

function sanitizeForSpeech(text) {
  return text
    .replace(/[•*#_=~`^<>]/g, "")
    .replace(/[()[\]{}]/g, "")
    .replace(/[:;|]/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function renderChapterGrid() {
  const grid = document.getElementById("chapterGrid");
  grid.innerHTML = "";

  data.chapters.forEach((ch) => {
    const card = document.createElement("div");
    card.className = "chapter-card";

    const chapterNumber =
      ch.chapter_number === "Gita Mahatyam"
        ? ""
        : currentLang === "en"
        ? `Chapter ${ch.chapter_number}`
        : `${ch.chapter_number}వ అధ్యాయము`;

    const chapterName =
      currentLang === "en" ? ch.chapter_title : ch.chapter_title_te;

    const verseCount =
      currentLang === "en"
        ? `${ch.shlokas.length} Verses`
        : `${ch.shlokas.length} శ్లోకములు`;

    const desc =
      currentLang === "en"
        ? ch.chapter_description.en
        : ch.chapter_description.te;

    card.innerHTML = `
      <h3>${chapterNumber}</h3>
      <h4>${chapterName}</h4>
      <p class="verse-count">${verseCount}</p>
      <p>${desc.slice(0, 180)}...</p>
    `;

    card.onclick = () => openPanel(ch);
    grid.appendChild(card);
  });
}

function openPanel(ch) {
  currentChapter = ch;
  document.getElementById("panelModal").classList.remove("hidden");

  const title =
    ch.chapter_number === "Gita Mahatyam"
      ? currentLang === "en"
        ? ch.chapter_title
        : ch.chapter_title_te
      : currentLang === "en"
      ? `Chapter ${ch.chapter_number}: ${ch.chapter_title}`
      : `${ch.chapter_number}వ అధ్యాయము: ${ch.chapter_title_te}`;

  document.getElementById("panelTitle").innerText = title;

  const desc =
    currentLang === "en"
      ? ch.chapter_description.en
      : ch.chapter_description.te;

  const descEl = document.getElementById("panelDesc");
  descEl.innerHTML = `
    <span>${desc}</span>
    <span style="margin-left:8px; cursor:pointer;">▶</span>
  `;

  const speakIcon = descEl.querySelector("span:last-child");
  speakIcon.onclick = () =>
    speakMeaning(`${title}. ${desc}`, currentLang, speakIcon);

  renderShlokaPanels();
}

function renderShlokaPanels() {
  const root = document.getElementById("shlokaPanels");
  root.innerHTML = "";

  currentChapter.shlokas.forEach((s) => {
    const panel = document.createElement("div");
    panel.className = "shloka-panel inactive";

    const shlokaLabel =
      currentLang === "en"
        ? `Shloka ${s.shloka_number}`
        : `${s.shloka_number}వ శ్లోకం`;

    const shlokaHtml =
      currentLang === "en"
        ? `<div class="shloka-en">${s.shloka_english.join("<br>")}</div>`
        : `<div class="shloka-te">${s.shloka_telugu.join("<br>")}</div>`;

    const meaningHtml =
      currentLang === "en"
        ? `
          <div class="shloka-en-meaning">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
              <span>Meaning</span>
              <span class="speak-icon" title="Read aloud">▶</span>
            </div>
            <div class="meaning-text">${s.meaning.en}</div>
          </div>
        `
        : `
          <div class="shloka-te-meaning">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
              <span>భావము</span>
              <span class="speak-icon" title="Read aloud">▶</span>
            </div>
            <div class="meaning-text">${s.meaning.te}</div>
          </div>
        `;

    panel.innerHTML = `
      <div class="shloka-header">${shlokaLabel}</div>
      <div class="shloka-body">
        ${shlokaHtml}
        ${meaningHtml}
      </div>
    `;

    const speakIcon = panel.querySelector(".speak-icon");
    const meaningDiv = panel.querySelector(".meaning-text");

    if (speakIcon && meaningDiv) {
      speakIcon.onclick = (e) => {
        e.stopPropagation();
        speakMeaning(meaningDiv.innerText, currentLang, speakIcon);
      };
    }

    panel.onclick = () => activatePanel(panel);
    root.appendChild(panel);
  });
}

function activatePanel(panel) {
  document.querySelectorAll(".shloka-panel").forEach((p) => {
    p.classList.remove("active");
    p.classList.add("inactive");
  });
  panel.classList.add("active");
}

function closePanel() {
  document.getElementById("panelModal").classList.add("hidden");
  currentChapter = null;
}

function setLang(lang) {
  currentLang = lang;
  const teBtn = document.getElementById("te");
  const enBtn = document.getElementById("en");
  [teBtn, enBtn].forEach((btn) => {
    if (!btn) return;
    btn.style.backgroundColor = "";
    btn.style.color = "";
  });
  const activeBtn = document.getElementById(lang);
  if (activeBtn) {
    activeBtn.style.backgroundColor = "#e6c067";
    activeBtn.style.color = "#1a1a1a";
  }
  if (currentChapter) openPanel(currentChapter, lang);
}
