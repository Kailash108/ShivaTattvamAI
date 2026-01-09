window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };

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
    const payload = {
      question,
      language: lang.value,
      mode: mode.value,
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
    console.group("ASK ERROR");
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

let topicsData = {};
const structureContent = document.getElementById("structureContent");

fetch("api/topics")
  .then(res => res.json())
  .then(data => {
    topicsData = data;
    renderAllSamhitas();
  });

function renderAllSamhitas() {
  structureContent
    .querySelectorAll(".samhita-card")
    .forEach(el => el.remove());

  Object.keys(topicsData).forEach(key => {
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
    data.topics.forEach(topic => {
      const li = document.createElement("li");
      li.textContent = topic;

      li.addEventListener("click", e => {
        e.stopPropagation();
        let text;
        if (topic.includes("Summarize")){
          text = topic;
        }
        else{
          text = "Elaborate on " + topic;
        }
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

let currDate = new Date().toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).replace(" at", ",");
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
      filename: `Shiva_Puraanam_Dialogue_${currDate.replace(/[ ,:]/g, "_")}.pdf`,
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
