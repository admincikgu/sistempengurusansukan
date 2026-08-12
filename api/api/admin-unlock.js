module.exports = async function(req, res) {
  if (req.method !== "POST") return res.status(405).json({
    ok: false, message: "POST sahaja."
  });

  const pin = String((req.body || {}).pin || "").trim();
  const expected = String(process.env.ADMIN_PIN || "smkbadawi2026");

  if (pin !== expected) {
    return res.status(401).json({
      ok: false,
      message: "PIN tidak sah."
    });
  }

  return res.status(200).json({
    ok: true,
    token: expected
  });
};
