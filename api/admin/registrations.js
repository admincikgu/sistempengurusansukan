const { getDb, send, adminAuthenticated } = require("../_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return send(res, 405, { ok: false, message: "Method GET diperlukan." });
  }

  if (!adminAuthenticated(req)) {
    return send(res, 401, { ok: false, message: "Sila log masuk Admin View dahulu." });
  }

  try {
    const db = await getDb();
    const q = String(req.query.q || "").trim();

    const filter = q
      ? {
          $or: [
            { studentName: { $regex: q, $options: "i" } },
            { studentId: { $regex: q, $options: "i" } },
            { event: { $regex: q, $options: "i" } },
            { category: { $regex: q, $options: "i" } },
            { house: { $regex: q, $options: "i" } },
            { teacher: { $regex: q, $options: "i" } }
          ]
        }
      : {};

    const data = await db
      .collection("registrations")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return send(res, 200, {
      ok: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error("ADMIN_REGISTRATIONS_ERROR:", error);
    return send(res, 500, {
      ok: false,
      message: "Admin gagal membaca data pendaftaran.",
      error: error.message
    });
  }
};
