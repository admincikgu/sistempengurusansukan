const { getDb } = require("../lib/db");
const { ObjectId } = require("mongodb");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "Method not allowed."
    });
  }

  try {
    const db = await getDb();
    const registrations = db.collection("registrations");
    const results = db.collection("results");

    const resultRows = await results
      .find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(50)
      .toArray();

    if (!resultRows.length) {
      return res.status(200).json([]);
    }

    const ids = [
      ...new Set(
        resultRows
          .map(row => row.registrationId)
          .filter(Boolean)
          .map(String)
      )
    ];

    const objectIds = ids
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    const registrationRows = objectIds.length
      ? await registrations.find({ _id: { $in: objectIds } }).toArray()
      : [];

    const registrationMap = new Map(
      registrationRows.map(row => [String(row._id), row])
    );

    const rows = resultRows
      .map(row => {
        const registration = registrationMap.get(
          row.registrationId ? String(row.registrationId) : ""
        );

        if (!registration) return null;

        return {
          studentName: String(registration.studentName || "Participant"),
          studentId: String(registration.studentId || ""),
          className: String(registration.className || ""),
          event: String(registration.event || ""),
          category: String(registration.category || ""),
          house: String(registration.house || ""),
          position: Number(row.position || 0),
          points: Number(row.points || 0),
          timing: String(row.timing || ""),
          updatedAt: row.updatedAt || row.createdAt || null
        };
      })
      .filter(Boolean);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("public-results error:", error);
    return res.status(500).json({
      ok: false,
      message: "Unable to load public competition results."
    });
  }
};
