const { connectDB, Registration, json } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { message: "Method not allowed." });

  try {
    await connectDB();
    const { studentName, studentId, event, category, house, teacher } = req.body || {};

    if (!studentName || !studentId || !event || !category || !house)
      return json(res, 400, { message: "Sila lengkapkan semua maklumat." });

    const duplicate = await Registration.findOne({ studentId, event, category });
    if (duplicate)
      return json(res, 409, { message: "Pelajar sudah didaftarkan untuk acara dan kategori ini." });

    const item = await Registration.create({
      studentName, studentId, event, category, house,
      teacher: teacher || "Guru"
    });

    return json(res, 201, item);
  } catch (e) {
    console.error("teacher-register:", e);
    return json(res, 500, { message: "Gagal menyimpan pendaftaran.", error: e.message });
  }
};
