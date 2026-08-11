const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PIN = process.env.ADMIN_PIN || "smkbadawi2026";

let cached = global.__SMKDHAB_MONGO__;
if (!cached) cached = global.__SMKDHAB_MONGO__ = { conn: null, promise: null };

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI belum ditetapkan di Vercel Environment Variables.");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    throw error;
  }
}

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

const master = {
  events: ["100m","200m","400m","800m","1500m","4x100m","4x200m","Lompat Jauh","Lompat Tinggi","Lompat Kijang","Lempar Cakera","Lontar Peluru","Merejam Lembing","Tarik Tali"],
  categories: ["L3 (Ting. 1)","L2 (T2 & 3)","L1 (T4 & 5)","P3","P2","P1"],
  houses: ["Bahaman","Mat Kilau","Dato' Sagor","Dato' Maharajalela"]
};

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "school-sports-api", version: "v10" });
});

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "school-sports-api", version: "v10" })
);

app.get("/master", (_req, res) => res.json(master));

app.get("/admin/status", async (_req, res) => {
  try {
    await connectDB();
    const total = await Registration.countDocuments();
    const events = await Registration.distinct("event");
    res.json({ ok: true, database: "connected", total, events: events.length });
  } catch (e) {
    console.error("ADMIN_STATUS_ERROR", e);
    res.status(500).json({ ok: false, database: "disconnected", error: e.message });
  }
});

app.post("/teacher/register", async (req, res) => {
  try {
    await connectDB();
    const { studentName, studentId, event, category, house, teacher } = req.body || {};

    if (!studentName || !studentId || !event || !category || !house) {
      return res.status(400).json({ ok: false, message: "Sila lengkapkan semua maklumat." });
    }

    const duplicate = await Registration.findOne({ studentId, event, category });
    if (duplicate) {
      return res.status(409).json({ ok: false, message: "Pelajar sudah didaftarkan untuk acara dan kategori ini." });
    }

    const doc = await Registration.create({
      studentName, studentId, event, category, house, teacher: teacher || "Guru"
    });

    res.status(201).json({ ok: true, message: "Pendaftaran berjaya disimpan.", data: doc });
  } catch (e) {
    console.error("TEACHER_REGISTER_ERROR", e);
    res.status(500).json({ ok: false, message: "Gagal menyimpan pendaftaran.", error: e.message });
  }
});

app.get("/teacher/registrations", async (req, res) => {
  try {
    await connectDB();
    const filter = req.query.teacher ? { teacher: req.query.teacher } : {};
    res.json(await Registration.find(filter).sort({ createdAt: -1 }).limit(500));
  } catch (e) {
    res.status(500).json({ ok: false, message: "Gagal mendapatkan rekod.", error: e.message });
  }
});

app.delete("/teacher/registrations/:id", async (req, res) => {
  try {
    await connectDB();
    await Registration.findByIdAndDelete(req.params.id);
    await Result.deleteMany({ registrationId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Gagal memadam rekod.", error: e.message });
  }
});

app.post("/admin/unlock", (req, res) => {
  if (String(req.body?.pin || "") !== String(ADMIN_PIN)) {
    return res.status(401).json({ ok: false, message: "PIN tidak sah." });
  }
  res.json({ ok: true });
});

app.get("/admin/overview", async (_req, res) => {
  try {
    await connectDB();
    const total = await Registration.countDocuments();
    const events = await Registration.distinct("event");
    const houses = await Registration.aggregate([
      { $group: { _id: "$house", total: { $sum: 1 } } }
    ]);
    res.json({ ok: true, total, eventsOngoing: events.length, houses });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Gagal mendapatkan statistik.", error: e.message });
  }
});

app.get("/admin/registrations", async (req, res) => {
  try {
    await connectDB();
    const q = String(req.query.q || "").trim();

    const filter = q ? {
      $or: [
        { studentName: { $regex: q, $options: "i" } },
        { studentId: { $regex: q, $options: "i" } },
        { event: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { house: { $regex: q, $options: "i" } },
        { teacher: { $regex: q, $options: "i" } }
      ]
    } : {};

    res.json(await Registration.find(filter).sort({ createdAt: -1 }).limit(1000));
  } catch (e) {
    console.error("ADMIN_REGISTRATION_ERROR", e);
    res.status(500).json({ ok: false, message: "Gagal mendapatkan data.", error: e.message });
  }
});

app.post("/admin/results", async (req, res) => {
  try {
    await connectDB();
    const { registrationId, position, score, timing, points } = req.body || {};
    const result = await Result.findOneAndUpdate(
      { registrationId },
      { registrationId, position, score, timing, points },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, data: result });
  } catch (e) {
    res.status(400).json({ ok: false, message: "Keputusan tidak dapat disimpan.", error: e.message });
  }
});

app.get("/admin/leaderboard", async (_req, res) => {
  try {
    await connectDB();
    res.json(await Registration.aggregate([
      {
        $lookup: {
          from: "results",
          localField: "_id",
          foreignField: "registrationId",
          as: "result"
        }
      },
      { $unwind: { path: "$result", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$studentId",
          studentName: { $first: "$studentName" },
          house: { $first: "$house" },
          points: { $sum: { $ifNull: ["$result.points", 0] } }
        }
      },
      { $sort: { points: -1 } },
      { $limit: 10 }
    ]));
  } catch (e) {
    res.status(500).json({ ok: false, message: "Gagal mendapatkan leaderboard.", error: e.message });
  }
});

module.exports = app;
