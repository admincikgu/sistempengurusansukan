const { getDb, adminOK, ObjectId, cleanDoc, getMasterConfig, saveMasterConfig } = require("../lib/db");

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
    const students = db.collection("students");


    if (action === "students" && req.method === "GET") {
      const q=String(req.query.q||"").trim();
      const filter=q?{$or:[{studentName:{$regex:q,$options:"i"}},{studentId:{$regex:q,$options:"i"}}]}:{};
      const rows=await students.find(filter).sort({studentName:1}).limit(5000).toArray();
      return res.status(200).json(rows.map(cleanDoc));
    }
    if (action === "importStudents" && req.method === "POST") {
      const input=Array.isArray((req.body||{}).students)?req.body.students:[];
      const rows=input.map(x=>({studentName:String(x.studentName||x.name||"").trim(),studentId:String(x.studentId||x.id||"").trim(),className:String(x.className||x.class||"").trim().toUpperCase(),house:String(x.house||x.sportsHouse||"").trim().toUpperCase(),updatedAt:new Date()})).filter(x=>x.studentName&&x.studentId);
      if(!rows.length)return res.status(400).json({ok:false,message:"No valid students found."});
      const ops=rows.map(x=>({updateOne:{filter:{studentId:x.studentId},update:{$set:x,$setOnInsert:{createdAt:new Date()}},upsert:true}}));
      const r=await students.bulkWrite(ops,{ordered:false});
      return res.status(200).json({ok:true,message:"Student master list imported successfully.",imported:rows.length,updated:r.modifiedCount||0,upserted:r.upsertedCount||0});
    }
    if (action === "master" && (req.method === "GET" || req.method === "PUT")) {
      if (req.method === "GET") {
        const config = await getMasterConfig();
        return res.status(200).json({ ok:true, ...(config || {}) });
      }
      const body=req.body||{};
      const cleanArray=value=>Array.isArray(value)
        ? [...new Set(value.map(x=>String(x||"").trim().toUpperCase()).filter(Boolean))]
        : [];
      const saved=await saveMasterConfig({
        events:cleanArray(body.events),
        categories:cleanArray(body.categories),
        houses:cleanArray(body.houses),
        classes:cleanArray(body.classes)
      });
      return res.status(200).json({
        ok:true,
        message:"Sports configuration updated successfully.",
        ...saved
      });
    }

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


    const officialResultFilter = {
      $or: [
        { status: { $in: ["VERIFIED", "PUBLISHED"] } },
        { status: { $exists: false } }
      ]
    };

    if (action === "commandCenter" && req.method === "GET") {
      const config = await getMasterConfig();
      const [registrationsCount, resultDocs] = await Promise.all([
        registrations.countDocuments(),
        results.find({}).sort({ updatedAt:-1, createdAt:-1 }).limit(5000).toArray()
      ]);

      const official = resultDocs.filter(row =>
        !row.status || row.status === "VERIFIED" || row.status === "PUBLISHED"
      );

      const draftCount = resultDocs.filter(row => row.status === "DRAFT").length;
      const verifiedCount = resultDocs.filter(row => row.status === "VERIFIED").length;
      const publishedCount = resultDocs.filter(row => !row.status || row.status === "PUBLISHED").length;

      const ids = [...new Set(
        resultDocs.map(r => r.registrationId).filter(Boolean).map(String)
      )].filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

      const regs = ids.length ? await registrations.find({ _id:{ $in:ids } }).toArray() : [];
      const regMap = new Map(regs.map(r => [String(r._id), r]));

      const recentResults = official.slice(0, 12).map(row => {
        const reg = regMap.get(row.registrationId ? String(row.registrationId) : "");
        if (!reg) return null;
        return {
          resultId: String(row._id),
          studentName: reg.studentName || "Unknown",
          event: reg.event || "-",
          category: reg.category || "-",
          house: reg.house || "-",
          position: Number(row.position || 0),
          points: Number(row.points || 0),
          timing: String(row.timing || ""),
          status: row.status || "PUBLISHED",
          updatedAt: row.updatedAt || row.createdAt || null
        };
      }).filter(Boolean);

      const eventSet = new Set((config?.events || []).map(String));
      const registrationsRows = await registrations.find({}).limit(5000).toArray();

      for (const row of registrationsRows) {
        eventSet.add(String(row.event || "UNASSIGNED"));
      }

      const eventMap = new Map(
        [...eventSet].map(event => [event, { event, participants: 0, results: 0 }])
      );

      for (const row of registrationsRows) {
        const event = String(row.event || "UNASSIGNED");
        if (!eventMap.has(event)) {
          eventMap.set(event, { event, participants: 0, results: 0 });
        }
        eventMap.get(event).participants += 1;
      }
      for (const row of official) {
        const reg = regMap.get(row.registrationId ? String(row.registrationId) : "");
        if (reg && eventMap.has(reg.event)) eventMap.get(reg.event).results += 1;
      }

      return res.status(200).json({
        ok:true,
        registrations:registrationsCount,
        events:[...eventMap.values()],
        counts:{draft:draftCount,verified:verifiedCount,published:publishedCount,totalResults:resultDocs.length},
        recentResults
      });
    }

    if (action === "updateResult" && req.method === "PUT") {
      const body = req.body || {};
      const resultId = String(body.resultId || "");

      if (!ObjectId.isValid(resultId)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid result ID."
        });
      }

      const registrationId = String(body.registrationId || "");
      if (!ObjectId.isValid(registrationId)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid participant ID."
        });
      }

      const resultDoc = {
        registrationId: new ObjectId(registrationId),
        position: Number(body.position || 0),
        score: Number(body.score || 0),
        timing: String(body.timing || ""),
        points: Number(body.points || 0),
        status: ["DRAFT","VERIFIED","PUBLISHED"].includes(String(body.status || "").toUpperCase())
          ? String(body.status).toUpperCase()
          : "DRAFT",
        updatedAt: new Date()
      };

      const result = await results.updateOne(
        { _id: new ObjectId(resultId) },
        { $set: resultDoc }
      );

      if (!result.matchedCount) {
    
    return res.status(404).json({
          ok: false,
          message: "Result not found."
        });
      }

      return res.status(200).json({
        ok: true,
        message: "Competition result updated successfully."
      });
    }


    if (action === "verifyResult" && req.method === "PUT") {
      const id = String((req.body || {}).resultId || "");
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ ok:false, message:"Invalid result ID." });
      }
      const updated = await results.updateOne(
        { _id:new ObjectId(id) },
        { $set:{ status:"VERIFIED", verifiedAt:new Date(), updatedAt:new Date() } }
      );
      if (!updated.matchedCount) {
        return res.status(404).json({ ok:false, message:"Result not found." });
      }
      return res.status(200).json({ ok:true, message:"Result verified successfully." });
    }

    if (action === "publishResult" && req.method === "PUT") {
      const id = String((req.body || {}).resultId || "");
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ ok:false, message:"Invalid result ID." });
      }
      const found = await results.findOne({ _id:new ObjectId(id) });
      if (!found) {
        return res.status(404).json({ ok:false, message:"Result not found." });
      }
      if (found.status && found.status !== "VERIFIED" && found.status !== "PUBLISHED") {
        return res.status(409).json({
          ok:false,
          message:"Verify the result before publishing it."
        });
      }
      await results.updateOne(
        { _id:new ObjectId(id) },
        { $set:{ status:"PUBLISHED", publishedAt:new Date(), updatedAt:new Date() } }
      );
      return res.status(200).json({ ok:true, message:"Result published successfully." });
    }

    if (action === "unverifyResult" && req.method === "PUT") {
      const id = String((req.body || {}).resultId || "");
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ ok:false, message:"Invalid result ID." });
      }
      const updated = await results.updateOne(
        { _id:new ObjectId(id) },
        { $set:{ status:"DRAFT", updatedAt:new Date() }, $unset:{ verifiedAt:"", publishedAt:"" } }
      );
      if (!updated.matchedCount) {
        return res.status(404).json({ ok:false, message:"Result not found." });
      }
      return res.status(200).json({ ok:true, message:"Result moved back to draft." });
    }

    if (action === "deleteResult" && req.method === "DELETE") {
      const resultId = String(req.query.id || "");

      if (!ObjectId.isValid(resultId)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid result ID."
        });
      }

      const deleted = await results.deleteOne({
        _id: new ObjectId(resultId)
      });

      if (!deleted.deletedCount) {
        return res.status(404).json({
          ok: false,
          message: "Result not found."
        });
      }

      return res.status(200).json({
        ok: true,
        message: "Competition result deleted successfully."
      });
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
        status: "DRAFT",
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
        .find(officialResultFilter)
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
        .find(officialResultFilter)
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
            status: row.status || "PUBLISHED",
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
