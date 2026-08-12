const { MongoClient, ObjectId } = require("mongodb");

let cache = global.__SMKDHAB_DB__;
if (!cache) cache = global.__SMKDHAB_DB__ = { client: null, db: null, promise: null };

const DB_NAME = "school_sports";
const ADMIN_PIN = process.env.ADMIN_PIN || "smkbadawi2026";

const master = {
  events: ["100m","200m","400m","800m","1500m","4x100m","4x200m","Lompat Jauh","Lompat Tinggi","Lompat Kijang","Lempar Cakera","Lontar Peluru","Merejam Lembing","Tarik Tali"],
  categories: ["L3 (Ting. 1)","L2 (T2 & 3)","L1 (T4 & 5)","P3","P2","P1"],
  houses: ["Bahaman","Mat Kilau","Dato' Sagor","Dato' Maharajalela"]
};

function send(res, status, data) {
  res.status(status).json(data);
}

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI belum ditetapkan di Vercel.");

  if (cache.db) return cache.db;

  if (!cache.promise) {
    cache.promise = MongoClient.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10
    });
  }

  try {
    cache.client = await cache.promise;
    cache.db = cache.client.db(DB_NAME);
    await cache.db.command({ ping: 1 });
    return cache.db;
  } catch (e) {
    cache.promise = null;
    cache.client = null;
    cache.db = null;
    throw e;
  }
}

async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => raw += c);
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function route(req) {
  return new URL(req.url, "https://local").pathname
    .replace(/^\/api/, "")
    .replace(/\/+$/, "") || "/";
}

function adminOK(req) {
  return String(req.headers["x-admin-pin"] || "") === String(ADMIN_PIN);
}

module.exports = async function handler(req, res) {
  try {
    const r = route(req);

    if (req.method === "GET" && r === "/health") {
      return send(res, 200, {
        ok: true,
        service: "school-sports-api",
        version: "v11"
      });
    }

    if (req.method === "GET" && r === "/master") {
      return send(res, 200, { ok: true, ...master });
    }

    if (req.method === "POST" && r === "/admin/unlock") {
      const b = await body(req);
      if (String(b.pin || "").trim() !== String(ADMIN_PIN)) {
        return send(res, 401, { ok: false, message: "PIN tidak sah." });
      }
      return send(res, 200, { ok: true, token: String(ADMIN_PIN) });
    }

    const db = await getDb();
    const registrations = db.collection("registrations");
    const results = db.collection("results");

    if (req.method === "GET" && r === "/db-test") {
      const count = await registrations.countDocuments();
      return send(res, 200, {
        ok: true,
        mongodb: "connected",
        database: DB_NAME,
        registrations: count
      });
    }

    if (req.method === "GET" && r === "/admin/status") {
      const total = await registrations.countDocuments();
      const events = await registrations.distinct("event");
      return send(res, 200, {
        ok: true,
        database: "connected",
        total,
        events: events.length
      });
    }

    if (req.method === "POST" && r === "/teacher/register") {
      const b = await body(req);
      const studentName = String(b.studentName || "").trim();
      const studentId = String(b.studentId || "").trim();
      const event = String(b.event || "").trim();
      const category = String(b.category || "").trim();
      const house = String(b.house || "").trim();
      const teacher = String(b.teacher || "Guru").trim();

      if (!studentName || !studentId || !event || !category || !house) {
        return send(res, 400, { ok: false, message: "Sila lengkapkan semua maklumat." });
      }

      const duplicate = await registrations.findOne({ studentId, event, category });
      if (duplicate) {
        return send(res, 409, {
          ok: false,
          message: "Pelajar sudah didaftarkan untuk acara dan kategori ini."
        });
      }

      const doc = {
        studentName, studentId, event, category, house, teacher,
        createdAt: new Date(), updatedAt: new Date()
      };

      const result = await registrations.insertOne(doc);
      return send(res, 201, {
        ok: true,
        message: "Pendaftaran berjaya disimpan.",
        data: { ...doc, _id: String(result.insertedId) }
      });
    }

    if (req.method === "GET" && r === "/teacher/registrations") {
      const url = new URL(req.url, "https://local");
      const teacher = String(url.searchParams.get("teacher") || "").trim();
      const data = await registrations.find(teacher ? { teacher } : {})
        .sort({ createdAt: -1 }).limit(500).toArray();
      return send(res, 200, data);
    }

    if (req.method === "GET" && r === "/admin/overview") {
      if (!adminOK(req)) return send(res, 401, { ok: false, message: "Akses admin diperlukan." });

      const total = await registrations.countDocuments();
      const events = await registrations.distinct("event");
      const totalResults = await results.countDocuments();
      return send(res, 200, { ok: true, total, eventsOngoing: events.length, totalResults });
    }

    if (req.method === "GET" && r === "/admin/registrations") {
      if (!adminOK(req)) return send(res, 401, { ok: false, message: "Akses admin diperlukan." });

      const url = new URL(req.url, "https://local");
      const q = String(url.searchParams.get("q") || "").trim();
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

      const data = await registrations.find(filter)
        .sort({ createdAt: -1 }).limit(1000).toArray();
      return send(res, 200, data);
    }

    if (req.method === "POST" && r === "/admin/result") {
      if (!adminOK(req)) return send(res, 401, { ok: false, message: "Akses admin diperlukan." });

      const b = await body(req);
      const id = String(b.registrationId || "");
      if (!ObjectId.isValid(id)) return send(res, 400, { ok: false, message: "ID peserta tidak sah." });

      const doc = {
        registrationId: new ObjectId(id),
        position: Number(b.position || 0),
        score: Number(b.score || 0),
        timing: String(b.timing || "").trim(),
        points: Number(b.points || 0),
        updatedAt: new Date()
      };

      await results.updateOne(
        { registrationId: doc.registrationId },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );

      return send(res, 200, { ok: true, message: "Keputusan berjaya disimpan." });
    }

    if (req.method === "GET" && r === "/admin/leaderboard") {
      if (!adminOK(req)) return send(res, 401, { ok: false, message: "Akses admin diperlukan." });

      const data = await results.aggregate([
        { $lookup: {
          from: "registrations",
          localField: "registrationId",
          foreignField: "_id",
          as: "registration"
        }},
        { $unwind: "$registration" },
        { $group: {
          _id: "$registration.studentId",
          studentName: { $first: "$registration.studentName" },
          house: { $first: "$registration.house" },
          points: { $sum: "$points" }
        }},
        { $sort: { points: -1, studentName: 1 } },
        { $limit: 10 }
      ]).toArray();

      return send(res, 200, data);
    }

    return send(res, 404, { ok: false, message: "API route not found", route: r });
  } catch (error) {
    console.error("V11_API_ERROR", error);
    return send(res, 500, { ok: false, message: "Server error", error: error.message });
  }
};
