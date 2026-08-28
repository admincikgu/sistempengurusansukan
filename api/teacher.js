const { getDb, cleanDoc, getMasterConfig, syncRegistrationToSpreadsheet } = require("../lib/db");

module.exports=async(req,res)=>{
  try{
    const db=await getDb();
    const collection=db.collection("registrations");
    const action=String(req.query.action || (req.method==="POST"?"register":"list"));

    if(action==="students" && req.method==="GET"){
      const q=String(req.query.q||"").trim();
      const safeQ=q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      const filter=q
        ? {$or:[
            {studentName:{$regex:safeQ,$options:"i"}},
            {studentId:{$regex:safeQ,$options:"i"}},
            {className:{$regex:safeQ,$options:"i"}}
          ]}
        : {};
      const studentRows=await db.collection("students")
        .find(filter,{projection:{studentName:1,studentId:1,className:1,house:1}})
        .sort({studentName:1})
        .limit(q?30:1000)
        .toArray();
      return res.status(200).json(studentRows.map(cleanDoc));
    }

    if(action==="list" && req.method==="GET"){
      const teacher=String(req.query.teacher||"").trim();
      const filter=teacher?{teacher}:{};
      const rows=await collection.find(filter).sort({createdAt:-1}).limit(2000).toArray();
      return res.status(200).json(rows.map(cleanDoc));
    }

    if(action==="register" && req.method==="POST"){
      const body=req.body||{};
      const teacher=String(body.teacher||"Teacher").trim();
      const studentName=String(body.studentName||"").trim();
      const studentId=String(body.studentId||"").trim();
      const className=String(body.className||"").trim();
      const house=String(body.house||"").trim();
      const sports=Array.isArray(body.sports)?body.sports:[];

      const pairs=[];
      const seen=new Set();
      for(const item of sports){
        const event=String(item.event||"").trim().toUpperCase();
        const category=String(item.category||"").trim().toUpperCase();
        if(!event||!category)continue;
        const key=`${event}|||${category}`;
        if(!seen.has(key)){seen.add(key);pairs.push({event,category});}
      }

      if(!studentName||!studentId||!className||!house||!pairs.length){
        return res.status(400).json({ok:false,message:"Please complete the participant details and select at least one sport."});
      }

      const config=await getMasterConfig();
      const allowedEvents=new Set((config?.events||[]).map(String));
      const allowedCategories=new Set((config?.categories||[]).map(String));

      for(const pair of pairs){
        if(allowedEvents.size && !allowedEvents.has(pair.event)){
          return res.status(400).json({ok:false,message:`Sport event "${pair.event}" is not available.`});
        }
        if(allowedCategories.size && !allowedCategories.has(pair.category)){
          return res.status(400).json({ok:false,message:`Category "${pair.category}" is not available.`});
        }
      }

      const existing=await collection.find({
        studentId,
        $or:pairs.map(pair=>({event:pair.event,category:pair.category}))
      }).toArray();

      const existingKeys=new Set(existing.map(x=>`${x.event}|||${x.category}`));
      const duplicatePairs=pairs.filter(x=>existingKeys.has(`${x.event}|||${x.category}`));

      if(duplicatePairs.length){
        return res.status(409).json({
          ok:false,
          code:"DUPLICATE",
          message:`${studentName} is already registered for: ${duplicatePairs.map(x=>`${x.event} — ${x.category}`).join(", ")}`
        });
      }

      const createdAt=new Date();
      const docs=pairs.map(pair=>({
        studentName,studentId,className,event:pair.event,category:pair.category,house,teacher,createdAt,updatedAt:createdAt
      }));

      const inserted=await collection.insertMany(docs);
      const ids=Object.values(inserted.insertedIds);
      const saved=await collection.find({_id:{$in:ids}}).toArray();

      let spreadsheetSynced=true;
      for(const row of saved){
        try{
          await syncRegistrationToSpreadsheet({
            registrationId:String(row._id),
            studentName:row.studentName,
            studentId:row.studentId,
            className:row.className,
            event:row.event,
            category:row.category,
            house:row.house,
            teacher:row.teacher,
            session:"2026",
            createdAt:row.createdAt
          });
        }catch(error){
          spreadsheetSynced=false;
          console.error("SHEETS_SYNC",error.message);
        }
      }

      return res.status(201).json({
        ok:true,
        message:`${saved.length} sport registration${saved.length===1?"":"s"} saved successfully.`,
        data:saved.map(cleanDoc),
        spreadsheetSynced
      });
    }

    return res.status(405).json({ok:false,message:"Invalid Teacher API action."});
  }catch(error){
    console.error("TEACHER_API",error);
    return res.status(500).json({ok:false,message:"Teacher API failed.",error:error.message});
  }
};