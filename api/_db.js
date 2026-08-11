const { MongoClient } = require("mongodb");
let cache = global.__SMK_BADAWI_MONGO__ || (global.__SMK_BADAWI_MONGO__={client:null,db:null,promise:null});
const DB_NAME="school_sports";
async function getDb(){
 const uri=process.env.MONGODB_URI;
 if(!uri) throw new Error("MONGODB_URI belum ditetapkan di Vercel Environment Variables.");
 if(cache.db) return cache.db;
 if(!cache.promise) cache.promise=MongoClient.connect(uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,maxPoolSize:10});
 try{cache.client=await cache.promise;cache.db=cache.client.db(DB_NAME);await cache.db.command({ping:1});return cache.db;}
 catch(e){cache.promise=null;cache.client=null;cache.db=null;throw e;}
}
const send=(res,status,data)=>res.status(status).json(data);
const adminAuthenticated=req=>String(req.headers["x-admin-password"]||"")==="smkbadawi2026";
module.exports={getDb,send,adminAuthenticated,DB_NAME};

