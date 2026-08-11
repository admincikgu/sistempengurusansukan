const {getDb,send,adminAuthenticated}=require("../_db");const {ObjectId}=require("mongodb");
module.exports=async(req,res)=>{
 if(!adminAuthenticated(req))return send(res,401,{ok:false,message:"Akses admin diperlukan."});
 if(req.method!=="POST")return send(res,405,{ok:false,message:"Method POST diperlukan."});
 try{const b=req.body||{},id=String(b.registrationId||"");if(!ObjectId.isValid(id))return send(res,400,{ok:false,message:"ID peserta tidak sah."});const doc={registrationId:new ObjectId(id),position:Number(b.position||0),timing:String(b.timing||"").trim(),score:Number(b.score||0),points:Number(b.points||0),updatedAt:new Date()};await (await getDb()).collection("results").updateOne({registrationId:doc.registrationId},{$set:doc,$setOnInsert:{createdAt:new Date()}},{upsert:true});return send(res,200,{ok:true,message:"Keputusan berjaya disimpan."});}
 catch(e){console.error(e);return send(res,500,{ok:false,message:"Gagal menyimpan keputusan.",error:e.message});}
};

