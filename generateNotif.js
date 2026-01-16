import { MongoClient } from "mongodb";
import webpush from "web-push";
import "dotenv/config";

/*
  Usage:
  node notif.js "Title here" "Body here"
*/

const [, , title, body] = process.argv;

if (!title || !body) {
  console.error("❌ Title or body missing");
  process.exit(1);
}

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();

const db = client.db(process.env.DB_NAME);
const collection = db.collection(process.env.NOTIF_COLLECTION);

const payload = JSON.stringify({ title, body });

const subs = await collection.find({}).toArray();
console.log("📨 Subscriptions:", subs.length);

for (const { _id, endpoint, keys } of subs) {
  try {
    await webpush.sendNotification(
      { endpoint, keys },
      payload
    );
    console.log("✅ Sent");
  } catch (err) {
    console.log("⚠️ Invalid subscription removed");
    await collection.deleteOne({ _id });
  }
}

await client.close();
console.log("🙏 Notification process complete");
process.exit(0);
