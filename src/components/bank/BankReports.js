import React,{useRef,useState} from 'react';
import {Button,SectionCard,Table} from '../UIComponents';
import * as service from '../../services/bankService';
import {BankLayout,useBankResource,Notice,Field,Details,EmptyState,ErrorPanel,inputClass,BLOOD_GROUPS} from './BankUI';
import {BANK_REPORT_TYPES} from './bankReportUtils';
import {printReport} from '../hospital/reportUtils';
export const BankReports=({nav})=>{
 const centres=useBankResource(service.getCentres);
 const [filters,setFilters]=useState({type:'inventory',start:'',end:'',group:'',district:'',centreId:''}),[report,setReport]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null);
 const lock=useRef(false);
 const invalid=filters.start&&filters.end&&filters.start>filters.end;
 const dateLabel=({inventory:'Collection date',expiry:'Expiry date',donations:'Donation date',campaigns:'Campaign date',transfers:'Transfer creation date',requests:'Submission date'})[filters.type]||'Date';
 const set=(k,v)=>{setFilters({...filters,[k]:v,...(k==='type'?{start:'',end:'',group:'',centreId:''}:{})});setReport(null);setError(null);};
 const run=async format=>{if(lock.current||invalid)return;lock.current=true;setBusy(true);setError(null);if(!format)setReport(null);try{if(format)await service.downloadReport(filters,format);else setReport(await service.getReport(filters));}catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}};
 return <BankLayout nav={nav} title="Blood Bank Reports" subtitle="Reports based on your saved records">
  <Notice>Stock and transfer reports show the centres you manage. Stock totals show current amounts for the collection dates you choose. Donation totals use the units and millilitres recorded by hospitals. Missing amounts are left out. Donor contact details are not included.</Notice>
  <SectionCard title="Report Filters"><form onSubmit={e=>{e.preventDefault();run();}}><fieldset disabled={busy} className="grid md:grid-cols-3 gap-4">
   <Field label="Bank report type"><select className={inputClass} value={filters.type} onChange={e=>set('type',e.target.value)}>{BANK_REPORT_TYPES.map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></Field>
   <Field label={dateLabel+' from'}><input type="date" disabled={filters.type==='regional'} className={inputClass} value={filters.start} onChange={e=>set('start',e.target.value)}/></Field><Field label={dateLabel+' to'}><input type="date" disabled={filters.type==='regional'} className={inputClass} value={filters.end} onChange={e=>set('end',e.target.value)}/></Field>
   <Field label="Report blood group"><select disabled={filters.type==='campaigns'} className={inputClass} value={filters.group} onChange={e=>set('group',e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
   <Field label="Report district"><input className={inputClass} value={filters.district} onChange={e=>set('district',e.target.value)}/></Field><Field label="Report centre"><select disabled={['requests','donations','campaigns'].includes(filters.type)} className={inputClass} value={filters.centreId} onChange={e=>set('centreId',e.target.value)}><option value="">Centres you manage</option>{(centres.data?.items||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
  </fieldset>{invalid&&<p role="alert" className="text-sm text-red-700 mt-3">Start date must be on or before end date.</p>}<div className="flex flex-wrap gap-3 mt-4"><Button type="submit" disabled={busy||!!invalid}>Preview report</Button><Button type="button" disabled={busy||!!invalid} onClick={()=>run('pdf')}>Download PDF</Button><Button type="button" disabled={busy||!!invalid} onClick={()=>run('csv')}>Download CSV</Button><Button type="button" disabled={!report||busy} onClick={()=>printReport(report)}>Print</Button></div></form></SectionCard>
  {error&&<ErrorPanel message={error}/>} {busy&&<p role="status">Preparing report...</p>}
  {report?<SectionCard title={report.title} className="mt-6"><Details entries={[[ 'Reporting period',report.period],['Generated',report.generatedAt],...Object.entries(report.summary)]}/><Table columns={report.columns}>{report.rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td className="p-3" key={j}>{v??'Not recorded'}</td>)}</tr>)}</Table><p>{report.sourceNote}</p></SectionCard>:<EmptyState title="Choose filters and preview a report"/>}
 </BankLayout>;
};
