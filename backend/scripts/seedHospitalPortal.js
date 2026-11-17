const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config({path:path.join(__dirname,'../.env')});

const PREFIX = 'DEMO-P1';
const PASSWORD = 'Demo@12345';
const groups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const baseDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const day = offset => {const d=new Date(baseDate+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
const stamp = (offset,time='10:00:00') => day(offset)+' '+time;

async function main() {
  const db=await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,dateStrings:true});
  const report={demoData:true,date:baseDate,hospitals:[],newDonorPassword:PASSWORD};
  const insert=async(table,record)=>{const [r]=await db.query('INSERT INTO '+db.escapeId(table)+' SET ?',record);return r.insertId;};
  const notify=(userId,title,message,route,type='general',relatedType=null,relatedId=null,when=stamp(0))=>insert('notifications',{user_id:userId,type,title:'DEMO: '+title,message:'DEMO DATA ONLY. '+message,action_route:route,related_type:relatedType,related_id:relatedId,created_at:when});
  const audit=(actor,event,location,batch,entity,details,when=stamp(0))=>insert('bank_audit',{actor_user_id:actor,event,location_id:location,batch_id:batch,entity_id:entity,details:JSON.stringify({...details,demo:true}),created_at:when});
  const movement=(h,batch,delta,after,reason,when,usageId=null)=>insert('stock_movements',{hospital_id:h.hospital_id,batch_id:batch,quantity_delta:delta,quantity_after:after,reason:'DEMO: '+reason,actor_user_id:h.user_id,usage_id:usageId,created_at:when});
  const balance=async id=>{const [r]=await db.query('SELECT quantity FROM stock_batches WHERE batch_id=?',[id]);return r[0].quantity;};
  const take=async(id,quantity)=>{const [r]=await db.query("UPDATE stock_batches SET quantity=quantity-?,version=version+1 WHERE batch_id=? AND quantity-reserved_units>=? AND status='usable' AND expiry_date>=CURDATE()",[quantity,id,quantity]);if(r.affectedRows!==1)throw new Error('Demo source stock is insufficient, expired or unavailable.');return balance(id);};
  try {
    await db.beginTransaction();
    const [banks]=await db.query("SELECT user_id,username FROM users WHERE role='blood_bank' AND account_status='active' ORDER BY (username='demo_bank') DESC,user_id LIMIT 1 FOR UPDATE");
    if(!banks.length)throw new Error('An active blood bank account is required.');
    const bank=banks[0];
    const [hospitals]=await db.query("SELECT h.*,u.username FROM hospitals h JOIN users u ON u.user_id=h.user_id WHERE u.role='hospital' AND u.account_status='active' ORDER BY h.hospital_id FOR UPDATE");
    if(!hospitals.length)throw new Error('No active hospitals found.');
    const [thresholds]=await db.query('SELECT blood_group,low_stock_threshold,critical_stock_threshold FROM blood_inventory');
    const hash=await bcrypt.hash(PASSWORD,10);
    const bankCentres=new Map();
    for(const district of [...new Set(hospitals.map(h=>h.district || 'Colombo'))]) {
      const name='DEMO Receiving Blood Bank - '+district;
      const [existing]=await db.query("SELECT location_id FROM stock_locations WHERE name=? AND kind='blood_bank'",[name]);
      const id=existing[0]?.location_id || await insert('stock_locations',{name,district,kind:'blood_bank'});
      const [access]=await db.query('SELECT user_id FROM bank_location_access WHERE user_id=? AND location_id=?',[bank.user_id,id]);
      if(!access.length)await insert('bank_location_access',{user_id:bank.user_id,location_id:id});
      const batches={};
      for(let i=0;i<groups.length;i++) {
        const group=groups[i],reference=PREFIX+'-BANK-'+id+'-'+group;
        const [prior]=await db.query('SELECT batch_id,collection_date,expiry_date FROM stock_batches WHERE location_id=? AND reference=?',[id,reference]);
        const initial=[36,8,28,6,12,4,44,10][i];
        const batchId=prior[0]?.batch_id || await insert('stock_batches',{location_id:id,reference,blood_group:group,component:'Whole blood (DEMO)',quantity:initial,reserved_units:0,collection_date:day(-7),expiry_date:day(14+i*2),status:'usable',created_at:stamp(-7)});
        if(!prior.length)await audit(bank.user_id,'demo-opening-stock',id,batchId,null,{delta:initial,after:initial,reason:'Fictional opening bank inventory'},stamp(-7));
        batches[group]={id:batchId,collectionDate:prior[0]?.collection_date || day(-7),expiryDate:prior[0]?.expiry_date || day(14+i*2)};
        const [configured]=await db.query('SELECT blood_group FROM bank_stock_thresholds WHERE location_id=? AND blood_group=?',[id,group]);
        const threshold=thresholds.find(t=>t.blood_group===group);
        if(!configured.length)await insert('bank_stock_thresholds',{location_id:id,blood_group:group,low_threshold:threshold?.low_stock_threshold ?? 15,critical_threshold:threshold?.critical_stock_threshold ?? 5});
      }
      bankCentres.set(district,{id,name,batches});
    }

    for(const h of hospitals) {
      const prefix=PREFIX+'-H'+h.hospital_id;
      const digest=crypto.createHash('sha256').update(prefix).digest('hex');
      const [prior]=await db.query("SELECT payload_hash FROM hospital_operation_keys WHERE hospital_id=? AND operation='demo-data-v1' AND idempotency_key=?",[h.hospital_id,PREFIX]);
      if(prior.length){if(prior[0].payload_hash!==digest)throw new Error('Demo marker mismatch.');report.hospitals.push({hospitalId:h.hospital_id,hospital:h.hospital_name,login:h.username,alreadySeeded:true});continue;}
      const receiving=bankCentres.get(h.district || 'Colombo');
      const [locations]=await db.query('SELECT location_id FROM stock_locations WHERE hospital_id=?',[h.hospital_id]);
      const locationId=locations[0]?.location_id || await insert('stock_locations',{hospital_id:h.hospital_id,name:h.hospital_name,district:h.district,kind:'hospital'});
      const hospitalBatches={};
      for(let i=0;i<groups.length;i++) {
        const group=groups[i],quantity=[24,8,20,6,8,4,30,6][i],reserved=i===0?2:i===6?3:0;
        const id=await insert('stock_batches',{location_id:locationId,reference:prefix+'-'+group,blood_group:group,component:'Whole blood (DEMO)',quantity,reserved_units:reserved,collection_date:day(-7),expiry_date:day(14+i*2),status:'usable',created_at:stamp(-7)});
        await movement(h,id,quantity,quantity,'Fictional opening hospital inventory',stamp(-7));
        hospitalBatches[group]={id,collectionDate:day(-7),expiryDate:day(14+i*2)};
      }
      for(const b of [{suffix:'EXPIRED',group:'O+',quantity:3,collection:-30,expiry:-1,status:'usable'},{suffix:'QUARANTINE',group:'B+',quantity:4,collection:-2,expiry:14,status:'quarantined'}]) {
        const id=await insert('stock_batches',{location_id:locationId,reference:prefix+'-'+b.suffix,blood_group:b.group,component:'Whole blood (DEMO)',quantity:b.quantity,collection_date:day(b.collection),expiry_date:day(b.expiry),status:b.status,created_at:stamp(b.collection)});
        await movement(h,id,b.quantity,b.quantity,'Fictional '+b.suffix.toLowerCase()+' batch',stamp(b.collection));
      }

      const donorAccounts=[];
      for(let i=1;i<=4;i++) {
        const username='demo_portal_h'+h.hospital_id+'_d'+i;
        const [existing]=await db.query('SELECT u.user_id,u.role,d.donor_id,d.blood_group,d.nic,d.full_name FROM users u LEFT JOIN donors d ON d.user_id=u.user_id WHERE u.username=?',[username]);
        if(existing.length){if(existing[0].role!=='donor'||!existing[0].donor_id||!existing[0].full_name.startsWith('Demo '))throw new Error('Reserved demo username is already used by another profile.');donorAccounts.push({...existing[0],username});continue;}
        const userId=await insert('users',{username,email:username+'@example.test',password_hash:hash,role:'donor',account_status:'active'});
        const group=['O+','A+','B+','O-'][i-1],nic='1990001'+String(h.hospital_id*10+i).padStart(5,'0');
        const donorId=await insert('donors',{user_id:userId,full_name:'Demo Donor H'+h.hospital_id+'-'+i,nic,date_of_birth:'1990-01-01',gender:i%2?'Male':'Female',blood_group:group,phone:'0000000000',district:h.district,weight:65,last_donation_date:i===1?day(-120):null,declaration_checked:1});
        donorAccounts.push({user_id:userId,donor_id:donorId,blood_group:group,username,nic});
      }
      const appointmentIds=[];
      const cases=[{donor:0,date:-120,status:'completed'},{donor:1,date:0,status:'approved'},{donor:2,date:3,status:'pending'},{donor:3,date:7,status:'approved'},{donor:2,date:-2,status:'cancelled'}];
      for(let i=0;i<cases.length;i++) {
        const a=cases[i],donor=donorAccounts[a.donor];let time;
        for(const candidate of ['09:00','09:30','10:00','10:30','11:00','14:00','14:30','15:00']) {
          const [busy]=await db.query("SELECT appointment_id FROM appointments WHERE appointment_date=? AND time_slot=? AND status<>'cancelled' AND (hospital_id=? OR donor_id=?)",[day(a.date),candidate,h.hospital_id,donor.donor_id]);
          if(!busy.length){time=candidate;break;}
        }
        if(!time)throw new Error('No free slot for demo appointment at '+h.hospital_name);
        const row={donor_id:donor.donor_id,hospital_id:h.hospital_id,appointment_date:day(a.date),time_slot:time,status:a.status,booking_nic:donor.nic || null,notes:prefix+' DEMO appointment '+(i+1)+'. Fictional workflow record.',created_at:stamp(Math.min(a.date-2,-1)),updated_at:stamp(Math.min(a.date,0))};
        if(a.status==='completed')Object.assign(row,{collected_units:1,collected_volume_ml:450,collection_recorded_at:stamp(a.date,'11:00:00'),collection_recorded_by_user_id:h.user_id});
        const id=await insert('appointments',row);appointmentIds.push(id);
        await notify(donor.user_id,'Appointment '+a.status,'Fictional appointment AP-'+String(id).padStart(5,'0')+' at '+h.hospital_name+'.','donor-appointments',a.status==='completed'?'appointment_completed':a.status==='approved'?'appointment_approved':a.status==='cancelled'?'appointment_cancelled':'appointment_confirmation','appointment',id,stamp(Math.min(a.date,0)));
      }

      const requestIds=[];
      const requests=[['A+',3,'pending','emergency',1],['O+',2,'pending','normal',4],['B+',2,'approved','urgent',2],['O-',2,'fulfilled','normal',-2],['AB+',2,'rejected','normal',2],['B-',1,'cancelled','normal',3]];
      for(let i=0;i<requests.length;i++) {
        const [group,quantity,status,urgency,required]=requests[i];
        const row={hospital_id:h.hospital_id,requested_by_user_id:h.user_id,blood_group:group,quantity,status,urgency,required_date:day(required),department:'DEMO training ward',reason:prefix+' DEMO request '+(i+1)+'. Fictional workflow only.',created_at:stamp(status==='fulfilled'?-4:-1)};
        if(['approved','fulfilled','rejected'].includes(status))Object.assign(row,{reviewed_by_user_id:bank.user_id,reviewed_at:stamp(status==='fulfilled'?-2:0),decision_note:'DEMO '+status+' request scenario'});
        if(status==='fulfilled')row.fulfilled_at=stamp(-2);
        const id=await insert('blood_requests',row);requestIds.push(id);
        if(status==='fulfilled') {
          const source=receiving.batches[group],after=await take(source.id,quantity);
          await insert('bank_request_allocations',{request_id:id,batch_id:source.id,quantity,status:'issued',actor_user_id:bank.user_id,created_at:stamp(-2)});
          await audit(bank.user_id,'request-issued',receiving.id,source.id,id,{delta:-quantity,after,hospitalId:h.hospital_id,reason:'DEMO fulfilled hospital request'},stamp(-2));
          const receipt=await insert('stock_batches',{location_id:locationId,reference:prefix+'-REQUEST-RECEIPT',blood_group:group,component:'Whole blood (DEMO)',quantity,collection_date:source.collectionDate,expiry_date:source.expiryDate,status:'usable',created_at:stamp(-2)});
          await movement(h,receipt,quantity,quantity,'Receipt for fulfilled demo request BR-'+String(id).padStart(5,'0'),stamp(-2));
        }
      }
      for(const [group,quantity,offset,category] of [['A+',2,-2,'DEMO ward workflow'],['O+',3,-1,'DEMO surgery workflow']]) {
        const source=hospitalBatches[group];
        const usageId=await insert('hospital_blood_usage',{hospital_id:h.hospital_id,batch_id:source.id,quantity,usage_date:day(offset),category,notes:prefix+' fictional usage; no patient details.',created_by_user_id:h.user_id,created_at:stamp(offset)});
        const after=await take(source.id,quantity);
        await movement(h,source.id,-quantity,after,'Recorded usage: '+category,stamp(offset),usageId);
      }
      const transferIds=[];
      for(const t of [{group:'O+',quantity:3,status:'dispatched',offset:-1},{group:'B+',quantity:2,status:'received',offset:-3}]) {
        const source=hospitalBatches[t.group],after=await take(source.id,t.quantity);
        const transferId=await insert('bank_transfers',{source_location_id:locationId,destination_location_id:receiving.id,source_batch_id:source.id,quantity:t.quantity,reason:prefix+' DEMO transfer '+t.status+'. Fictional stock movement.',status:t.status,created_by_user_id:h.user_id,created_at:stamp(t.offset),updated_at:stamp(t.status==='received'?-2:t.offset)});
        transferIds.push(transferId);
        await movement(h,source.id,-t.quantity,after,'Transfer TR-'+transferId+' to '+receiving.name,stamp(t.offset));
        await audit(h.user_id,'transfer-dispatch',receiving.id,source.id,transferId,{sourceHospitalId:h.hospital_id,quantity:t.quantity,delta:-t.quantity},stamp(t.offset));
        if(t.status==='received') {
          const received=await insert('stock_batches',{location_id:receiving.id,reference:prefix+'-TRANSFER-RECEIVED',blood_group:t.group,component:'Whole blood (DEMO)',quantity:t.quantity,collection_date:source.collectionDate,expiry_date:source.expiryDate,status:'usable',created_at:stamp(-2)});
          await db.query('UPDATE bank_transfers SET destination_batch_id=?,updated_at=? WHERE transfer_id=?',[received,stamp(-2),transferId]);
          await audit(bank.user_id,'transfer-receipt',receiving.id,received,transferId,{sourceBatchId:source.id,delta:t.quantity,after:t.quantity,status:'usable',receivingChecks:'DEMO receiving checks'},stamp(-2));
          await notify(h.user_id,'Blood bank received transfer','Fictional transfer TR-'+transferId+' received: '+t.quantity+' unit(s) '+t.group+'.','hospital-transfers','general','transfer',transferId,stamp(-2));
        } else await notify(bank.user_id,'Incoming hospital blood transfer',h.hospital_name+' has a fictional transfer TR-'+transferId+' awaiting receipt.','bank-transfers','general','transfer',transferId,stamp(t.offset));
      }
      const campaignId=await insert('campaigns',{hospital_id:h.hospital_id,created_by_user_id:bank.user_id,name:('DEMO Blood Donation Drive - '+h.hospital_name).slice(0,150),short_description:'Fictional campaign for hospital portal testing only.',detailed_description:prefix+' demonstration campaign. Not a real event.',status:'Upcoming',campaign_date:day(14),start_time:'09:00',end_time:'14:00',venue_name:h.hospital_name,address:h.address,district:h.district,organizer_name:'DEMO Blood Bank Team',contact_person:'Demo Coordinator',contact_email:'demo.h'+h.hospital_id+'@example.test',needed_blood_groups:'O+,A-,O-',target_donors:50,created_at:stamp(-1)});
      for(const donor of donorAccounts.slice(1,3))await insert('campaign_registrations',{campaign_id:campaignId,donor_id:donor.donor_id,note:'DEMO campaign registration',created_at:stamp(0)});
      await notify(h.user_id,'New blood donation campaign','A fictional campaign was assigned to '+h.hospital_name+' on '+day(14)+'.','hospital-campaigns','campaign','campaign',campaignId);
      await notify(h.user_id,'Demo portal data ready','Sample appointments, requests, stock batches, usage, transfers and reports are available. All DEMO records are fictional.','hospital-dashboard');
      if(h.username.startsWith('demo_'))await db.query("UPDATE hospitals SET official_phone=COALESCE(official_phone,'0000000000'),contact_person_designation=COALESCE(contact_person_designation,'Demo coordinator (fictional)'),contact_person_phone=COALESCE(contact_person_phone,'0000000000') WHERE hospital_id=?",[h.hospital_id]);
      await insert('hospital_operation_keys',{hospital_id:h.hospital_id,operation:'demo-data-v1',idempotency_key:PREFIX,payload_hash:digest,result_id:h.hospital_id});
      report.hospitals.push({hospitalId:h.hospital_id,hospital:h.hospital_name,login:h.username,receivingBank:receiving.name,appointments:appointmentIds.length,requests:requestIds.length,stockBatches:11,usageRecords:2,transfers:transferIds.length,campaigns:1,newDemoDonors:donorAccounts.map(d=>d.username)});
    }
    const [invalid]=await db.query(`SELECT b.batch_id FROM stock_batches b JOIN stock_locations l ON l.location_id=b.location_id
      LEFT JOIN stock_movements m ON m.batch_id=b.batch_id WHERE l.kind='hospital' AND b.reference LIKE 'DEMO-P1-%'
      GROUP BY b.batch_id,b.quantity HAVING b.quantity<>COALESCE(SUM(m.quantity_delta),0)`);
    if(invalid.length)throw new Error('Hospital demo stock movements do not reconcile.');
    const [invalidBank]=await db.query(`SELECT b.batch_id FROM stock_batches b JOIN stock_locations l ON l.location_id=b.location_id
      LEFT JOIN bank_audit a ON a.batch_id=b.batch_id WHERE l.kind='blood_bank' AND b.reference LIKE 'DEMO-P1-%'
      GROUP BY b.batch_id,b.quantity HAVING b.quantity<>COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(a.details,'$.delta')) AS SIGNED)),0)`);
    if(invalidBank.length)throw new Error('Blood bank demo stock audit does not reconcile.');
    await db.commit();
    report.stockBalancesReconciled=true;
    console.log(JSON.stringify(report,null,2));
  } catch(error) {await db.rollback();throw error;}
  finally {await db.end();}
}
main().catch(error=>{console.error(String(error.stack || error));process.exitCode=1;});
