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

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const topicIndex = JSON.parse(fs.readFileSync(path.join(process.cwd(), "TopicIndex.json"),"utf-8"));

const rulesText = fs.readFileSync(path.join(__dirname, "Data", "Rules.txt"), "utf8");
const translateTE = fs.readFileSync(path.join(__dirname, "Data", "TranslateTE.txt"), "utf8");
const translateEN = fs.readFileSync(path.join(__dirname, "Data", "TranslateEN.txt"), "utf8");
const modeBeginner = fs.readFileSync(path.join(__dirname, "Data", "ModeBeginner.txt"), "utf8");
const modeAdvanced = fs.readFileSync(path.join(__dirname, "Data", "ModeAdvanced.txt"), "utf8");

const introText = fs.readFileSync(path.join(__dirname, "Data", "Introduction.txt"), "utf8");
const chapterText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapters.txt"), "utf8");
const chapterOneText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter1.txt"), "utf8");
const chapterTwoText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter2.txt"), "utf8");
const chapterThreeText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter3.txt"), "utf8");
const conclusionText = fs.readFileSync(path.join(__dirname, "Data", "Conclusion.txt"), "utf8");

const combinedText = `
  === GENERAL INTRODUCTION ===
  ${introText} 
  === CHAPTER 1 ===
  ${chapterOneText}
  === CHAPTER 2 ===
  ${chapterTwoText}
  === CHAPTER 3 ===
  ${chapterThreeText}
  === CONCLUSION ===
  ${conclusionText}
`

const isLocalhost = process.env.NODE_ENV !== "production" && (process.env.HOST === "localhost" || !process.env.RENDER);
if (isLocalhost) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
} 
else {
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// function getTextInfo(chapter) {
//   switch (chapter) {
//     case "INTRO":
//       return introText;
//     case "VIDVESWARA":
//       return chapterOneText;
//     case "RUDRA":
//       return chapterTwoText;
//     case "SHATA RUTRA":
//       return chapterThreeText;
//     case "KOTI RUTRA":
//       return chapterFourText;
//     case "UMAA":
//       return chapterFiveText;
//     case "KAILASA":
//       return chapterSixText;
//     case "VAYAVEEYA":
//       return chapterSevenText;
//     default: 
//       return combinedText;
//   }
// }

function buildSystemPrompt({ language, mode }) { 
  const languageRule = language === "te" ? `${translateTE}` : `${translateEN}`; 
  const modeRule = mode === "advanced" ? `${modeAdvanced}` : `${modeBeginner}`; 
  return `
  ${rulesText} 
  --- OUTPUT LANGUAGE RULES ---
  ${languageRule} 
  --- EXPLANATION MODE ---
  ${modeRule}`; 
}

function similarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function findTopic(question) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });
  const qVec = res.data[0].embedding;
  let best = null;
  let bestScore = 0;
  for (const t of topicIndex) {
    const score = similarity(qVec, t.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return bestScore > 0.40 ? best : null;
}

function normalize(s) {
  return s
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/[0-9\-–—.:;?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractContent(topicTe, text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const target = normalize(topicTe);
  let collecting = false;
  const buffer = [];
  for (const line of lines) {
    const clean = normalize(line);
    if (!collecting && clean.startsWith("##") && clean.includes(target)) {
      collecting = true;
      continue;
    }
    if (collecting && clean.startsWith("##")) {
      break;
    }
    if (collecting) buffer.push(line);
  }
  return buffer.length ? buffer.join("\n").trim() : null;
}

app.post("/ask", async (req, res) => {
  try {
    const { question, language, mode } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    let topic, chText, sourceText, chapter;

    topic = await findTopic(question);
    if(topic !== null){
      // chText = getTextInfo(topic.section)
      chapter = topic.section || "";
      sourceText = extractContent(topic.topic_te, combinedText);
      // console.log(chapter, "\n", sourceText)
    }

    const systemPrompt = buildSystemPrompt({ language, mode });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            `SOURCE TEXT (Authoritative):\n` +
            `${sourceText}\n\n` +
            `NOTE: If the source text contains shlokas, include them and explain their meaning.` +
            `QUESTION:\n${question}`
        }
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
        referenceTextLength: sourceText?.length,
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