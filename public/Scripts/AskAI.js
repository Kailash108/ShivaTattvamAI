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

  try {
    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        language: lang.value,
        mode: mode.value,
      }),
    });
    if (!res.ok) {
      throw new Error("Server error: " + res.status);
    }
    const data = await res.json();
    if (!data.answer) {
      throw new Error("Empty AI response");
    }

    btn.classList.remove("loading");
    addAI(data.answer);
  } catch (err) {
    console.error("ASK ERROR:", err);
    addAI("⚠️ Unable to get AI response on mobile. Please try again.");
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

function sanitizeForSpeech(text, language) {
  if (language === "te") {
    return text;
  }
  return text
    .replace(/[•*#_=~`^<>]/g, "")
    .replace(/[()[\]{}]/g, "")
    .replace(/[:;|]/g, ",")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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

  const cleanText = sanitizeForSpeech(text, language);
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
  temp.style.fontFamily = '"Noto Serif Telugu", serif';
  temp.style.fontSize = "14px";
  temp.style.lineHeight = "1.5";
  temp.style.color = "#000";
  temp.style.background = "#fff";

  messages.forEach((msg) => {
    const isUser = msg.classList.contains("user");
    const label = isUser ? "Question" : "Answer";
    const text = msg.querySelector(".bubble").innerText;
    const block = document.createElement("div");
    block.style.marginBottom = "16px";
    block.innerText = `${label}:\n${text}`;
    temp.appendChild(block);
  });
  document.body.appendChild(temp);

  html2pdf()
    .set({
      margin: 10,
      filename: "Shiva Puranam Dialogue.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 1 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(temp)
    .save()
    .then(() => {
      document.body.removeChild(temp);
    });
}
