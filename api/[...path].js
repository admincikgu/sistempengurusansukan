
const { MongoClient, ObjectId } = require("mongodb");

let cache = global.__SMKDB__;
if (!cache) cache = global.__SMKDB__ = { db:null, promise:null };

const DB = "school_sports";
const PIN = process.env.ADMIN_PIN || "smkbadawi2026";

function out(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type","application/json");
  res.end(JSON.stringify(data));
}

function route(req) {
  return new URL(req.url, "https://local").pathname
    .replace(/^\/api/, "").replace(/\/+$/,"") || "/";
}

async function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve,reject)=>{
    let raw="";
    req.on("data",c=>raw+=c);
    req.on("end",()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});
    req.on("error",reject);
  });
}

async function db() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  if (cache.db) return cache.db;
  if (!cache.promise) cache.promise = MongoClient.connect(process.env.MONGODB_URI,{
    serverSelectionTimeoutMS:10000, connectTimeoutMS:10000, maxPoolSize:10
  });
  try {
    const client = await cache.promise;
    cache.db = client.db(DB);
    await cache.db.command({ping:1});
    return cache.db;
  } catch(e) {
    cache.promise=null; cache.db=null; throw e;
  }
}

function admin(req){ return String(req.headers["x-admin-pin"]||"") === String(PIN); }

module.exports = async (req,res) => {
  try {
    const r = route(req);

    if (req.method==="GET" && r==="/health")
      return out(res,200,{ok:true,service:"school-sports-api",version:"v12"});

    if (req.method==="GET" && r==="/master")
      return out(res,200,{ok:true,
        events:["100m","200m","400m","800m","1500m","4x100m","4x200m","Lompat Jauh","Lompat Tinggi","Lompat Kijang","Lempar Cakera","Lontar Peluru","Merejam Lembing","Tarik Tali"],
        categories:["L3 (Ting. 1)","L2 (T2 & 3)","L1 (T4 & 5)","P3","P2","P1"],
        houses:["Bahaman","Mat Kilau","Dato' Sagor","Dato' Maharajalela"]
      });

    if (req.method==="POST" && r==="/admin/unlock") {
      const b=await getBody(req);
      return String(b.pin||"").trim()===String(PIN)
        ? out(res,200,{ok:true,token:String(PIN)})
        : out(res,401,{ok:false,message:"PIN tidak sah."});
    }

    const database = await db();
    const reg = database.collection("registrations");
    const results = database.collection("results");

    if (req.method==="GET" && r==="/db-test") {
      return out(res,200,{ok:true,mongodb:"connected",database:DB,registrations:await reg.countDocuments()});
    }

    if (req.method==="GET" && r==="/admin/status") {
      return out(res,200,{ok:true,database:"connected",total:await reg.countDocuments(),events:(await reg.distinct("event")).length});
    }

    if (req.method==="POST" && r==="/teacher/register") {
      const b=await getBody(req);
      const doc={
        studentName:String(b.studentName||"").trim(),
        studentId:String(b.studentId||"").trim(),
        event:String(b.event||"").trim(),
        category:String(b.category||"").trim(),
        house:String(b.house||"").trim(),
        teacher:String(b.teacher||"Guru").trim(),
        createdAt:new Date()
      };
      if(Object.values(doc).slice(0,5).some(v=>!v))
        return out(res,400,{ok:false,message:"Sila lengkapkan semua maklumat."});

      const dup=await reg.findOne({studentId:doc.studentId,event:doc.event,category:doc.category});
      if(dup) return out(res,409,{ok:false,message:"Pelajar sudah didaftarkan untuk acara dan kategori ini."});
      const x=await reg.insertOne(doc);
      return out(res,201,{ok:true,message:"Pendaftaran berjaya disimpan.",data:{...doc,_id:String(x.insertedId)}});
    }

    if (req.method==="GET" && r==="/teacher/registrations") {
      const u=new URL(req.url,"https://local"), teacher=(u.searchParams.get("teacher")||"").trim();
      const data=await reg.find(teacher?{teacher}:{}).sort({createdAt:-1}).limit(500).toArray();
      return out(res,200,data);
    }

    if (req.method==="GET" && r==="/admin/overview") {
      if(!admin(req)) return out(res,401,{ok:false,message:"Akses admin diperlukan."});
      return out(res,200,{ok:true,total:await reg.countDocuments(),eventsOngoing:(await reg.distinct("event")).length,totalResults:await results.countDocuments()});
    }

    if (req.method==="GET" && r==="/admin/registrations") {
      if(!admin(req)) return out(res,401,{ok:false,message:"Akses admin diperlukan."});
      const u=new URL(req.url,"https://local"),q=(u.searchParams.get("q")||"").trim();
      const filter=q?{$or:[
        {studentName:{$regex:q,$options:"i"}},{studentId:{$regex:q,$options:"i"}},
        {event:{$regex:q,$options:"i"}},{category:{$regex:q,$options:"i"}},
        {house:{$regex:q,$options:"i"}},{teacher:{$regex:q,$options:"i"}}
      ]}:{};
      return out(res,200,await reg.find(filter).sort({createdAt:-1}).limit(1000).toArray());
    }

    if (req.method==="POST" && r==="/admin/result") {
      if(!admin(req)) return out(res,401,{ok:false,message:"Akses admin diperlukan."});
      const b=await getBody(req), id=String(b.registrationId||"");
      if(!ObjectId.isValid(id)) return out(res,400,{ok:false,message:"ID peserta tidak sah."});
      const doc={registrationId:new ObjectId(id),position:Number(b.position||0),score:Number(b.score||0),timing:String(b.timing||""),points:Number(b.points||0),updatedAt:new Date()};
      await results.updateOne({registrationId:doc.registrationId},{$set:doc,$setOnInsert:{createdAt:new Date()}},{upsert:true});
      return out(res,200,{ok:true,message:"Keputusan berjaya disimpan."});
    }

    if (req.method==="GET" && r==="/admin/leaderboard") {
      if(!admin(req)) return out(res,401,{ok:false,message:"Akses admin diperlukan."});
      return out(res,200,await results.aggregate([
        {$lookup:{from:"registrations",localField:"registrationId",foreignField:"_id",as:"r"}},
        {$unwind:"$r"},
        {$group:{_id:"$r.studentId",studentName:{$first:"$r.studentName"},house:{$first:"$r.house"},points:{$sum:"$points"}}},
        {$sort:{points:-1}},{$limit:10}
      ]).toArray());
    }

    return out(res,404,{ok:false,message:"API route not found",route:r});
  } catch(e) {
    console.error(e);
    return out(res,500,{ok:false,message:"Server error",error:e.message});
  }
};
