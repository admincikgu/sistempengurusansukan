const { MongoClient, ObjectId } = require("mongodb");

let state = global.__SMKDB__;
if (!state) state = global.__SMKDB__ = { client: null, db: null, promise: null };

const DB_NAME = "school_sports";

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI belum ditetapkan di Vercel.");

  if (state.db) return state.db;

  if (!state.promise) {
    state.promise = MongoClient.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10
    });
  }

  try {
    state.client = await state.promise;
    state.db = state.client.db(DB_NAME);
    await state.db.command({ ping: 1 });
    return state.db;
  } catch (e) {
    state.promise = null;
    state.client = null;
    state.db = null;
    throw e;
  }
}

function adminOK(req) {
  return String(req.headers["x-admin-pin"] || "") ===
    String(process.env.ADMIN_PIN || "smkbadawi2026");
}

module.exports = { getDb, adminOK, DB_NAME, ObjectId };
