const { getDb, DB_NAME } = require("../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "GET sahaja." });
  }

  try {
    const db = await getDb();
    const registrations = await db.collection("registrations").countDocuments();

    return res.status(200).json({
      ok: true,
      mongodb: "connected",
      database: DB_NAME,
      registrations
    });
  } catch (error) {
    console.error("DB_TEST", error);
    return res.status(500).json({
      ok: false,
      mongodb: "failed",
      error: error.message
    });
  }
};
