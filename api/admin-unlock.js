const ADMIN_PASSWORD = "smkbadawi2026";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed." });

  const pin = String((req.body || {}).pin || "").trim();

  if (pin !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "PIN tidak sah." });
  }

  return res.status(200).json({
    ok: true,
    token: ADMIN_PASSWORD
  });
};
