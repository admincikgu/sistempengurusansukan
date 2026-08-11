const { connectDB, Registration, json, adminAllowed } = require("./_db");

module.exports = async function handler(req, res) {
  if (!adminAllowed(req)) return json(res, 401, { message: "Admin authentication diperlukan." });

  try {
    await connectDB();
    const rows = await Registration.aggregate([
      { $lookup: {
        from: "results",
        localField: "_id",
        foreignField: "registrationId",
        as: "result"
      }},
      { $unwind: { path: "$result", preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: "$studentId",
        studentName: { $first: "$studentName" },
        house: { $first: "$house" },
        points: { $sum: { $ifNull: ["$result.points", 0] } }
      }},
      { $sort: { points: -1 } },
      { $limit: 10 }
    ]);

    return json(res, 200, rows);
  } catch (e) {
    console.error("admin-leaderboard:", e);
    return json(res, 500, { message: "Gagal mendapatkan leaderboard.", error: e.message });
  }
};
