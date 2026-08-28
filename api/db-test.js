const { getDb, DB_NAME } = require("../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "GET requests only."
    });
  }

  try {
    const db = await getDb();
    const count = await db.collection("registrations").countDocuments();

    return res.status(200).json({
      ok: true,
      mongodb: "connected",
      database: DB_NAME,
      registrations: count
    });
  } catch (error) {
    console.error("DB_TEST", error);
    return res.status(500).json({
      ok: false,
      mongodb: "failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};
