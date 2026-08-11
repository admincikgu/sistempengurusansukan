const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

let cache = global.__sportsMongo;
if (!cache) cache = global.__sportsMongo = { conn: null, promise: null };

const registrationSchema = new mongoose.Schema({
  studentName:String, studentId:String, event:String, category:String,
  house:String, teacher:{type:String,default:"Guru"}, createdAt:{type:Date,default:Date.now}
});
const resultSchema = new mongoose.Schema({
  registrationId:{type:mongoose.Schema.Types.ObjectId,required:true},
  position:Number, score:Number, timing:String, points:{type:Number,default:0}, createdAt:{type:Date,default:Date.now}
});
const Registration = mongoose.models.Registration || mongoose.model("Registration",registrationSchema);
const Result = mongoose.models.Result || mongoose.model("Result",resultSchema);

const master={
 events:["100m","200m","400m","800m","1500m","4x100m","4x200m","Lompat Jauh","Lompat Tinggi","Lompat Kijang","Lempar Cakera","Lontar Peluru","Merejam Lembing","Tarik Tali"],
 categories:["L3 (Ting. 1)","L2 (T2 & 3)","L1 (T4 & 5)","P3","P2","P1"],
 houses:["Bahaman","Mat Kilau","Dato' Sagor","Dato' Maharajalela"]
};

async function db(){
 const uri=process.env.MONGODB_URI;
 if(!uri) throw new Error("MONGODB_URI is missing in Vercel Environment Variables.");
 if(cache.conn) return cache.conn;
 if(!cache.promise) cache.promise=mongoose.connect(uri,{serverSelectionTimeoutMS:10000,bufferCommands:false});
 cache.conn=await cache.promise; return cache.conn;
}
function json(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.end(JSON.stringify(data));}
async function readBody(req){
 if(req.body && typeof req.body==="object") return req.body;
 return await new Promise((resolve,reject)=>{
   let s="";req.on("data",c=>s+=c);req.on("end",()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on("error",reject);
 });
}
function route(req){
 const p=new URL(req.url,"https://local").pathname;
 return p.replace(/^\/api/,"") || "/";
}

module.exports=async(req,res)=>{
 try{
  const r=route(req);

  // Fallback page/static serving: this keeps the site working even if a
  // deployment routes the root request through the catch-all function.
  if(req.method==="GET" && (r==="/" || r==="/teacher" || r==="/admin" || r==="/style.css")){
    const file = r==="/" ? "index.html" : r==="/teacher" ? "teacher.html" : r==="/admin" ? "admin.html" : "style.css";
    const filePath = path.join(process.cwd(), file);
    if(fs.existsSync(filePath)){
      const ext=path.extname(file);
      const type=ext===".css" ? "text/css; charset=utf-8" : "text/html; charset=utf-8";
      res.statusCode=200; res.setHeader("Content-Type",type);
      return res.end(fs.readFileSync(filePath));
    }
  }

  if(req.method==="GET" && r==="/health") return json(res,200,{ok:true,service:"school-sports-api"});
  if(req.method==="GET" && r==="/master") return json(res,200,master);

  if(req.method==="POST" && r==="/admin/unlock"){
   const b=await readBody(req);
   return String(b.pin||"")===String(process.env.ADMIN_PIN||"123456")
    ? json(res,200,{ok:true}) : json(res,401,{message:"PIN tidak sah."});
  }

  await db();

  if(req.method==="POST" && r==="/teacher/register"){
   const b=await readBody(req);
   if(!b.studentName||!b.studentId||!b.event||!b.category||!b.house)
    return json(res,400,{message:"Sila lengkapkan semua maklumat."});
   if(await Registration.findOne({studentId:b.studentId,event:b.event,category:b.category}))
    return json(res,409,{message:"Pelajar sudah didaftarkan untuk acara dan kategori ini."});
   return json(res,201,await Registration.create({
    studentName:b.studentName,studentId:b.studentId,event:b.event,
    category:b.category,house:b.house,teacher:b.teacher||"Guru"
   }));
  }

  if(req.method==="GET" && r==="/teacher/registrations"){
   const u=new URL(req.url,"https://local"),t=u.searchParams.get("teacher");
   return json(res,200,await Registration.find(t?{teacher:t}:{}).sort({createdAt:-1}).limit(100));
  }

  if(req.method==="DELETE" && r.startsWith("/teacher/registrations/")){
   const id=r.split("/").pop();
   await Registration.findByIdAndDelete(id); await Result.deleteMany({registrationId:id});
   return json(res,200,{ok:true});
  }

  if(req.method==="GET" && r==="/admin/overview"){
   const total=await Registration.countDocuments(),events=await Registration.distinct("event");
   const houses=await Registration.aggregate([{$group:{_id:"$house",total:{$sum:1}}}]);
   return json(res,200,{total,eventsOngoing:events.length,houses});
  }

  if(req.method==="GET" && r==="/admin/registrations"){
   const u=new URL(req.url,"https://local"),q=(u.searchParams.get("q")||"").trim();
   const filter=q?{$or:[
    {studentName:{$regex:q,$options:"i"}},{studentId:{$regex:q,$options:"i"}},
    {event:{$regex:q,$options:"i"}},{house:{$regex:q,$options:"i"}}
   ]}:{};
   return json(res,200,await Registration.find(filter).sort({createdAt:-1}).limit(500));
  }

  if(req.method==="POST" && r==="/admin/results"){
   const b=await readBody(req);
   return json(res,200,await Result.findOneAndUpdate(
    {registrationId:b.registrationId},
    {position:b.position,score:b.score,timing:b.timing,points:b.points||0},
    {upsert:true,new:true}
   ));
  }

  if(req.method==="GET" && r==="/admin/leaderboard"){
   return json(res,200,await Registration.aggregate([
    {$lookup:{from:"results",localField:"_id",foreignField:"registrationId",as:"result"}},
    {$unwind:{path:"$result",preserveNullAndEmptyArrays:true}},
    {$group:{_id:"$studentId",studentName:{$first:"$studentName"},house:{$first:"$house"},points:{$sum:{$ifNull:["$result.points",0]}}}},
    {$sort:{points:-1}},{$limit:10}
   ]));
  }

  return json(res,404,{message:"API route not found",route:r});
 }catch(e){
  console.error(e);
  return json(res,500,{message:e.message||"Server error"});
 }
};
