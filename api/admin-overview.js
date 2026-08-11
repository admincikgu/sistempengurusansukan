const { connectDB, Registration, json, adminAllowed } = require("./_db");

module.exports = async function handler(req, res) {
  if (!adminAllowed(req)) return json(res, 401, { message: "Admin authentication diperlukan." });

  try {
    await connectDB();
    const total = await Registration.countDocuments();
    const events = await Registration.distinct("event");
    const houses = await Registration.aggregate([
      { $group: { _id: "$house", total: { $sum: 1 } } }
    ]);
    return json(res, 200, { total, eventsOngoing: events.length, houses });
  } catch (e) {
    console.error("admin-overview:", e);
    return json(res, 500, { message: "Gagal mendapatkan statistik.", error: e.message });
  }
};
