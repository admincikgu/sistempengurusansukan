const { getMasterConfig } = require("../lib/db");

const DEFAULTS = {
  events:[
    "100M","200M","400M","800M","1500M",
    "4X100M","4X200M",
    "LOMPAT JAUH","LOMPAT TINGGI","LOMPAT KIJANG",
    "LEMPAR CAKERA","LONTAR PELURU","MEREJAM LEMBING","TARIK TALI"
  ],
  categories:[
    "L3 (TINGKATAN 1)","L2 (TINGKATAN 2&3)","L1 (TINGKATAN 4&5)",
    "P3 (TINGKATAN 1)","P2 (TINGKATAN 2&3)","P1 (TINGKATAN 4&5)"
  ],
  houses:["BAHAMAN","MAT KILAU","DATO' SAGOR","DATO' MAHARAJALELA"],
  classes:[
    "1UM","1USM","1UKM","1UTM","1UUM",
    "2UM","2USM","2UKM","2UTM","2UUM",
    "3UM","3USM","3UKM","3UTM","3UUM",
    "4UM","4UPM","4UUM","4UKM","4UTM","4USM",
    "5UM","5UPM","5UUM","5UKM","5UTM","5USM"
  ]
};

module.exports = async(req,res)=>{
  try{
    if(req.method!=="GET"){
      return res.status(405).json({ok:false,message:"Method not allowed."});
    }
    const current=await getMasterConfig();
    return res.status(200).json({ok:true,...(current||DEFAULTS)});
  }catch(error){
    console.error("MASTER_API",error);
    return res.status(500).json({ok:false,message:"Unable to load master data.",error:error.message});
  }
};