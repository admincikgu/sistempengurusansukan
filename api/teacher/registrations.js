const {getDb,send}=require("../_db");
module.exports=async(req,res)=>{
 if(req.method!=="GET")return send(res,405,{ok:false,message:"Method GET diperlukan."});
 try{const db=await getDb(),teacher=String(req.query.teacher||"").trim(),data=await db.collection("registrations").find(teacher?{teacher}:{}).sort({createdAt:-1}).limit(100).toArray();return send(res,200,{ok:true,data});}
 catch(e){console.error(e);return send(res,500,{ok:false,message:"Gagal mendapatkan rekod pendaftaran.",error:e.message});}
};

