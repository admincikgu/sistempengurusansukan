const {getDb,send,DB_NAME}=require("../lib/db");
module.exports=async(req,res)=>{
 if(req.method!=="GET")return send(res,405,{ok:false,message:"GET sahaja."});
 try{const db=await getDb();await db.command({ping:1});const registrations=await db.collection("registrations").countDocuments();return send(res,200,{ok:true,mongodb:"connected",database:DB_NAME,registrations});}
 catch(e){console.error("DB_TEST_ERROR",e);return send(res,500,{ok:false,mongodb:"failed",error:e.message});}
};
