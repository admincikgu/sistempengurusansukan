const mongoose = require("mongoose");

let cache = global.__SMK_SPORTS_MONGO__;
if (!cache) cache = global.__SMK_SPORTS_MONGO__ = { conn: null, promise: null };

const registrationSchema = new mongoose.Schema({
  studentName: { type: String, required: true, trim: true },
  studentId: { type: String, required: true, trim: true },
  event: { type: String, required: true },
  category: { type: String, required: true },
  house: { type: String, required: true },
  teacher: { type: String, default: "Guru" },
  createdAt: { type: Date, default: Date.now }
});

const resultSchema = new mongoose.Schema({
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "Registration", required: true },
  position: Number,
  score: Number,
  timing: String,
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Registration =
  mongoose.models.Registration ||
  mongoose.model("Registration", registrationSchema);

const Result =
  mongoose.models.Result ||
  mongoose.model("Result", resultSchema);

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in Vercel Environment Variables.");

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false,
      maxPoolSize: 5
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

function json(res, status, data) {
  res.status(status).json(data);
}

function adminAllowed(req) {
  const expected = String(process.env.ADMIN_PIN || "123456");
  const supplied = String(req.headers["x-admin-pin"] || "");
  return supplied === expected;
}

module.exports = { mongoose, Registration, Result, connectDB, json, adminAllowed };
