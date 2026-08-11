const { connectDB, Registration, Result, json } = require("./_db");

module.exports = async function handler(req, res) {
  try {
    await connectDB();

    if (req.method === "GET") {
      const teacher = String(req.query.teacher || "");
      const filter = teacher ? { teacher } : {};
      return json(res, 200, await Registration.find(filter).sort({ createdAt: -1 }).limit(100));
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return json(res, 400, { message: "ID tidak diberikan." });
      await Registration.findByIdAndDelete(id);
      await Result.deleteMany({ registrationId: id });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { message: "Method not allowed." });
  } catch (e) {
    console.error("teacher-registrations:", e);
    return json(res, 500, { message: "Gagal mendapatkan rekod.", error: e.message });
  }
};
