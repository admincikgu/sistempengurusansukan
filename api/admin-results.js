const { connectDB, Result, json, adminAllowed } = require("./_db");

module.exports = async function handler(req, res) {
  if (!adminAllowed(req)) return json(res, 401, { message: "Admin authentication diperlukan." });
  if (req.method !== "POST") return json(res, 405, { message: "Method not allowed." });

  try {
    await connectDB();
    const { registrationId, position, score, timing, points } = req.body || {};

    if (!registrationId)
      return json(res, 400, { message: "Peserta tidak dipilih." });

    const result = await Result.findOneAndUpdate(
      { registrationId },
      { position, score, timing, points: Number(points || 0) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return json(res, 200, result);
  } catch (e) {
    console.error("admin-results:", e);
    return json(res, 400, { message: "Keputusan tidak dapat disimpan.", error: e.message });
  }
};
