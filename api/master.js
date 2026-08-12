module.exports=(req,res)=>res.status(200).json({
  ok:true,
  events:["100m","200m","400m","800m","1500m","4x100m","4x200m","Lompat Jauh","Lompat Tinggi","Lompat Kijang","Lempar Cakera","Lontar Peluru","Merejam Lembing","Tarik Tali"],
  categories:["L3 (Ting. 1)","L2 (T2 & 3)","L1 (T4 & 5)","P3","P2","P1"],
  houses:["Bahaman","Mat Kilau","Dato' Sagor","Dato' Maharajalela"],
  classes:["1A","1B","1C","2A","2B","2C","3A","3B","3C","4A","4B","4C","5A","5B","5C"]
});
