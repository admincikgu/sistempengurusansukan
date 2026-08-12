const { getDb, send, adminOK } = require("./_db");

module.exports = async function(req, res) {
  if (!adminOK(req)) return send(res, 401, { ok: false, message: "Akses admin diperlukan." });

  try {
    const db = await getDb();
    const registrations = db.collection("registrations");
    const results = db.collection("results");

    return send(res, 200, {
      ok: true,
      total: await registrations.countDocuments(),
      eventsOngoing: (await registrations.distinct("event")).length,
      totalResults: await results.countDocuments()
    });
  } catch (e) {
    console.error(e);
    return send(res, 500, {
      ok: false,
      message: "Gagal mendapatkan statistik.",
      error: e.message
    });
  }
};
