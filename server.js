import express from "express";
import fs from "fs";
import OpenAI from "openai";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/api/topics", (req, res) => {
  res.sendFile(path.join(__dirname, "Data", "Topics.json"));
});
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const rulesText = fs.readFileSync(path.join(__dirname, "Data", "Rules.txt"), "utf8");
const introText = fs.readFileSync(path.join(__dirname, "Data", "Introduction.txt"), "utf8");
const chapterText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapters.txt"), "utf8");
const chapterOneText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter1.txt"), "utf8");
const chapterTwoText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter2.txt"), "utf8");

const combinedText = `
    === GENERAL INTRODUCTION ===
    ${introText} 
    === END OF GENERAL INTRODUCTION ===
    === CHAPTER & SUB TOPIC CONTENT ===
    ${chapterText}
    === END OF CHAPTER & SUB TOPIC CONTENT ===
    === CHAPTER 1 ===
    ${chapterOneText}
    === END OF CHAPTER 1 ===
    === CHAPTER 2 ===
    ${chapterTwoText}
    === END OF CHAPTER 2 ===
`

const isLocalhost = process.env.NODE_ENV !== "production" && (process.env.HOST === "localhost" || !process.env.RENDER);

if (isLocalhost) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
} else {
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TELUGU_REGEX = /[\u0C00-\u0C7F]/;
const ENGLISH_REGEX = /[A-Za-z]/;

function detectLanguageProfile(text) {
  return {
    hasTelugu: TELUGU_REGEX.test(text),
    hasEnglish: ENGLISH_REGEX.test(text),
  };
}

function needsTranslation(text, targetLang) {
  const { hasTelugu, hasEnglish } = detectLanguageProfile(text);
  if (targetLang === "en") {
    return hasTelugu;
  }
  if (targetLang === "te") {
    return hasEnglish;
  }
  return false;
}

async function translateText(text, targetLang, openai) {
  const target = targetLang === "en" ? "English" : "Telugu";
  const prompt = `
    RULES - 
    Translate the following content into ${target}.
    Content:
    ${text}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });
  return response.choices[0].message.content.trim();
}

function buildModePrompt(mode) {
  if (mode === "advanced") {
    return `
      MODE: ADVANCED
      INSTRUCTIONS:
      - Explain with philosophical depth.
      - Use appropriate Sanskrit terms (explain briefly if needed).
      - Focus on tattva, symbolism, and deeper meaning.
      `;
        }

  return `
      MODE: BEGINNER
      INSTRUCTIONS:
      - Explain in simple, clear language.
      - Avoid heavy Sanskrit unless necessary (explain when used).
      - Use stories, analogies, or examples where helpful.
      - Focus on clarity and gradual understanding.
      - Do not overwhelm the reader.
      `;
}


async function enforceLanguage(answer, responseLanguage, openai) {
  if (!needsTranslation(answer, responseLanguage)) {
    return answer;
  }
  return await translateText(answer, responseLanguage, openai);
}

app.post("/ask", async (req, res) => {
    const { question, language, mode } = req.body;
    console.log("Request received:", req.body);
  try {
    const question = req.body.question;
    const selectedMode = mode === 'beginner' ? 'beginner' : 'advanced';
    const modePrompt = buildModePrompt(selectedMode);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `rulesText.replace("{{LANG}}", language) ${modePrompt}`,
        },
        {
          role: "user",
          content: `TEXT: ${combinedText} 
          QUESTION: ${question}`
        }
      ]
    });
    let answer = response.choices[0].message.content.trim();
    answer = await enforceLanguage(answer, language, openai);
    res.json({ answer });
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
