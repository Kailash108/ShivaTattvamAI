if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

function toggleStructure() {
  const panel = document.getElementById("structurePanel");
  const body = document.body;

  panel.classList.toggle("hidden");
  body.classList.toggle("structure-open", !panel.classList.contains("hidden"));
}

setTimeout(() => {
  fetch("/health").catch(() => {});
}, 1000);

async function ask() {
  const btn = document.querySelector(".ask-btn");
  const loader = document.getElementById("loader");
  const question = q.value.trim();

  if (!question) return;

  addUser(question);
  q.value = "";
  loader.style.display = "block";
  btn.classList.add("loading");

  const chapter = document.getElementById("chapters").value;

  try {
    console.group("🧠 ASK REQUEST");

    const payload = {
      question,
      language: lang.value,
      mode: mode.value,
      chapter
    };

    console.log("📤 Request payload:", payload);

    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("📥 Response status:", res.status, res.statusText);
    console.log("📥 Response headers:", [...res.headers.entries()]);

    const rawText = await res.text();
    console.log("📦 Raw response text:", rawText);

    if (!res.ok) {
      throw new Error(`Server error ${res.status}: ${rawText}`);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (jsonErr) {
      console.error("❌ JSON parse failed:", jsonErr);
      throw new Error("Invalid JSON from server");
    }

    console.log("✅ Parsed response JSON:", data);

    if (!data.answer) {
      throw new Error("Empty AI response");
    }

    btn.classList.remove("loading");
    addAI(data.answer);

    console.groupEnd();
  } catch (err) {
    console.group("❌ ASK ERROR");
    console.error(err);
    console.groupEnd();

    btn.classList.remove("loading");
    addAI("⚠️ Unable to get AI response. Please try again.");
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
  readIcon.className = "read-icon";
  readIcon.innerHTML = "🔊";
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

document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/chapters")
    .then((res) => res.json())
    .then((data) => {
      const select = document.getElementById("chapters");
      if (!select) return;

      select.innerHTML = "";

      Object.entries(data).forEach(([id, chapter]) => {
        const option = document.createElement("option");
        option.value = chapter.id;
        option.textContent = chapter.title;
        select.appendChild(option);
      });
      
    })
    .catch((err) => {
      console.error("Failed to update chapters dropdown:", err);
    });
});

let topicsData = {};
const structureContent = document.getElementById("structureContent");

fetch("api/topics")
  .then(res => res.json())
  .then(data => {
    topicsData = data;
    renderByChapter("INTRO");
  });

document.getElementById("chapters")
  .addEventListener("change", e => {
    renderByChapter(e.target.value);
  });


function renderByChapter(selectedChapter) {
  structureContent
    .querySelectorAll(".samhita-card")
    .forEach(el => el.remove());

  const keys = selectedChapter
    ? [selectedChapter]
    : Object.keys(topicsData);

  keys.forEach((key, index) => {
    const data = topicsData[key];
    if (!data) return;

    const card = createSamhitaCard(key, data);
    structureContent.appendChild(card);
    if (selectedChapter && index === 0) {
      requestAnimationFrame(() => {
        
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
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
    data.topics.forEach(topic => {
      const li = document.createElement("li");
      li.textContent = topic;

      li.addEventListener("click", e => {
        e.stopPropagation();
        let text = "Elaborate on " + topic;
        navigator.clipboard.writeText(text);
        alert("[" + topic + "] is copied")
      });

      ul.appendChild(li);
    });
  }

  card.querySelector(".samhita-header")
    .addEventListener("click", () => {
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
    if (iconEl) iconEl.innerHTML = "🔊";
    return;
  }

  const cleanText = sanitizeForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.lang = language === "te" ? "te-IN" : "en-IN";
  utterance.rate = language === "te" ? 1 : 1;
  utterance.pitch = 1;

  utterance.onstart = () => {
    currentUtterance = utterance;
    if (iconEl) iconEl.innerHTML = "⏹️";
  };

  utterance.onend = () => {
    currentUtterance = null;
    if (iconEl) iconEl.innerHTML = "🔊";
  };

  utterance.onerror = () => {
    currentUtterance = null;
    if (iconEl) iconEl.innerHTML = "🔊";
  };

  speechSynthesis.speak(utterance);
}

function exportPDF() {
  const messages = document.querySelectorAll(".msg");
  if (!messages.length) {
    alert("No dialogue to export.");
    return;
  }

  const temp = document.createElement("div");
  temp.style.fontFamily = '"Cormorant Garamond", serif';
  temp.style.fontSize = "14px";
  temp.style.lineHeight = "1.5";
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
      filename: "Shiva Puranam Dialogue.pdf",
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
