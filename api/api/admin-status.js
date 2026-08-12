const { getDb, send } = require("./_db");

module.exports = async function(req, res) {
  try {
    const db = await getDb();
    const total = await db.collection("registrations").countDocuments();
    const events = await db.collection("registrations").distinct("event");
    return send(res, 200, {
      ok: true,
      database: "connected",
      total,
      events: events.length
    });
  } catch (e) {
    console.error(e);
    return send(res, 500, {
      ok: false,
      database: "disconnected",
      error: e.message
    });
  }
};
