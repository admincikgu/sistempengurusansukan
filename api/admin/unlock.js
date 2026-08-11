module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({ok:false,message:"Method POST diperlukan."});
 const password=String((req.body||{}).password||"").trim();
 if(password!=="smkbadawi2026")return res.status(401).json({ok:false,message:"Kata laluan admin tidak sah."});
 return res.status(200).json({ok:true,token:"smkbadawi2026"});
};
