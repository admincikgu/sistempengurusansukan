const { getDb, send, adminOK } = require("./_db");

module.exports = async function(req, res) {
  if (!adminOK(req)) return send(res, 401, { ok: false, message: "Akses admin diperlukan." });

  try {
    const data = await (await getDb()).collection("results").aggregate([
      {
        $lookup: {
          from: "registrations",
          localField: "registrationId",
          foreignField: "_id",
          as: "registration"
        }
      },
      { $unwind: "$registration" },
      {
        $group: {
          _id: "$registration.studentId",
          studentName: { $first: "$registration.studentName" },
          house: { $first: "$registration.house" },
          points: { $sum: "$points" }
        }
      },
      { $sort: { points: -1, studentName: 1 } },
      { $limit: 10 }
    ]).toArray();

    return send(res, 200, data);
  } catch (e) {
    console.error(e);
    return send(res, 500, {
      ok: false,
      message: "Gagal mendapatkan leaderboard.",
      error: e.message
    });
  }
};
