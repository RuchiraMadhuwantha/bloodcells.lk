const pool=require('../config/db');
const unavailable=()=>Object.assign(new Error('The main blood bank is not ready. Ask blood bank staff to finish setup.'),{statusCode:503});
const getMainBloodBank=async(executor=pool,lock=false)=>{
 const id=Number(process.env.MAIN_BLOOD_BANK_LOCATION_ID);
 if(!Number.isSafeInteger(id)||id<1)throw unavailable();
 const [rows]=await executor.query(`SELECT l.location_id,l.name,l.district FROM stock_locations l
   WHERE l.location_id=? AND l.kind='blood_bank' AND l.active=1 AND EXISTS (
    SELECT 1 FROM bank_location_access a JOIN users u ON u.user_id=a.user_id
    WHERE a.location_id=l.location_id AND u.role='blood_bank' AND u.account_status='active'
   )${lock?' FOR UPDATE':''}`,[id]);
 if(!rows.length)throw unavailable();
 return {id:rows[0].location_id,name:rows[0].name,district:rows[0].district,isMain:true};
};
module.exports={getMainBloodBank};
