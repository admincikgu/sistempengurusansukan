const { json } = require("./_db");

const master = {
  events: [
    "100m","200m","400m","800m","1500m","4x100m","4x200m",
    "Lompat Jauh","Lompat Tinggi","Lompat Kijang",
    "Lempar Cakera","Lontar Peluru","Merejam Lembing","Tarik Tali"
  ],
  categories: ["L3 (Ting. 1)","L2 (T2 & 3)","L1 (T4 & 5)","P3","P2","P1"],
  houses: ["Bahaman","Mat Kilau","Dato' Sagor","Dato' Maharajalela"]
};

module.exports = async function handler(req, res) {
  return json(res, 200, master);
};
