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
    const registrations = db.collection("registrations");
    const results = db.collection("results");

    const totalStudents = await registrations.countDocuments();
    const eventsOngoing = (await registrations.distinct("event")).length;
    const totalResults = await results.countDocuments();

    return send(res, 200, {
      ok: true,
      totalStudents,
      eventsOngoing,
      totalResults
    });
  } catch (error) {
    console.error("ADMIN_OVERVIEW_ERROR:", error);
    return send(res, 500, {
      ok: false,
      message: "Admin gagal membaca statistik.",
      error: error.message
    });
  }
};
