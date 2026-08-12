const { getDb, send } = require("./_db");

module.exports = async function(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, message: "POST sahaja." });

  try {
    const b = req.body || {};
    const doc = {
      studentName: String(b.studentName || "").trim(),
      studentId: String(b.studentId || "").trim(),
      event: String(b.event || "").trim(),
      category: String(b.category || "").trim(),
      house: String(b.house || "").trim(),
      teacher: String(b.teacher || "Guru").trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!doc.studentName || !doc.studentId || !doc.event || !doc.category || !doc.house) {
      return send(res, 400, { ok: false, message: "Sila lengkapkan semua maklumat." });
    }

    const db = await getDb();
    const collection = db.collection("registrations");
    const duplicate = await collection.findOne({
      studentId: doc.studentId,
      event: doc.event,
      category: doc.category
    });

    if (duplicate) {
      return send(res, 409, {
        ok: false,
        message: "Pelajar sudah didaftarkan untuk acara dan kategori ini."
      });
    }

    const result = await collection.insertOne(doc);

    return send(res, 201, {
      ok: true,
      message: "Pendaftaran berjaya disimpan.",
      data: { ...doc, _id: String(result.insertedId) }
    });
  } catch (e) {
    console.error(e);
    return send(res, 500, {
      ok: false,
      message: "Gagal menyimpan pendaftaran.",
      error: e.message
    });
  }
};
