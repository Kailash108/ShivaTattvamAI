import fs from "fs";

const topics = JSON.parse(fs.readFileSync("../../Data/Topics.json", "utf-8"));
const content = fs.readFileSync("../../Data/Chapters/Chapter1.txt", "utf-8");

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
  .filter(l => l.trim().startsWith("##"))
  .map(l => l.trim());

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
