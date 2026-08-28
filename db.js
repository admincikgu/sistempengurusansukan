const { MongoClient, ObjectId } = require("mongodb");
const crypto = require("crypto");

let state = global.__SMKDHAB_DB_V16__;
if (!state) {
  state = global.__SMKDHAB_DB_V16__ = {
    db: null,
    promise: null
  };
}

const DB_NAME = "school_sports";

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured in Vercel.");

  if (state.db) return state.db;

  if (!state.promise) {
    state.promise = MongoClient.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10
    });
  }

  try {
    const client = await state.promise;
    state.db = client.db(DB_NAME);
    await state.db.command({ ping: 1 });
    return state.db;
  } catch (error) {
    state.promise = null;
    state.db = null;
    throw error;
  }
}

function getAdminSecret() {
  return String(process.env.ADMIN_PIN || "");
}

function createAdminToken() {
  const secret = getAdminSecret();
  const expiresAt = Date.now() + (8 * 60 * 60 * 1000);
  const payload = String(expiresAt);
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifyAdminToken(token) {
  const value = String(token || "");
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !/^\d+$/.test(payload)) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expected = crypto.createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function adminOK(req) {
  const token = String(req.headers["x-admin-token"] || "");
  if (verifyAdminToken(token)) return true;

  return false;
}

function cleanDoc(doc) {
  if (!doc) return null;
  const { studentId, ...safeDoc } = doc;
  return {
    ...safeDoc,
    _id: doc._id ? String(doc._id) : null,
    registrationId: doc.registrationId ? String(doc.registrationId) : undefined
  };
}


async function getMasterConfig() {
  const db = await getDb();
  const settings = db.collection("settings");
  const doc = await settings.findOne({ _id: "sports_config" });
  return doc ? {
    events: Array.isArray(doc.events) ? doc.events : [],
    categories: Array.isArray(doc.categories) ? doc.categories : [],
    houses: Array.isArray(doc.houses) ? doc.houses : [],
    classes: Array.isArray(doc.classes) ? doc.classes : []
  } : null;
}

async function saveMasterConfig(config) {
  const db = await getDb();
  const settings = db.collection("settings");
  await settings.updateOne(
    { _id: "sports_config" },
    { $set: {
      events: Array.isArray(config.events) ? config.events : [],
      categories: Array.isArray(config.categories) ? config.categories : [],
      houses: Array.isArray(config.houses) ? config.houses : [],
      classes: Array.isArray(config.classes) ? config.classes : [],
      updatedAt: new Date()
    }},
    { upsert: true }
  );
  return getMasterConfig();
}

async function syncRegistrationToSpreadsheet(row) {
  const webhook = process.env.SPREADSHEET_WEBHOOK_URL;
  if (!webhook) return { ok:false, skipped:true };

  const response = await fetch(webhook,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(row)
  });

  if (!response.ok) {
    throw new Error(`Spreadsheet sync failed (HTTP ${response.status})`);
  }
  return { ok:true };
}

module.exports = {
  getDb, adminOK, createAdminToken, getAdminSecret, ObjectId, cleanDoc, DB_NAME,
  getMasterConfig, saveMasterConfig, syncRegistrationToSpreadsheet
};
