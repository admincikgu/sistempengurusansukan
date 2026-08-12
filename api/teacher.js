const {getDb}=require("../lib/db");
module.exports=async(req,res)=>{
  try{
    const c=(await getDb()).collection("registrations");
    const action=String(req.query.action||(req.method==="POST"?"register":"list"));
    if(action==="list"&&req.method==="GET"){
      const teacher=String(req.query.teacher||"").trim();
      return res.status(200).json(await c.find(teacher?{teacher}:{}).sort({createdAt:-1}).limit(1000).toArray());
    }
    if(action==="register"&&req.method==="POST"){
      const b=req.body||{},doc={
        studentName:String(b.studentName||"").trim(),
        studentId:String(b.studentId||"").trim(),
        className:String(b.className||"").trim(),
        event:String(b.event||"").trim(),
        category:String(b.category||"").trim(),
        house:String(b.house||"").trim(),
        teacher:String(b.teacher||"Teacher").trim(),
        createdAt:new Date(),updatedAt:new Date()
      };
      if(!doc.studentName||!doc.studentId||!doc.className||!doc.event||!doc.category||!doc.house)
        return res.status(400).json({ok:false,message:"Please complete all required fields."});
      if(await c.findOne({studentId:doc.studentId,event:doc.event,category:doc.category}))
        return res.status(409).json({ok:false,message:"This student is already registered for this event and category."});
      const x=await c.insertOne(doc);
      return res.status(201).json({ok:true,message:"Registration saved successfully.",data:{...doc,_id:String(x.insertedId)}});
    }
    return res.status(405).json({ok:false,message:"Invalid Teacher API action."});
  }catch(e){res.status(500).json({ok:false,message:"Teacher API failed.",error:e.message});}
};
