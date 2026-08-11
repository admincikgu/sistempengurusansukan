const {getDb,send}=require("../../lib/db");
module.exports=async(req,res)=>{
 if(req.method!=="GET")return send(res,405,{ok:false,message:"Method GET diperlukan."});
 try{const teacher=String(req.query.teacher||"").trim();const data=await (await getDb()).collection("registrations").find(teacher?{teacher}:{}).sort({createdAt:-1}).limit(500).toArray();return send(res,200,{ok:true,data});}
 catch(e){console.error("TEACHER_REGISTRATIONS_ERROR",e);return send(res,500,{ok:false,message:"Gagal mendapatkan rekod pendaftaran.",error:e.message});}
};
