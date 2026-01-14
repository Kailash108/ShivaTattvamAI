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

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

function toggleStructure() {
  const panel = document.getElementById("structurePanel");
  const btnToggle = document.getElementById("btnToggle");

  const isClosed = !panel.classList.contains("show");

  if (isClosed) {
    panel.classList.remove("hidden");
    setTimeout(() => panel.classList.add("show"), 10);
  } else {
    panel.classList.remove("show");
    setTimeout(() => panel.classList.add("hidden"), 300);
  }

  btnToggle.style.backgroundColor = isClosed ? "#e6c067" : "";
  btnToggle.style.color = isClosed ? "#0e0922" : "";
}


async function ask() {
  const btn = document.querySelector(".ask-btn");
  const loader = document.getElementById("loader");
  const question = q.value.trim();

  if (!question) return;

  addUser(question);
  q.value = "";
  loader.style.display = "block";
  btn.classList.add("loading");

  try {
    // if (/[^\p{Script=Latin}\s\d.,!?'"():;\-]/u.test(question)) {
    //   btn.classList.remove("loading");
    //   addAI("Only English is supported in question.");
    //   addAI("Please ask your question in English or in any language written using English letters.")
    //   return;
    // }
    const payload = {
      question,
      language: lang.value,
      mode: mode.value,
      source: source.value,
    };

    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();

    if (!res.ok) {
      throw new Error(`Server error ${res.status}: ${rawText}`);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (jsonErr) {
      console.error("JSON parse failed:", jsonErr);
      throw new Error("Invalid JSON from server");
    }

    if (!data.answer) {
      throw new Error("Empty AI response");
    }
    btn.classList.remove("loading");
    addAI(data.answer);

    console.groupEnd();
  } catch (err) {
    console.error(err);
    console.groupEnd();

    btn.classList.remove("loading");
    addAI("Unable to get AI response. Please try again.");
  }
}
q.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    ask();
  }
});

function addUser(text) {
  dialogue.innerHTML += `
    <div class="msg user">
      <div class="label">Question</div>
      <div class="bubble">${text}</div>
    </div>`;
  dialogue.scrollTop = dialogue.scrollHeight;
}

function addAI(text) {
  removePreviousReadIcons();

  const msg = document.createElement("div");
  msg.className = "msg ai";
  msg.innerHTML = `<div class="label">Answer</div>`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  msg.appendChild(bubble);
  dialogue.appendChild(msg);

  const readIcon = document.createElement("span");
  readIcon.style.color = "#e6c067";
  readIcon.className = "read-icon";
  readIcon.innerHTML = "▶";
  readIcon.title = "Read aloud";
  readIcon.onclick = () => {
    speak(text, lang.value, readIcon);
  };

  if (isVerse(text)) {
    bubble.innerText = text;
  } else {
    animateProse(text, bubble);
  }

  msg.appendChild(readIcon);
  dialogue.appendChild(msg);
  dialogue.scrollTop = dialogue.scrollHeight;
}

let topicsData = {};
const structureContent = document.getElementById("structureContent");

function loadStructure() {
  const source = document.getElementById("source").value;

  if (source === "shivapuranam") {
    loadPuranaStructure();
  } else if (source === "shivagita") {
    loadGitaStructure();
  }
}

loadStructure();

function loadPuranaStructure() {
  fetch("/api/topics")
    .then((res) => res.json())
    .then((data) => {
      topicsData = data;
      renderAllSamhitas();
    });
}

function loadGitaStructure() {
  fetch("/api/shivagita")
    .then((res) => res.json())
    .then((data) => {
      renderGitaStructure(data.chapters);
    });
}

function popup(msg) {
  const p = document.createElement("div");
  p.style = `
      position:fixed;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      color:#c49b3a;
      background:radial-gradient(circle, #1e1a31 0%, #0e0922 80%);
      padding:15px;
      border: #c49b3a solid;
      border-radius:8px;
      z-index:9999`;
  p.innerHTML = msg;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 3000);
}

function preview(lines) {
  return lines.length > 10
    ? [...lines.slice(0, 5), "…", ...lines.slice(-5)].join("<br>")
    : lines.join("<br>");
}

function renderGitaStructure(chapters) {
  structureContent.innerHTML = `
    <h1>Instructions:</h1>
    <p>- Click on any Shloka range from any chapter to copy it to the clipboard.</p>
    <p>- Paste the copied range into the Ask box to get a quick and focused explanation.</p>
    <div style="text-align:center">
      <button rel="noopener noreferrer" class="theme-btn" onclick="window.open('SG.html', '_blank')">
        Open Shloka Page
      </button>
    </div>
  `;

  chapters.forEach((chapter) => {
    const card = document.createElement("div");
    card.className = "samhita-card";

    let ranges = "";

    for (let i = 0; i < chapter.shlokas.length; i += 5) {
      const start = chapter.shlokas[i].shloka_number;
      const end = chapter.shlokas[Math.min(i + 4, chapter.shlokas.length - 1)].shloka_number;

      ranges += `<li>Shlokas ${start}–${end}</li>`;
    }

    let chapterRender = chapter.chapter_number === "Gita Mahatyam" ? 
      `${chapter.chapter_title}` : `Chapter ${chapter.chapter_number} – ${chapter.chapter_title}`;

    card.innerHTML = `
      <div class="samhita-header">
        <div class="samhita-title">
          ${chapterRender}
        </div>
        <div class="samhita-toggle">&#8595;</div>
      </div>
      <div class="samhita-content">
        <ul>${ranges}</ul>
      </div>
    `;

    card.querySelector(".samhita-header").onclick = () =>
      card.classList.toggle("active");

    [...card.querySelectorAll("li")].forEach((li, idx) => {
      const start = chapter.shlokas[idx * 5].shloka_number;
      const end = chapter.shlokas[Math.min(idx * 5 + 4, chapter.shlokas.length - 1)].shloka_number;

      let popupRender = chapter.chapter_number === "Gita Mahatyam" ? 
        `${chapter.chapter_number}, Shloka range (${start}-${end}) is copied`
          : `Chapter ${chapter.chapter_number}, Shloka range (${start}-${end}) is copied`
        
      li.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`Explain Shiva Gita Chapter - ${chapter.chapter_number}, Shlokas ${start}–${end}`);
        popup(`${popupRender}`);
      };
    });

    structureContent.appendChild(card);
  });
}

function renderAllSamhitas() {
  structureContent.innerHTML = `
    <h1>Instructions:</h1>
    <p>- Click a sub-topic from any chapter to copy it to the clipboard.</p>
    <p>- Paste the copied sub-topic into the Ask box to get a quick and focused explanation.</p>`;

  structureContent
    .querySelectorAll(".samhita-card")
    .forEach((el) => el.remove());

  Object.keys(topicsData).forEach((key) => {
    const data = topicsData[key];
    if (!data) return;

    const card = createSamhitaCard(key, data);
    structureContent.appendChild(card);
  });
}

function createSamhitaCard(id, data) {
  const card = document.createElement("div");
  card.className = "samhita-card";
  card.dataset.samhitaId = id;

  card.innerHTML = `
    <div class="samhita-header">
      <div class="samhita-title">${data.title}</div>
      <div class="samhita-toggle">&#8595;</div>
    </div>
    <div class="samhita-content">
      <ul></ul>
    </div>
  `;

  const ul = card.querySelector("ul");

  if (!data.topics || data.topics.length === 0) {
    ul.innerHTML = "<li>No topics available</li>";
  } else {
    data.topics.forEach((topic) => {
      const li = document.createElement("li");
      li.textContent = topic;

      li.addEventListener("click", (e) => {
        e.stopPropagation();
        let text;
        if (topic.includes("Summarize")) {
          text = topic;
        } else {
          text = "Elaborate on " + topic;
        }
        navigator.clipboard.writeText(text);
        popup(`<b>${topic}</b> is copied to clipboard`);
      });

      ul.appendChild(li);
    });
  }

  card.querySelector(".samhita-header").addEventListener("click", () => {
    card.classList.toggle("active");
  });

  return card;
}

function isVerse(text) {
  return (
    text.includes("॥") || text.split("\n").length > 2 || /^[0-9]+\./m.test(text)
  );
}

function animateProse(text, container) {
  container.innerHTML = "";
  text.split(" ").forEach((word, i) => {
    const span = document.createElement("span");
    span.className = "word";
    span.style.animationDelay = `${i * 0.05}s`;
    span.innerText = word + " ";
    container.appendChild(span);
  });
}

function sanitizeForSpeech(text) {
  return text
    .replace(/[•*#_=~`^<>]/g, "")
    .replace(/[()[\]{}]/g, "")
    .replace(/[:;|]/g, ",")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function removePreviousReadIcons() {
  const icons = document.querySelectorAll(".read-icon");
  icons.forEach((icon) => icon.remove());
}

let currentUtterance = null;
function speak(text, language, iconEl) {
  if (!("speechSynthesis" in window)) {
    alert("Text to Speech not supported in this browser");
    return;
  }

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    currentUtterance = null;
    iconEl.style.color = "#e6c067";
    if (iconEl) iconEl.innerHTML = "▶";
    return;
  }

  const cleanText = sanitizeForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(cleanText);
  iconEl.style.color = "#e6c067";

  utterance.lang = language === "te" ? "te-IN" : "en-IN";
  utterance.rate = language === "te" ? 1 : 1;
  utterance.pitch = 1;

  utterance.onstart = () => {
    currentUtterance = utterance;
    if (iconEl) iconEl.innerHTML = "⏸";
  };

  utterance.onend = () => {
    currentUtterance = null;
    if (iconEl) iconEl.innerHTML = "▶";
  };

  utterance.onerror = () => {
    currentUtterance = null;
    if (iconEl) iconEl.innerHTML = "▶";
  };

  speechSynthesis.speak(utterance);
}

let currDate = new Date()
  .toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  .replace(" at", ",");
function exportPDF() {
  const messages = document.querySelectorAll(".msg");
  if (!messages.length) {
    alert("No dialogue to export.");
    return;
  }

  const temp = document.createElement("div");
  temp.style.fontFamily = '"Cormorant Garamond", serif';
  temp.style.fontSize = "14px";
  temp.style.lineHeight = "1.0";
  temp.style.color = "#000";
  temp.style.background = "#fff";

  messages.forEach((msg) => {
    const isUser = msg.classList.contains("user");
    const label = isUser ? "Question" : "Answer";
    const text = msg.querySelector(".bubble").innerText;

    const block = document.createElement("div");
    const labelEl = document.createElement("div");
    labelEl.innerText = label + ":";

    const textEl = document.createElement("div");
    textEl.innerText = text;

    if (isUser) {
      textEl.style.fontWeight = "bold";
    }
    block.appendChild(labelEl);
    block.appendChild(textEl);
    temp.appendChild(block);
  });
  document.body.appendChild(temp);

  html2pdf()
    .set({
      margin: 10,
      filename: `Shiva_Puraanam_Dialogue_${currDate.replace(
        /[ ,:]/g,
        "_"
      )}.pdf`,
      image: { type: "png", quality: 1 },
      html2canvas: { scale: 3 },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      },
    })
    .from(temp)
    .save()
    .then(() => {
      document.body.removeChild(temp);
    });
}

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});