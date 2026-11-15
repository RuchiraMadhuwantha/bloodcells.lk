import React,{useState} from 'react';
import {Button,SectionCard,Table} from '../UIComponents';
import * as service from '../../services/bankService';
import {BankLayout,useBankResource,Notice,Field,Details,EmptyState,ErrorPanel,inputClass,BLOOD_GROUPS} from './BankUI';
import {BANK_REPORT_TYPES} from './bankReportUtils';
import {printReport} from '../hospital/reportUtils';
export const BankReports=({nav})=>{
 const centres=useBankResource(service.getCentres);
 const [filters,setFilters]=useState({type:'inventory',start:'',end:'',group:'',district:'',centreId:''}),[report,setReport]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null);
 const set=(k,v)=>{setFilters({...filters,[k]:v,...(k==='type'?{start:'',end:'',group:'',centreId:''}:{})});setReport(null);setError(null);};
 const run=async format=>{if(busy)return;setBusy(true);setError(null);try{if(format)await service.downloadReport(filters,format);else setReport(await service.getReport(filters));}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <BankLayout nav={nav} title="Blood Bank Reports" subtitle="Reports from complete matching saved records">
  <Notice>Stock and transfers are scoped to assigned centres. Inventory balances are current, filtered by collection date. Completed appointments record donations but do not record collected volume. Reports include no donor contact information.</Notice>
  <SectionCard title="Report Filters"><form onSubmit={e=>{e.preventDefault();run();}}><div className="grid md:grid-cols-3 gap-4">
   <Field label="Bank report type"><select className={inputClass} value={filters.type} onChange={e=>set('type',e.target.value)}>{BANK_REPORT_TYPES.map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></Field>
   <Field label="Report date from"><input type="date" disabled={filters.type==='regional'} className={inputClass} value={filters.start} onChange={e=>set('start',e.target.value)}/></Field><Field label="Report date to"><input type="date" disabled={filters.type==='regional'} className={inputClass} value={filters.end} onChange={e=>set('end',e.target.value)}/></Field>
   <Field label="Report blood group"><select disabled={filters.type==='campaigns'} className={inputClass} value={filters.group} onChange={e=>set('group',e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
   <Field label="Report district"><input className={inputClass} value={filters.district} onChange={e=>set('district',e.target.value)}/></Field><Field label="Report centre"><select disabled={['requests','donations','campaigns'].includes(filters.type)} className={inputClass} value={filters.centreId} onChange={e=>set('centreId',e.target.value)}><option value="">Assigned centres</option>{(centres.data?.items||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
  </div><div className="flex gap-3 mt-4"><Button type="submit" disabled={busy}>Preview report</Button><Button type="button" disabled={busy} onClick={()=>run('pdf')}>Download PDF</Button><Button type="button" disabled={busy} onClick={()=>run('csv')}>Download CSV</Button><Button type="button" disabled={!report||busy} onClick={()=>printReport(report)}>Print</Button></div></form></SectionCard>
  {error&&<ErrorPanel message={error}/>} {busy&&<p role="status">Preparing report...</p>}
  {report?<SectionCard title={report.title} className="mt-6"><Details entries={[[ 'Reporting period',report.period],['Generated',report.generatedAt],...Object.entries(report.summary)]}/><Table columns={report.columns}>{report.rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td className="p-3" key={j}>{v}</td>)}</tr>)}</Table><p>{report.sourceNote}</p></SectionCard>:<EmptyState title="Choose filters and preview a report"/>}
 </BankLayout>;
};
