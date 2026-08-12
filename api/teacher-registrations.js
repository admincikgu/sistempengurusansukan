const { getDb, send } = require("./_db");

module.exports = async function(req, res) {
  if (req.method !== "GET") return send(res, 405, { ok: false, message: "GET sahaja." });

  try {
    const teacher = String(req.query.teacher || "").trim();
    const filter = teacher ? { teacher } : {};
    const data = await (await getDb())
      .collection("registrations")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return send(res, 200, data);
  } catch (e) {
    console.error(e);
    return send(res, 500, {
      ok: false,
      message: "Gagal mendapatkan rekod pendaftaran.",
      error: e.message
    });
  }
};
