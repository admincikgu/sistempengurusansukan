const { connectDB, Registration, json, adminAllowed } = require("./_db");

module.exports = async function handler(req, res) {
  if (!adminAllowed(req)) return json(res, 401, { message: "Admin authentication diperlukan." });

  if (req.method !== "GET") return json(res, 405, { message: "Method not allowed." });

  try {
    await connectDB();
    const q = String(req.query.q || "").trim();
    const filter = q ? {
      $or: [
        { studentName: { $regex: q, $options: "i" } },
        { studentId: { $regex: q, $options: "i" } },
        { event: { $regex: q, $options: "i" } },
        { house: { $regex: q, $options: "i" } }
      ]
    } : {};

    return json(res, 200,
      await Registration.find(filter).sort({ createdAt: -1 }).limit(500)
    );
  } catch (e) {
    console.error("admin-registrations:", e);
    return json(res, 500, { message: "Gagal mendapatkan data.", error: e.message });
  }
};
