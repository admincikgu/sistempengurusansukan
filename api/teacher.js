const { getDb, cleanDoc } = require("../lib/db");

module.exports = async (req, res) => {
  try {
    const db = await getDb();
    const collection = db.collection("registrations");
    const action = String(
      req.query.action || (req.method === "POST" ? "register" : "list")
    );

    if (action === "list" && req.method === "GET") {
      const teacher = String(req.query.teacher || "").trim();
      const filter = teacher ? { teacher } : {};

      const rows = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray();

      return res.status(200).json(rows.map(cleanDoc));
    }

    if (action === "register" && req.method === "POST") {
      const body = req.body || {};

      const doc = {
        studentName: String(body.studentName || "").trim(),
        studentId: String(body.studentId || "").trim(),
        className: String(body.className || "").trim(),
        event: String(body.event || "").trim(),
        category: String(body.category || "").trim(),
        house: String(body.house || "").trim(),
        teacher: String(body.teacher || "Teacher").trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (
        !doc.studentName ||
        !doc.studentId ||
        !doc.className ||
        !doc.event ||
        !doc.category ||
        !doc.house
      ) {
        return res.status(400).json({
          ok: false,
          message: "Please complete all required fields."
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
          message: "This student is already registered for this event and category."
        });
      }

      const result = await collection.insertOne(doc);
      const saved = await collection.findOne({ _id: result.insertedId });

      return res.status(201).json({
        ok: true,
        message: "Registration saved successfully.",
        data: cleanDoc(saved)
      });
    }

    return res.status(405).json({
      ok: false,
      message: "Invalid Teacher API action."
    });
  } catch (error) {
    console.error("TEACHER_API", error);
    return res.status(500).json({
      ok: false,
      message: "Teacher API failed.",
      error: error.message
    });
  }
};
