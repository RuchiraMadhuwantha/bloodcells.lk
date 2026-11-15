const PDFDocument=require('pdfkit');
const buildHospitalReport=(hospital,items,filters)=>{
  const type=filters.type;
  const inventory=type==='inventory',usage=type==='usage';
  const summary=inventory?{'Stock batches':items.length,'Usable unreserved units':items.reduce((s,r)=>s+r.availableUnits,0)}
    :usage?{'Usage records':items.length,'Recorded usage units':items.reduce((s,r)=>s+r.quantity,0)}
    :Object.fromEntries([['Total requests',items.length],...['pending','approved','rejected','fulfilled','cancelled'].map(status=>[status,items.filter(r=>r.status===status).length]),['Fulfillment rate',items.length?(100*items.filter(r=>r.status==='fulfilled').length/items.length).toFixed(1)+'%':'Not applicable']]);
  const columns=inventory?['Reference','Blood group','Recorded units','Usable units','Reserved','Expiry','Status']
    :usage?['Reference','Blood group','Quantity used','Usage date','Category']
    :['Request ID','Blood group','Requested units','Urgency','Required date','Submission date','Status'];
  const rows=items.map(r=>inventory?[r.reference,r.bloodGroup,r.quantity,r.availableUnits,r.reservedUnits,r.expiryDate,r.level]
    :usage?[r.reference,r.bloodGroup,r.quantity,r.usageDate,r.category]
    :[r.reference,r.bloodGroup,r.quantity,r.urgency,r.requiredDate,r.createdAt,r.status]);
  return {title:inventory?'Hospital Inventory Report':usage?'Hospital Blood Usage Report':type==='fulfillment'?'Request Fulfillment Report':'Hospital Blood Request Report',
    hospital:hospital.hospitalName,hospitalCode:hospital.hospitalCode,period:(filters.start||'First recorded date')+' to '+(filters.end||'Latest recorded date'),
    generatedAt:new Date().toISOString(),group:filters.bloodGroup||'All groups',status:filters.status||'All statuses',summary,columns,rows,
    sourceNote:inventory?'Inventory filtered by collection date; quantities are current balances, not historical balances.':'Requests filtered by submission date; usage by usage date. No patient details. Complete matching source.'};
};
const cell=value=>{let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
const reportCsv=report=>'\uFEFF'+[[report.title],['Hospital',report.hospital],['Period',report.period],['Generated at',report.generatedAt],...Object.entries(report.summary),[],report.columns,...report.rows].map(row=>row.map(cell).join(',')).join('\r\n');
const reportPdf=report=>new Promise((resolve,reject)=>{
  const doc=new PDFDocument({size:'A4',layout:'landscape',margin:36});
  const chunks=[];doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
  doc.fontSize(18).fillColor('#b91c1c').text('Bloodcells.lk');
  doc.fontSize(14).fillColor('black').text(report.title);
  doc.fontSize(10).text(report.hospital+' ('+report.hospitalCode+')').text(report.period).text('Generated: '+report.generatedAt);
  for(const [key,value]of Object.entries(report.summary))doc.text(key+': '+value);
  doc.moveDown().fontSize(8);
  const width=(doc.page.width-72)/report.columns.length;
  const line=row=>{
    const height=Math.max(24,...row.map(value=>doc.heightOfString(String(value??'Not supplied'),{width:width-8})))+8;
    if(doc.y+height>doc.page.height-40){doc.addPage();doc.fontSize(8);}
    const y=doc.y;
    row.forEach((value,i)=>doc.text(String(value??'Not supplied'),36+i*width,y,{width:width-8}));
    doc.y=y+height;
  };
  line(report.columns);report.rows.forEach(line);doc.moveDown().text(report.sourceNote,{width:doc.page.width-72});doc.end();
});
module.exports={buildHospitalReport,reportCsv,reportPdf};
