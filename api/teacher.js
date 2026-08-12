const { getDb } = require("../lib/db");

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    const collection = db.collection("registrations");
    const action = String(req.query.action || (req.method === "POST" ? "register" : "list"));

    if (action === "list" && req.method === "GET") {
      const teacher = String(req.query.teacher || "").trim();
      const filter = teacher ? { teacher } : {};

      const data = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      return res.status(200).json(data);
    }

    if (action === "register" && req.method === "POST") {
      const body = req.body || {};

      const doc = {
        studentName: String(body.studentName || "").trim(),
        studentId: String(body.studentId || "").trim(),
        event: String(body.event || "").trim(),
        category: String(body.category || "").trim(),
        house: String(body.house || "").trim(),
        teacher: String(body.teacher || "Guru").trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (!doc.studentName || !doc.studentId || !doc.event || !doc.category || !doc.house) {
        return res.status(400).json({
          ok: false,
          message: "Sila lengkapkan semua maklumat."
        });
      }

      const duplicate = await collection.findOne({
        studentId: doc.studentId,
        event: doc.event,
        category: doc.category
      });

      if (duplicate) {
        return res.status(409).json({
          ok: false,
          message: "Pelajar sudah didaftarkan untuk acara dan kategori ini."
        });
      }

      const result = await collection.insertOne(doc);

      return res.status(201).json({
        ok: true,
        message: "Pendaftaran berjaya disimpan.",
        data: { ...doc, _id: String(result.insertedId) }
      });
    }

    return res.status(405).json({
      ok: false,
      message: "Action tidak sah untuk Teacher API."
    });

  } catch (error) {
    console.error("TEACHER_API", error);
    return res.status(500).json({
      ok: false,
      message: "Teacher API gagal.",
      error: error.message
    });
  }
};
