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
app.get("/api/shivagita", (req, res) => {
  res.sendFile(path.join(__dirname, "Data", "ShivaGita.json"));
});

app.get("/api/vapid-public-key", (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});
app.post("/api/save-subscription", async (req, res) => {
  try {
    await req.body;
    const { endpoint, keys } = req.body;

    await db.collection(process.env.NOTIF_COLLECTION).insertOne({
      endpoint,
      keys,
      createdAt: new Date()
    });
    res.json({ success: true });
  } 
  catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});

app.get("/admin/notify", (req, res) => {
  res.sendFile(path.join(__dirname, "generateNotif.html"));
});

import { execFile } from "child_process";
app.post("/api/admin/run-notif", (req, res) => {
  const { title, body, secret } = req.body;

  if (secret !== process.env.ADMIN_NOTIFY_SECRET) {
    return res.status(401).json({ ok: false });
  }

  execFile("node", ["generateNotif.js", title, body],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ ok: false });
      }
      res.json({ ok: true });
    }
  );
});



app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const topicIndex = JSON.parse(fs.readFileSync(path.join(process.cwd(), "TopicIndex.json"),"utf-8"));

const rulesText = fs.readFileSync(path.join(__dirname, "Data", "Rules.txt"), "utf8");
const rulesSGText = fs.readFileSync(path.join(__dirname, "Data", "RulesSG.txt"), "utf8");

const translateTE = fs.readFileSync(path.join(__dirname, "Data", "TranslateTE.txt"), "utf8");
const translateEN = fs.readFileSync(path.join(__dirname, "Data", "TranslateEN.txt"), "utf8");
const modeBeginner = fs.readFileSync(path.join(__dirname, "Data", "ModeBeginner.txt"), "utf8");
const modeAdvanced = fs.readFileSync(path.join(__dirname, "Data", "ModeAdvanced.txt"), "utf8");

const introText = fs.readFileSync(path.join(__dirname, "Data", "Introduction.txt"), "utf8");
const chapterOneText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter1.txt"), "utf8");
const chapterTwoText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter2.txt"), "utf8");
const chapterThreeText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter3.txt"), "utf8");
const chapterFourText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter4.txt"), "utf8");
const chapterFiveText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter5.txt"), "utf8");
const chapterSixText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter6.txt"), "utf8");
const chapterSevenText = fs.readFileSync(path.join(__dirname, "Data", "Chapters", "Chapter7.txt"), "utf8");
const conclusionText = fs.readFileSync(path.join(__dirname, "Data", "Conclusion.txt"), "utf8");

const shivaGitaData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "Data", "ShivaGita.json"), "utf8")
);

const combinedText = `
  === GENERAL INTRODUCTION ===
  ${introText} 
  === CHAPTER 1 ===
  ${chapterOneText}
  === CHAPTER 2 ===
  ${chapterTwoText}
  === CHAPTER 3 ===
  ${chapterThreeText}
  === CHAPTER 4 ===
  ${chapterFourText}
  === CHAPTER 5 ===
  ${chapterFiveText}
  === CHAPTER 6 ===
  ${chapterSixText}
  === CHAPTER 7 ===
  ${chapterSevenText}
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

function getTextInfo(chapter) {
  switch (chapter) {
    case "INTRO":
      return introText;
    case "VIDVESWARA":
      return chapterOneText;
    case "RUDRA":
      return chapterTwoText;
    case "SHATA RUTRA":
      return chapterThreeText;
    case "KOTI RUTRA":
      return chapterFourText;
    case "UMAA":
      return chapterFiveText;
    case "KAILASA":
      return chapterSixText;
    case "VAYAVEEYA":
      return chapterSevenText;
    default: 
      return combinedText;
  }
}

function getShivaGitaContext(question) {
  const q = question.toLowerCase()
    .replace(/\b(first|1st)\b/g, "1")
    .replace(/\b(second|2nd)\b/g, "2")
    .replace(/\b(third|3rd)\b/g, "3")
    .replace(/\b(fourth|4th)\b/g, "4")
    .replace(/\b(fifth|5th)\b/g, "5")
    .replace(/\b(sixth|6th)\b/g, "6")
    .replace(/\b(seventh|7th)\b/g, "7")
    .replace(/\b(eigth|8th)\b/g, "8")
    .replace(/\b(ninth|9th)\b/g, "9")
    .replace(/\b(tenth|10th)\b/g, "10")
    .replace(/\b(eleventh|11th)\b/g, "11")
    .replace(/\b(twelveth|12th)\b/g, "12")
    .replace(/\b(thirteenth|13th)\b/g, "13")
    .replace(/\b(fourteenth|14th)\b/g, "14")
    .replace(/\b(fifteenth|15th)\b/g, "15")
    .replace(/\b(sixteenth|16th)\b/g, "16")
    .replace(/\b(verses|verse|sloka|shlokas)\b/g, "shloka");

  const chapterMatch = q.match(/\bchapter\s*(\d+)\b/) || q.match(/\bchapter\s*-\s*(\d+)\b/); 

  const chapterNum = chapterMatch ? Number(chapterMatch[1]) : null;

  const isGitaMahatyam = /\b(introduction|intro|gita\s*mahaty?am|gīta\s*mahāty?am)\b/.test(q);

  let shlokaNums = [];

  const rangeMatch = q.match(/\bshloka\s*(\d+)\s*(to|\-)\s*(\d+)\b/) || q.match(/\bshloka\s*(\d+)\s*[–-]\s*(\d+)\b/);        

  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[3] || rangeMatch[2]);
    for (let i = start; i <= end; i++) shlokaNums.push(i);
  }

  const listMatch = q.match(/\bshloka\s*([\d,\sand]+)\b/);
  if (listMatch && !rangeMatch) {
    shlokaNums = listMatch[1]
      .split(/,|and/)
      .map(n => Number(n.trim()))
      .filter(n => !isNaN(n));
  }

  let ch = null;

  if (isGitaMahatyam) {
    ch = shivaGitaData.chapters.find(
      c => c.chapter_number === "Gita Mahatyam"
    );
  } 
  else if (chapterNum !== null) {
    ch = shivaGitaData.chapters.find(
      c => c.chapter_number === chapterNum
    );
  }

  if (!ch && shlokaNums.length === 0) {
    return shivaGitaData.chapters
      .map(c => `Chapter ${c.chapter_number}:\n${c.chapter_description.en}`)
      .join("\n\n");
  }

  if (!ch && shlokaNums.length > 0) {
    return "__INVALID_REFERENCE__";
  }

  if (shlokaNums.length === 0) {
    return `Chapter ${ch.chapter_number}\n${ch.chapter_description.en}`;
  }

  const uniqueNums = [...new Set(shlokaNums)].sort((a, b) => a - b);

  const selected = uniqueNums
    .map(num => {
      const sh = ch.shlokas.find(s => s.shloka_number === num);
      if (!sh) return null;
      return `Shloka ${num}:\n${sh.meaning.en}`;
    })
    .filter(Boolean);

  if (!selected.length) return "__INVALID_REFERENCE__";

  return `Chapter ${ch.chapter_number}\n\n${selected.join("\n\n")}`;
}

function buildSystemPrompt({ language, mode, source }) { 
  const baseRules = source === "shivapuranam" ? rulesText : rulesSGText;
  const languageRule = language === "te" ? translateTE : translateEN;
  const modeRule = mode === "advanced" ? modeAdvanced : modeBeginner;

  return `
    ${baseRules}
    --- OUTPUT LANGUAGE RULES ---
    ${languageRule}
    --- EXPLANATION MODE ---
    ${modeRule}
    `.trim();
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
  return bestScore > 0.25 ? best : null;
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
    const { question, language, mode, source } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    let topic = null;
    let sourceText = null;
    let chapter = "";

    if (source === "shivagita") {
      sourceText = getShivaGitaContext(question);
      chapter = "Shiva Gita";
      // console.log(sourceText)
    } 
    else {
      topic = await findTopic(question);
      if (topic !== null) {
        const chText = getTextInfo(topic.section);
        chapter = topic.section || "";
        sourceText = extractContent(topic.topic_te, chText);
      }
    }

    const systemPrompt = buildSystemPrompt({ language, mode, source });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            `SOURCE TEXT (Authoritative):
            ${sourceText}
            NOTE: Do NOT mix sources. Stay strictly within the given text.
            QUESTION:
            ${question}
            `.trim()
        }
      ],
    });

    const answer = response.choices[0].message.content.trim();
    
    const sessionLogs = {
        Event: "LLM_USAGE",
        Model: response.model,
        PromptTokens: response.usage?.prompt_tokens,
        CompletionTokens: response.usage?.completion_tokens,
        TotalTokens: response.usage?.total_tokens,
        Chapter: chapter,
        TeluguTopic: topic ? topic.topic_te : null,
        EnglishTopic: topic ? topic.topic_en : null,
        SystemPromptLength: systemPrompt.length,
        UserQuestionLength: question.length,
        ReferenceTextLength: sourceText?.length,
        Mode: mode,
        Language: language,
        Question: question,
        AnswerLength: answer.length,
        DateTime: new Date().toLocaleString("en-GB", { hour12: true })
    };
    // console.log(sessionLogs.TotalTokens, sessionLogs.ReferenceTextLength)
    
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