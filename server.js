import express from "express";
import fs from "fs";
import OpenAI from "openai";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";


import { MongoClient } from "mongodb";
const MONGO_URI = process.env.MONGO_URI;
let db;
const client = new MongoClient(MONGO_URI);
await client.connect();
db = client.db(); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/api/topics", (req, res) => {
  res.sendFile(path.join(__dirname, "Data", "Topics.json"));
});
app.get("/api/chapters", (req, res) => {
  res.sendFile(path.join(__dirname, "Data", "Chapters.json"));
});
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const rulesText = fs.readFileSync(path.join(__dirname, "Data", "Rules.txt"), "utf8");
const translateTE = fs.readFileSync(path.join(__dirname, "Data", "TranslateTE.txt"), "utf8");
const translateEN = fs.readFileSync(path.join(__dirname, "Data", "TranslateEN.txt"), "utf8");
const modeBeginner = fs.readFileSync(path.join(__dirname, "Data", "ModeBeginner.txt"), "utf8");
const modeAdvanced = fs.readFileSync(path.join(__dirname, "Data", "ModeAdvanced.txt"), "utf8");

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

function getTextInfo(chapter) {
  switch (chapter) {
    case "INTRO":
      return introText;
    case "VIDVESWARA":
      return chapterOneText;
    case "RUDRA":
      return chapterTwoText;
    default: 
      return combinedText;
  }
}

function buildSystemPrompt({ language, mode }) { 
  const languageRule = language === "te" ? `${translateTE}` : `${translateEN}`; 
  const modeRule = mode === "advanced" ? `${modeAdvanced}` : `${modeBeginner}`; 
  return `${rulesText} ${languageRule} ${modeRule}`; 
}

app.post("/ask", async (req, res) => {
  try {
    const { question, language, mode, chapter } = req.body;
    console.log(req.body)

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    let refText;
    refText = getTextInfo(chapter)
    const systemPrompt = buildSystemPrompt({ language, mode });;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: mode === "advanced" ? 0.1 : 0.3,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `
            ${refText}
            QUESTION:
            ${question}
            `,
        },
      ],
    });

    const answer = response.choices[0].message.content.trim();
    
    const sessionLogs = {
        event: "LLM_USAGE",
        model: response.model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        systemPromptLength: systemPrompt.length,
        userQuestionLength: question.length,
        referenceTextLength: refText?.length,
        chapter,
        mode,
        language,
        question,
        answer,
        timestamp: new Date().toLocaleString("en-GB", { hour12: true })
    };

    await db.collection(process.env.COLLECTION).insertOne(sessionLogs);
    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Unable to get AI response",
    });
  }
});

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});