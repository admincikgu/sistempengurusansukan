const {getDb,DB}=require("../lib/db");
module.exports=async(req,res)=>{
  if(req.method!=="GET") return res.status(405).json({ok:false,message:"GET requests only."});
  try{
    const db=await getDb();
    res.status(200).json({ok:true,mongodb:"connected",database:DB,registrations:await db.collection("registrations").countDocuments()});
  }catch(e){res.status(500).json({ok:false,mongodb:"failed",error:e.message});}
};
