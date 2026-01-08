import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const isLocalhost = process.env.NODE_ENV !== "production" && (process.env.HOST === "localhost" || !process.env.RENDER);
if (isLocalhost) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
} else {
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
}

const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "Data", "Topics.json"),"utf-8"));

async function run() {
  const index = [];

  for (const sectionKey in data) {
    const section = data[sectionKey];

    for (let i = 0; i < section.topics.length; i++) {
      const res = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: section.topics[i]
      });

      index.push({
        section: sectionKey,
        i,
        topic_en: section.topics[i],
        topic_te: section.topics_te[i],
        embedding: res.data[0].embedding
      });
    }
  }

  fs.writeFileSync("TopicIndex.json", JSON.stringify(index));
  console.log("TopicIndex.json created");
}

run();