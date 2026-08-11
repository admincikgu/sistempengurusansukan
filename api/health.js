module.exports = async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    service: "school-sports-api",
    version: "v6"
  });
};
