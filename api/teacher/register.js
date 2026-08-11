const {getDb,send}=require("../_db");
module.exports=async(req,res)=>{
 if(req.method!=="POST")return send(res,405,{ok:false,message:"Method POST diperlukan."});
 try{
  const b=req.body||{}, studentName=String(b.studentName||"").trim(),studentId=String(b.studentId||"").trim(),event=String(b.event||"").trim(),category=String(b.category||"").trim(),house=String(b.house||"").trim(),teacher=String(b.teacher||"Guru").trim();
  if(!studentName||!studentId||!event||!category||!house)return send(res,400,{ok:false,message:"Sila lengkapkan semua maklumat pendaftaran."});
  const db=await getDb(), c=db.collection("registrations");
  if(await c.findOne({studentId,event,category}))return send(res,409,{ok:false,message:"Pelajar ini sudah didaftarkan untuk acara dan kategori tersebut."});
  const doc={studentName,studentId,event,category,house,teacher,createdAt:new Date(),updatedAt:new Date()};
  const r=await c.insertOne(doc);return send(res,201,{ok:true,message:"Pendaftaran berjaya disimpan.",data:{...doc,_id:r.insertedId}});
 }catch(e){console.error(e);return send(res,500,{ok:false,message:"Gagal menyimpan pendaftaran.",error:e.message});}
};

