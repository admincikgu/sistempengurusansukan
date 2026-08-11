const { MongoClient } = require("mongodb");
const state = global.__SMK_BADAWI_MONGO__ || (global.__SMK_BADAWI_MONGO__ = {client:null,db:null,promise:null});
const DB_NAME = "school_sports";
async function getDb(){
  const uri=process.env.MONGODB_URI;
  if(!uri) throw new Error("MONGODB_URI belum ditetapkan di Vercel.");
  if(state.db) return state.db;
  if(!state.promise) state.promise=MongoClient.connect(uri,{serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,maxPoolSize:10});
  try{
    state.client=await state.promise;
    state.db=state.client.db(DB_NAME);
    await state.db.command({ping:1});
    return state.db;
  }catch(e){state.promise=null;state.client=null;state.db=null;throw e;}
}
function send(res,status,data){return res.status(status).json(data);}
function adminAuthenticated(req){return String(req.headers["x-admin-password"]||"")==="smkbadawi2026";}
module.exports={getDb,send,adminAuthenticated,DB_NAME};
