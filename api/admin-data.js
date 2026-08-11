const {getDb,send,adminAuthenticated}=require("../lib/db");
module.exports=async(req,res)=>{
 if(req.method!=="GET")return send(res,405,{ok:false,message:"Method GET diperlukan."});
 if(!adminAuthenticated(req))return send(res,401,{ok:false,message:"Admin belum disahkan."});
 try{
  const db=await getDb();
  const registrations=await db.collection("registrations").find({}).sort({createdAt:-1}).limit(1000).toArray();
  const results=await db.collection("results").find({}).sort({updatedAt:-1}).toArray();
  const events=[...new Set(registrations.map(x=>x.event).filter(Boolean))];
  const points={};
  for(const r of results){const id=String(r.registrationId||"");points[id]=(points[id]||0)+Number(r.points||0);}
  const leaderboard=registrations.map(x=>({id:String(x._id),studentName:x.studentName,studentId:x.studentId,house:x.house,points:points[String(x._id)]||0})).sort((a,b)=>b.points-a.points).slice(0,10);
  return send(res,200,{ok:true,totalStudents:registrations.length,eventsOngoing:events.length,totalResults:results.length,registrations,results,leaderboard});
 }catch(e){console.error("ADMIN_DATA_ERROR",e);return send(res,500,{ok:false,message:"Admin gagal mendapatkan data daripada MongoDB.",error:e.message});}
};
