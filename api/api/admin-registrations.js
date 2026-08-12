const { getDb, send, adminOK } = require("./_db");

module.exports = async function(req, res) {
  if (!adminOK(req)) return send(res, 401, { ok: false, message: "Akses admin diperlukan." });
  if (req.method !== "GET") return send(res, 405, { ok: false, message: "GET sahaja." });

  try {
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

    const data = await (await getDb())
      .collection("registrations")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray();

    return send(res, 200, data);
  } catch (e) {
    console.error(e);
    return send(res, 500, {
      ok: false,
      message: "Gagal mendapatkan data admin.",
      error: e.message
    });
  }
};
