const { getDb, adminOK, ObjectId } = require("../lib/db");

const send = (res, status, data) => res.status(status).json(data);

module.exports = async (req, res) => {
  try {
    const action = String(req.query.action || "");

    // Login does not require MongoDB.
    if (action === "unlock" && req.method === "POST") {
      const pin = String((req.body || {}).pin || "").trim();
      const expected = String(process.env.ADMIN_PIN || "smkbadawi2026");

      if (pin !== expected) {
        return send(res, 401, {
          ok: false,
          message: "Invalid PIN."
        });
      }

      return send(res, 200, {
        ok: true,
        token: expected
      });
    }

    if (!adminOK(req)) {
      return send(res, 401, {
        ok: false,
        message: "Administrator access is required."
      });
    }

    const db = await getDb();
    const registrations = db.collection("registrations");
    const results = db.collection("results");

    if (action === "status" && req.method === "GET") {
      const total = await registrations.countDocuments();
      const events = await registrations.distinct("event");

      return send(res, 200, {
        ok: true,
        database: "connected",
        total,
        events: events.length
      });
    }

    if (action === "overview" && req.method === "GET") {
      return send(res, 200, {
        ok: true,
        total: await registrations.countDocuments(),
        eventsOngoing: (await registrations.distinct("event")).length,
        totalResults: await results.countDocuments()
      });
    }

    if (action === "registrations" && req.method === "GET") {
      const q = String(req.query.q || "").trim();

      const filter = q
        ? {
            $or: [
              { studentName: { $regex: q, $options: "i" } },
              { studentId: { $regex: q, $options: "i" } },
              { event: { $regex: q, $options: "i" } },
              { category: { $regex: q, $options: "i" } },
              { house: { $regex: q, $options: "i" } },
              { teacher: { $regex: q, $options: "i" } }
            ]
          }
        : {};

      return send(
        res,
        200,
        await registrations.find(filter)
          .sort({ createdAt: -1 })
          .limit(1000)
          .toArray()
      );
    }

    if (action === "result" && req.method === "POST") {
      const body = req.body || {};
      const id = String(body.registrationId || "");

      if (!ObjectId.isValid(id)) {
        return send(res, 400, {
          ok: false,
          message: "Invalid participant ID."
        });
      }

      const resultDoc = {
        registrationId: new ObjectId(id),
        position: Number(body.position || 0),
        score: Number(body.score || 0),
        timing: String(body.timing || ""),
        points: Number(body.points || 0),
        updatedAt: new Date()
      };

      await results.updateOne(
        { registrationId: resultDoc.registrationId },
        { $set: resultDoc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );

      return send(res, 200, {
        ok: true,
        message: "Result saved successfully."
      });
    }

    if (action === "leaderboard" && req.method === "GET") {
      const data = await results.aggregate([
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
    }

    return send(res, 404, {
      ok: false,
      message: "Administrator action not found.",
      action
    });

  } catch (error) {
    console.error("ADMIN_API", error);

    return send(res, 500, {
      ok: false,
      message: "Administrator API failed.",
      error: error.message
    });
  }
};
