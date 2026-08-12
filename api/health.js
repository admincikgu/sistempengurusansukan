module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    service: "school-sports-api",
    version: "v16"
  });
};
