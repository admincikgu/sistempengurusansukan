const {getDb,adminOK,ObjectId}=require("../lib/db");
module.exports=async(req,res)=>{
  try{
    const action=String(req.query.action||"");
    if(action==="unlock"&&req.method==="POST"){
      const pin=String((req.body||{}).pin||"").trim(), expected=String(process.env.ADMIN_PIN||"smkbadawi2026");
      return pin===expected?res.status(200).json({ok:true,token:expected}):res.status(401).json({ok:false,message:"Invalid PIN."});
    }
    if(!adminOK(req)) return res.status(401).json({ok:false,message:"Administrator access is required."});
    const db=await getDb(), c=db.collection("registrations"), r=db.collection("results");
    if(action==="status") return res.status(200).json({ok:true,database:"connected",total:await c.countDocuments(),events:(await c.distinct("event")).length});
    if(action==="overview") return res.status(200).json({ok:true,total:await c.countDocuments(),eventsOngoing:(await c.distinct("event")).length,totalResults:await r.countDocuments()});
    if(action==="registrations"){
      const q=String(req.query.q||"").trim(),f=q?{$or:[
        {studentName:{$regex:q,$options:"i"}},{studentId:{$regex:q,$options:"i"}},
        {className:{$regex:q,$options:"i"}},{event:{$regex:q,$options:"i"}},
        {category:{$regex:q,$options:"i"}},{house:{$regex:q,$options:"i"}},{teacher:{$regex:q,$options:"i"}}
      ]}:{};
      return res.status(200).json(await c.find(f).sort({createdAt:-1}).limit(2000).toArray());
    }
    if(action==="update"&&req.method==="PUT"){
      const b=req.body||{},id=String(b.id||"");
      if(!ObjectId.isValid(id)) return res.status(400).json({ok:false,message:"Invalid registration ID."});
      const u={studentName:String(b.studentName||"").trim(),studentId:String(b.studentId||"").trim(),className:String(b.className||"").trim(),event:String(b.event||"").trim(),category:String(b.category||"").trim(),house:String(b.house||"").trim(),teacher:String(b.teacher||"Teacher").trim(),updatedAt:new Date()};
      if(Object.values(u).slice(0,6).some(v=>!v)) return res.status(400).json({ok:false,message:"Please complete all required fields."});
      const dup=await c.findOne({_id:{$ne:new ObjectId(id)},studentId:u.studentId,event:u.event,category:u.category});
      if(dup) return res.status(409).json({ok:false,message:"Another registration already uses this student, event and category."});
      const x=await c.findOneAndUpdate({_id:new ObjectId(id)},{$set:u},{returnDocument:"after"});
      if(!x.value) return res.status(404).json({ok:false,message:"Registration not found."});
      return res.status(200).json({ok:true,message:"Registration updated successfully.",data:x.value});
    }
    if(action==="delete"&&req.method==="DELETE"){
      const id=String(req.query.id||"");
      if(!ObjectId.isValid(id)) return res.status(400).json({ok:false,message:"Invalid registration ID."});
      const x=await c.deleteOne({_id:new ObjectId(id)});
      if(!x.deletedCount) return res.status(404).json({ok:false,message:"Registration not found."});
      await r.deleteMany({registrationId:new ObjectId(id)});
      return res.status(200).json({ok:true,message:"Registration deleted successfully."});
    }
    if(action==="result"&&req.method==="POST"){
      const b=req.body||{},id=String(b.registrationId||"");
      if(!ObjectId.isValid(id)) return res.status(400).json({ok:false,message:"Invalid participant ID."});
      const d={registrationId:new ObjectId(id),position:Number(b.position||0),score:Number(b.score||0),timing:String(b.timing||""),points:Number(b.points||0),updatedAt:new Date()};
      await r.updateOne({registrationId:d.registrationId},{$set:d,$setOnInsert:{createdAt:new Date()}},{upsert:true});
      return res.status(200).json({ok:true,message:"Result saved successfully."});
    }
    if(action==="leaderboard"){
      return res.status(200).json(await r.aggregate([
        {$lookup:{from:"registrations",localField:"registrationId",foreignField:"_id",as:"registration"}},
        {$unwind:"$registration"},
        {$group:{_id:"$registration.studentId",studentName:{$first:"$registration.studentName"},house:{$first:"$registration.house"},points:{$sum:"$points"}}},
        {$sort:{points:-1,studentName:1}},{$limit:10}
      ]).toArray());
    }
    res.status(404).json({ok:false,message:"Administrator action not found.",action});
  }catch(e){res.status(500).json({ok:false,message:"Administrator API failed.",error:e.message});}
};
