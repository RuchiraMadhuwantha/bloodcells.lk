import React,{useEffect,useState} from 'react';
import {Button} from '../UIComponents';
import {Dialog,Field,ErrorPanel,inputClass} from './HospitalUI';
import {todayStr} from './hospitalUtils';
import * as service from '../../services/hospitalService';
export const HospitalAppointmentAction=({target,onClose,onSaved})=>{
  const {appointment:a,action}=target;
  const [date,setDate]=useState(''),[slot,setSlot]=useState(''),[booked,setBooked]=useState([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{if(action!=='reschedule'||!date)return;let active=true;setLoading(true);setError('');
    service.getAppointmentSlots(a.hospitalId,date).then(r=>{if(active)setBooked(r.booked||[]);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
  },[a.hospitalId,date,action]);
  const submit=async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{
    if(action==='cancel')await service.cancelAppointment(a.id);
    else await service.rescheduleAppointment(a.id,{appointment_date:date,time_slot:slot});
    onSaved(action==='cancel'?'Appointment cancelled. The donor and blood bank have been notified.':'Appointment rescheduled. The donor and blood bank have been notified.');
  }catch(e){setError(e.message);}finally{setBusy(false);}};
  return <Dialog title={(action==='cancel'?'Cancel appointment':'Reschedule appointment')+' - '+a.reference} busy={busy} onClose={onClose}>
    {error&&<ErrorPanel message={error}/>}<form onSubmit={submit} className="space-y-4">
      {action==='cancel'?<p className="text-sm">Cancel this appointment for {a.donorName}?</p>:<>
        <Field label="New appointment date"><input required type="date" min={todayStr()} disabled={busy} className={inputClass} value={date} onChange={e=>{setDate(e.target.value);setSlot('');}}/></Field>
        <Field label="New time slot"><select required disabled={busy||loading||!date||!!error} className={inputClass} value={slot} onChange={e=>setSlot(e.target.value)}><option value="">{loading?'Loading slots...':'Choose a time slot'}</option>{['09:00','09:30','10:00','10:30','11:00','14:00','14:30','15:00'].map(time=>{const occupied=booked.includes(time)&&!(date===a.appointmentDate&&time===a.timeSlot);return <option key={time} disabled={occupied}>{time}</option>;})}</select></Field>
      </>}
      <Button type="submit" disabled={busy||(action==='reschedule'&&(loading||!date||!slot||!!error))}>{busy?'Saving...':action==='cancel'?'Confirm cancellation':'Save new appointment time'}</Button>
    </form>
  </Dialog>;
};
