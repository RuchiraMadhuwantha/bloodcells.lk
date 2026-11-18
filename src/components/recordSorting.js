const textOrder=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
const groups=['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const appointmentDate=r=>r.appointmentDate?`${r.appointmentDate} ${r.timeSlot||''}`:null;
const option=(value,label,field,type='text',direction=1)=>({value,label,field,type,direction});
export const SORT_OPTIONS={
  batches:[option('expiry','Expiry: soonest first','expiryDate'),option('group','Blood group','bloodGroup','group'),option('low','Available units: low to high','availableUnits','number'),option('high','Available units: high to low','availableUnits','number',-1),option('collected','Collection date: newest first','collectionDate','text',-1)],
  stockGroups:[option('group','Blood group','bloodGroup','group'),option('expiry','Usable expiry: soonest first','nextUsableExpiry'),option('low','Available units: low to high','availableUnits','number'),option('high','Available units: high to low','availableUnits','number',-1)],
  donors:[option('name','Name: A–Z','fullName'),option('name-desc','Name: Z–A','fullName','text',-1),option('newest','Registration: newest first','registeredAt','text',-1),option('donations','Completed donations: most first','donationCount','number',-1)],
  appointments:[option('date','Appointment: earliest first',appointmentDate),option('latest','Appointment: latest first',appointmentDate,'text',-1),option('pending','Pending approval first','status','status'),option('donor','Donor name: A–Z','donorName')],
  myAppointments:[option('latest','Appointment: latest first',appointmentDate,'text',-1),option('date','Appointment: earliest first',appointmentDate),option('hospital','Hospital name: A–Z','hospitalName')],
  campaigns:[option('date','Event date: earliest first',r=>r.date?`${r.date} ${r.startTime||''}`:null),option('latest','Event date: latest first',r=>r.date?`${r.date} ${r.startTime||''}`:null,'text',-1),option('name','Campaign name: A–Z','name')],
};
const missing=value=>value==null||value==='';
const compare=(a,b,type,direction)=>{
  if(missing(a)||missing(b))return missing(a)===missing(b)?0:missing(a)?1:-1;
  if(type==='number'){
    const x=Number(a),y=Number(b);
    if(!Number.isFinite(x)||!Number.isFinite(y))return Number.isFinite(x)===Number.isFinite(y)?0:Number.isFinite(x)?-1:1;
    return (x-y)*direction;
  }
  if(type==='group')return (groups.indexOf(a)<0?99:groups.indexOf(a))-(groups.indexOf(b)<0?99:groups.indexOf(b));
  if(type==='status'){const rank={pending:0,approved:1,completed:2,cancelled:3};return (rank[a]??99)-(rank[b]??99);}
  return textOrder.compare(String(a),String(b))*direction;
};
// Sort a copy: cached API records and the user's selected rows stay untouched.
export const sortRecords=(records,profile,value,unwrap=r=>r)=>{
  const options=SORT_OPTIONS[profile],selected=options.find(o=>o.value===value)||options[0];
  const field=r=>typeof selected.field==='function'?selected.field(r):r[selected.field];
  return [...records].sort((a,b)=>{
    const x=unwrap(a),y=unwrap(b);
    return compare(field(x),field(y),selected.type,selected.direction)||
      (selected.type==='status'?compare(appointmentDate(x),appointmentDate(y),'text',1):0)||
      compare(x.id??x.donorId??x.bloodGroup,y.id??y.donorId??y.bloodGroup,'text',selected.direction);
  });
};
