const { getDb, adminOK, ObjectId, cleanDoc } = require("../lib/db");

module.exports = async (req, res) => {
  try {
    const action = String(req.query.action || "");

    if (action === "unlock" && req.method === "POST") {
      const pin = String((req.body || {}).pin || "").trim();
      const expected = String(process.env.ADMIN_PIN || "smkbadawi2026");

      if (pin !== expected) {
        return res.status(401).json({
          ok: false,
          message: "Invalid PIN."
        });
      }

      return res.status(200).json({
        ok: true,
        token: expected
      });
    }

    if (!adminOK(req)) {
      return res.status(401).json({
        ok: false,
        message: "Administrator access is required."
      });
    }

    const db = await getDb();
    const registrations = db.collection("registrations");
    const results = db.collection("results");

    if (action === "status" && req.method === "GET") {
      return res.status(200).json({
        ok: true,
        database: "connected",
        total: await registrations.countDocuments(),
        events: (await registrations.distinct("event")).length
      });
    }

    if (action === "overview" && req.method === "GET") {
      return res.status(200).json({
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
              { className: { $regex: q, $options: "i" } },
              { event: { $regex: q, $options: "i" } },
              { category: { $regex: q, $options: "i" } },
              { house: { $regex: q, $options: "i" } },
              { teacher: { $regex: q, $options: "i" } }
            ]
          }
        : {};

      const rows = await registrations
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(2000)
        .toArray();

      return res.status(200).json(rows.map(cleanDoc));
    }

    if (action === "update" && req.method === "PUT") {
      const body = req.body || {};
      const id = String(body.id || "");

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid registration ID."
        });
      }

      const updated = {
        studentName: String(body.studentName || "").trim(),
        studentId: String(body.studentId || "").trim(),
        className: String(body.className || "").trim(),
        event: String(body.event || "").trim(),
        category: String(body.category || "").trim(),
        house: String(body.house || "").trim(),
        teacher: String(body.teacher || "Teacher").trim(),
        updatedAt: new Date()
      };

      if (
        !updated.studentName ||
        !updated.studentId ||
        !updated.className ||
        !updated.event ||
        !updated.category ||
        !updated.house
      ) {
        return res.status(400).json({
          ok: false,
          message: "Please complete all required fields."
        });
      }

      const duplicate = await registrations.findOne({
        _id: { $ne: new ObjectId(id) },
        studentId: updated.studentId,
        event: updated.event,
        category: updated.category
      });

      if (duplicate) {
        return res.status(409).json({
          ok: false,
          message: "Another registration already uses this student, event and category."
        });
      }

      const result = await registrations.updateOne(
        { _id: new ObjectId(id) },
        { $set: updated }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          ok: false,
          message: "Registration not found."
        });
      }

      const saved = await registrations.findOne({
        _id: new ObjectId(id)
      });

      return res.status(200).json({
        ok: true,
        message: "Registration updated successfully.",
        data: cleanDoc(saved)
      });
    }

    if (action === "delete" && req.method === "DELETE") {
      const id = String(req.query.id || "");

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid registration ID."
        });
      }

      const objectId = new ObjectId(id);
      const result = await registrations.deleteOne({ _id: objectId });

      if (!result.deletedCount) {
        return res.status(404).json({
          ok: false,
          message: "Registration not found."
        });
      }

      await results.deleteMany({ registrationId: objectId });

      return res.status(200).json({
        ok: true,
        message: "Registration deleted successfully."
      });
    }

    if (action === "result" && req.method === "POST") {
      const body = req.body || {};
      const id = String(body.registrationId || "");

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid participant ID."
        });
      }

      const registrationId = new ObjectId(id);

      const resultDoc = {
        registrationId,
        position: Number(body.position || 0),
        score: Number(body.score || 0),
        timing: String(body.timing || ""),
        points: Number(body.points || 0),
        updatedAt: new Date()
      };

      await results.updateOne(
        { registrationId },
        {
          $set: resultDoc,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      return res.status(200).json({
        ok: true,
        message: "Result saved successfully."
      });
    }

    if (action === "leaderboard" && req.method === "GET") {
      const resultRows = await results
        .find({})
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5000)
        .toArray();

      if (!resultRows.length) {
        return res.status(200).json([]);
      }

      const ids = [...new Set(
        resultRows
          .map(row => row.registrationId)
          .filter(Boolean)
          .map(String)
      )];

      const objectIds = ids
        .filter(id => ObjectId.isValid(id))
        .map(id => new ObjectId(id));

      const registrationRows = objectIds.length
        ? await registrations.find({ _id: { $in: objectIds } }).toArray()
        : [];

      const registrationMap = new Map(
        registrationRows.map(row => [String(row._id), row])
      );

      const totals = new Map();

      for (const row of resultRows) {
        const reg = registrationMap.get(row.registrationId ? String(row.registrationId) : "");
        if (!reg) continue;

        const key = String(reg.studentId || reg._id);
        const current = totals.get(key) || {
          studentId: reg.studentId || "-",
          studentName: reg.studentName || "Unknown",
          house: reg.house || "-",
          points: 0,
          results: 0
        };

        current.points += Number(row.points || 0);
        current.results += 1;
        totals.set(key, current);
      }

      return res.status(200).json(
        [...totals.values()]
          .sort((a, b) => b.points - a.points || a.studentName.localeCompare(b.studentName))
          .slice(0, 10)
      );
    }

    if (action === "results" && req.method === "GET") {
      const resultRows = await results
        .find({})
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5000)
        .toArray();

      if (!resultRows.length) {
        return res.status(200).json([]);
      }

      const ids = [...new Set(
        resultRows
          .map(row => row.registrationId)
          .filter(Boolean)
          .map(String)
      )];

      const objectIds = ids
        .filter(id => ObjectId.isValid(id))
        .map(id => new ObjectId(id));

      const registrationRows = objectIds.length
        ? await registrations.find({ _id: { $in: objectIds } }).toArray()
        : [];

      const registrationMap = new Map(
        registrationRows.map(row => [String(row._id), row])
      );

      return res.status(200).json(
        resultRows.map(row => {
          const reg = registrationMap.get(row.registrationId ? String(row.registrationId) : "");
          if (!reg) return null;

          return {
            _id: row._id ? String(row._id) : null,
            registrationId: String(reg._id),
            studentName: reg.studentName || "Unknown",
            studentId: reg.studentId || "-",
            className: reg.className || "-",
            event: reg.event || "-",
            category: reg.category || "-",
            house: reg.house || "-",
            teacher: reg.teacher || "-",
            position: Number(row.position || 0),
            points: Number(row.points || 0),
            timing: String(row.timing || ""),
            updatedAt: row.updatedAt || row.createdAt || null
          };
        }).filter(Boolean)
      );
    }

    return res.status(404).json({
      ok: false,
      message: "Administrator action not found.",
      action
    });
  } catch (error) {
    console.error("ADMIN_API", error);
    return res.status(500).json({
      ok: false,
      message: "Administrator API failed.",
      error: error.message
    });
  }
};
