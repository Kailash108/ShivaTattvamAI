import fs from "fs";
import path from "path";

const topics = JSON.parse(fs.readFileSync(path.join(process.cwd(), "Data", "Topics.json"),"utf-8"));

const introText = fs.readFileSync(path.join(process.cwd(), "Data", "Introduction.txt"), "utf8");
const chapterOneText = fs.readFileSync(path.join(process.cwd(), "Data", "Chapters", "Chapter1.txt"), "utf8");
const chapterTwoText = fs.readFileSync(path.join(process.cwd(), "Data", "Chapters", "Chapter2.txt"), "utf8");
const chapterThreeText = fs.readFileSync(path.join(process.cwd(), "Data", "Chapters", "Chapter3.txt"), "utf8");
const conclusionText = fs.readFileSync(path.join(process.cwd(), "Data", "Conclusion.txt"), "utf8");


const content = `
      === GENERAL INTRODUCTION ===
      ${introText} 
      === END OF GENERAL INTRODUCTION ===
      === CHAPTER 1 ===
      ${chapterOneText}
      === END OF CHAPTER 1 ===
      === CHAPTER 2 ===
      ${chapterTwoText}
      === END OF CHAPTER 2 ===
      === CHAPTER 3 ===
      ${chapterThreeText}
      === CONCLUSION ===
      ${conclusionText}
  `

function normalize(s) {
  return s
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/[0-9\-–—.:;?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// extract all headings from content.txt
const headings = content
  .split(/\r?\n/)
  .map(l => l.replace(/^\uFEFF/, "").trim()) // BOM-safe
  .filter(l => /^##\s*/.test(l))
  .map(l => l.replace(/^##\s*/, ""));

console.log("\n--- VALIDATION REPORT ---\n");

for (const sectionKey in topics) {
  const section = topics[sectionKey];

  section.topics_te.forEach(te => {
    const found = headings.find(h =>
      normalize(h).includes(normalize(te))
    );

    if (!found) {
      console.log("❌ NOT FOUND:", te);
    } else {
      console.log("✅ FOUND:", te, "→", found);
    }
  });
}
