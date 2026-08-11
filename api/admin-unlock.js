const { json } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { message: "Method not allowed." });

  const pin = String((req.body || {}).pin || "");
  const expected = String(process.env.ADMIN_PIN || "123456");

  if (pin !== expected) return json(res, 401, { message: "PIN tidak sah." });

  return json(res, 200, { ok: true, token: expected });
};
