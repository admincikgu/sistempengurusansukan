const { MongoClient, ObjectId } = require("mongodb");
let s = global.__SMKDHAB_DB_V15__;
if (!s) s = global.__SMKDHAB_DB_V15__ = { db:null, promise:null };
const DB = "school_sports";
async function getDb(){
  const uri = process.env.MONGODB_URI;
  if(!uri) throw new Error("MONGODB_URI is not configured in Vercel.");
  if(s.db) return s.db;
  if(!s.promise) s.promise = MongoClient.connect(uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,maxPoolSize:10});
  try{
    const client = await s.promise;
    s.db = client.db(DB);
    await s.db.command({ping:1});
    return s.db;
  }catch(e){s.promise=null;s.db=null;throw e;}
}
const adminOK=req=>String(req.headers["x-admin-pin"]||"")===String(process.env.ADMIN_PIN||"smkbadawi2026");
module.exports={getDb,adminOK,DB,ObjectId};
