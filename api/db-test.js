const { getDb, DB_NAME } = require("../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok:false, message:"GET requests only." });
  }

  try {
    const db = await getDb();
    const ping = await db.command({ ping: 1 });
    const count = await db.collection("registrations").countDocuments();

    return res.status(200).json({
      ok: true,
      mongodb: "connected",
      database: DB_NAME,
      ping: ping.ok === 1,
      registrations: count
    });
  } catch (error) {
    console.error("DB_TEST", error);
    return res.status(503).json({
      ok: false,
      mongodb: "offline",
      database: DB_NAME,
      error: String(error.message || error),
      code: error.code || null,
      codeName: error.codeName || null
    });
  }
};
