const { MongoClient, ObjectId } = require("mongodb");

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

function adminOK(req) {
  return String(req.headers["x-admin-pin"] || "") ===
    String(process.env.ADMIN_PIN || "smkbadawi2026");
}

function cleanDoc(doc) {
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id ? String(doc._id) : null,
    registrationId: doc.registrationId ? String(doc.registrationId) : undefined
  };
}

module.exports = { getDb, adminOK, ObjectId, cleanDoc, DB_NAME };
