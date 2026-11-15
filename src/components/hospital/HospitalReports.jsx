import React, { useRef,useState } from 'react';
import { Button,SectionCard,Table } from '../UIComponents';
import * as service from '../../services/hospitalService';
import { HospitalLayout,Loading,ErrorPanel,EmptyState,Notice,Field,Details,inputClass,disabledClass } from './HospitalUI';
import { BLOOD_GROUPS,REQUEST_STATUSES,titleCase } from './hospitalUtils';
import { REPORT_TYPES,printReport } from './reportUtils';
export const HospitalReports=({nav})=>{
  const [filters,setFilters]=useState({type:'requests',start:'',end:'',group:'',status:''});
  const [report,setReport]=useState(null),[snapshot,setSnapshot]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(null);
  const lock=useRef(false);
  const set=(key,value)=>{setFilters(f=>({...f,[key]:value,...(key==='type'?{status:''}:{})}));setReport(null);setError(null);};
  const invalid=filters.start&&filters.end&&filters.start>filters.end;
  const preview=async e=>{
    e.preventDefault();if(lock.current)return;
    lock.current=true;setBusy(true);setError(null);setReport(null);
    try{const data=await service.getReport(filters);setReport(data);setSnapshot({...filters});}
    catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
  };
  const download=async format=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError(null);
    try{await service.downloadReport(snapshot,format);}catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
  };
  return <HospitalLayout nav={nav} title="Hospital Reports" subtitle="Hospital-scoped reports from MySQL">
    <Notice>Reports use complete matching hospital records and server-calculated totals. Request dates filter submission dates; usage dates filter recorded usage; inventory dates filter batch collection dates. Inventory balances are current, not historical.</Notice>
    <SectionCard title="Report filters">
      <form aria-label="Hospital report filters" onSubmit={preview}>
        <fieldset disabled={busy} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Report type"><select className={inputClass} value={filters.type} onChange={e=>set('type',e.target.value)}>{REPORT_TYPES.map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></Field>
          <Field label={filters.type==='usage'?'Usage date from':filters.type==='inventory'?'Collection date from':'Submission date from'}><input type="date" className={inputClass} value={filters.start} onChange={e=>set('start',e.target.value)}/></Field>
          <Field label={filters.type==='usage'?'Usage date to':filters.type==='inventory'?'Collection date to':'Submission date to'}><input type="date" className={inputClass} value={filters.end} onChange={e=>set('end',e.target.value)}/></Field>
          <Field label="Report blood group"><select className={inputClass} value={filters.group} onChange={e=>set('group',e.target.value)}><option value="">All groups</option>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
          <Field label="Report request status"><select disabled={['usage','inventory'].includes(filters.type)} className={inputClass} value={filters.status} onChange={e=>set('status',e.target.value)}><option value="">All statuses</option>{REQUEST_STATUSES.map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></Field>
        </fieldset>
        {invalid&&<p role="alert" className="text-red-700 mt-4">Start date must be on or before end date.</p>}
        <div className="flex flex-wrap gap-3 mt-5">
          <Button type="submit" disabled={busy||!!invalid} className={disabledClass}>Preview report</Button>
          <Button type="button" variant="outline" disabled={busy||!report?.rows.length} className={disabledClass} onClick={()=>printReport(report)}>Print report</Button>
          <Button type="button" variant="outline" disabled={busy||!report?.rows.length} className={disabledClass} onClick={()=>download('csv')}>Download CSV</Button>
          <Button type="button" variant="outline" disabled={busy||!report?.rows.length} className={disabledClass} onClick={()=>download('pdf')}>Download PDF</Button>
        </div>
      </form>
    </SectionCard>
    <div className="mt-6">
      {busy&&<Loading label="Preparing hospital report..."/>}
      {error&&<ErrorPanel message={error}/>}
      {report&&!busy?<SectionCard title={report.title}>
        <Details entries={[[ 'Hospital',report.hospital ],['Reporting period',report.period],['Generated at',report.generatedAt],['Blood group / status',report.group+' / '+report.status]]}/>
        <div className="my-5"><Details entries={Object.entries(report.summary)}/></div>
        {report.rows.length?<Table columns={report.columns}>{report.rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j} className="p-3 text-sm">{value??'Not supplied'}</td>)}</tr>)}</Table>:<EmptyState title="No records match these filters"/>}
        <p className="text-xs text-gray-500 mt-4">{report.sourceNote}</p>
      </SectionCard>:!busy&&!error&&<EmptyState title="Choose filters and preview a report"/>}
    </div>
  </HospitalLayout>;
};
