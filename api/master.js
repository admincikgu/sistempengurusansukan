module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    events: [
      "100m","200m","400m","800m","1500m",
      "4x100m","4x200m",
      "Lompat Jauh","Lompat Tinggi","Lompat Kijang",
      "Lempar Cakera","Lontar Peluru","Merejam Lembing","Tarik Tali"
    ],
    categories: [
      "L3 (Tingkatan 1)",
      "L2 (Tingkatan 2&3)",
      "L1 (Tingkatan 4&5)",
      "P3 (Tingkatan 1)",
      "P2 (Tingkatan 2&3)",
      "P1 (Tingkatan 4&5)"
    ],
    houses: [
      "Bahaman",
      "Mat Kilau",
      "Dato' Sagor",
      "Dato' Maharajalela"
    ],
    classes: [
      "1UM","1USM","1UKM","1UTM","1UUM",
      "2UM","2USM","2UKM","2UTM","2UUM",
      "3UM","3USM","3UKM","3UTM","3UUM",
      "4UM","4UPM","4UUM","4UKM","4UTM","4USM",
      "5UM","5UPM","5UUM","5UKM","5UTM","5USM"
    ]
  });
};
