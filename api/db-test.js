const { connectDB, Registration } = require("./_db");

module.exports = async function handler(req, res) {
  try {
    await connectDB();
    const count = await Registration.countDocuments();
    return res.status(200).json({
      ok: true,
      mongodb: "connected",
      database: "school_sports",
      registrations: count
    });
  } catch (e) {
    console.error("DB TEST:", e);
    return res.status(500).json({
      ok: false,
      mongodb: "failed",
      error: e.message
    });
  }
};
