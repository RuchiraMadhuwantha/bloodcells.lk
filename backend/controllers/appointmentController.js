const pool = require('../config/db');
const {
  getAppointmentsForDonor,
  getAppointmentsForHospital,
  getAppointmentsForBank,
  getBookedSlots,
  createAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  getAppointmentById,
  getDonorIdByUserId,
} = require('../models/appointmentModel');
const { getHospitalByUserId } = require('../models/hospitalModel');
const { getUserIdByDonorId } = require('../models/donorModel');
const { createNotification } = require('../models/notificationModel');
const { toFriendlyError } = require('../validators/common');
const { toDateString } = require('../utils/date');

const {saveCollectionBatch}=require('../models/collectionInventoryModel');
const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/** Translates raw duplicate-key errors into actionable messages (they leak index names otherwise). */
const resolveDuplicateKey = (error) => {
  if (error?.code !== 'ER_DUP_ENTRY') return error;
  const key = String(error.sqlMessage || '');
  if (key.includes('centre_active_slot')) {
    return httpError(409, 'This time slot at the selected centre is already booked. Please choose another slot.');
  }
  if (key.includes('donor_active_slot') || key.includes('uk_appointments_slot')) {
    return httpError(409, 'You already have an appointment booked for this date and time.');
  }
  return httpError(409, 'A record with these details already exists.');
};

/* Notify the donor's own account. Fire-and-forget safety: caller decides. */
const notifyDonor = async ({ donorId, type, title, message, relatedId, actionRoute = 'donor-appointments' }, executor) => {
  const userId = await getUserIdByDonorId(donorId, executor);
  if (!userId) return;
  await createNotification(
    { userId, type, title, message, relatedType: 'appointment', relatedId, actionRoute },
    executor
  );
};

/* Donor side */

const bookAppointment = async (req, res, next) => {
  let connection;
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }

    const { hospital_id: hospitalId, appointment_date: appointmentDate, time_slot: timeSlot, notes, nic } = req.body;

    if (toDateString(appointmentDate) < toDateString(new Date())) {
      throw httpError(400, 'Appointments cannot be booked in the past.');
    }

    const dateStr = toDateString(appointmentDate);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const appointmentId = await createAppointment({
      donorId,
      hospitalId: Number(hospitalId),
      appointmentDate: dateStr,
      timeSlot,
      notes,
      nic,
    }, connection);

    const booked = await getAppointmentById(appointmentId, connection);
    await notifyDonor({
      donorId,
      type: 'appointment_confirmation',
      title: 'Appointment booked',
      message: `Your donation appointment ${booked.reference} at ${booked.hospitalName} on ${booked.appointmentDate} at ${booked.timeSlot} is recorded and pending review.`,
      relatedId: appointmentId,
    }, connection);

    await connection.commit();

    const appointment = await getAppointmentById(appointmentId);
    res.status(201).json({
      success: true,
      message: `Appointment ${appointment.reference} booked at ${appointment.hospitalName}.`,
      appointment,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(resolveDuplicateKey(error), 'Could not book the appointment.'));
  } finally {
    if (connection) connection.release();
  }
};

const listMyAppointments = async (req, res, next) => {
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }
    const appointments = await getAppointmentsForDonor(donorId);
    res.json({ success: true, appointments });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load your appointments.'));
  }
};

const getMyAppointment = async (req, res, next) => {
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }
    const appointment = await getAppointmentById(Number(req.params.id));
    if (!appointment) {
      throw httpError(404, 'Appointment not found.');
    }
    if (appointment.donorId !== donorId) {
      throw httpError(403, 'You can only view your own appointments.');
    }
    res.json({ success: true, appointment });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load this appointment.'));
  }
};

const rescheduleMyAppointment = async (req, res, next) => {
  let connection;
  try {
    const hospitalActor=req.user.role==='hospital';
    let donorId = hospitalActor ? null : await getDonorIdByUserId(req.user.user_id);
    if (!hospitalActor && !donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }

    const appointmentId = Number(req.params.id);
    const { appointment_date: appointmentDate, time_slot: timeSlot } = req.body;
    const newDate = toDateString(appointmentDate);

    if (newDate < toDateString(new Date())) {
      throw httpError(400, 'Appointments cannot be moved to a past date.');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    if(hospitalActor){
      const hospital=await getHospitalByUserId(req.user.user_id);
      if(!hospital)throw httpError(403,'Hospital access required.');
      // Match booking lock order, then re-read under lock.
      await connection.query('SELECT hospital_id FROM hospitals WHERE hospital_id=? FOR UPDATE',[hospital.hospitalId]);
      const current=await getAppointmentById(appointmentId,connection,true);
      if(!current || current.hospitalId!==hospital.hospitalId)throw httpError(404,'Hospital appointment not found.');
      donorId=current.donorId;
    }
    const previous = await rescheduleAppointment(
      { appointmentId, donorId, newDate, newTimeSlot: timeSlot },
      connection
    );

    const updated = await getAppointmentById(appointmentId, connection);
    await notifyDonor({
      donorId,
      type: 'appointment_rescheduled',
      title: 'Appointment rescheduled',
      message: `Your appointment ${updated.reference} was moved from ${toDateString(previous.appointment_date)} ${previous.time_slot} to ${updated.appointmentDate} ${updated.timeSlot}.`,
      relatedId: appointmentId,
    }, connection);

    if(hospitalActor){
      const [banks]=await connection.query("SELECT user_id FROM users WHERE role='blood_bank' AND account_status='active'");
      for(const bank of banks)await createNotification({userId:bank.user_id,type:'appointment_rescheduled',title:'Hospital rescheduled an appointment',message:`${updated.hospitalName} moved ${updated.reference} to ${updated.appointmentDate} at ${updated.timeSlot}.`,relatedType:'appointment',relatedId:appointmentId,actionRoute:'bank-appointments'},connection);
    }
    await connection.commit();

    const appointment = await getAppointmentById(appointmentId);
    res.json({
      success: true,
      message: `Appointment ${appointment.reference} rescheduled to ${appointment.appointmentDate} at ${appointment.timeSlot}.`,
      appointment,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(resolveDuplicateKey(error), 'Could not reschedule this appointment.'));
  } finally {
    if (connection) connection.release();
  }
};

const cancelMyAppointment = async (req, res, next) => {
  let connection;
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    const appointment = await getAppointmentById(Number(req.params.id));
    if (!appointment) {
      throw httpError(404, 'Appointment not found.');
    }
    if (appointment.donorId !== donorId) {
      throw httpError(403, 'You can only cancel your own appointments.');
    }
    if (['cancelled', 'completed'].includes(appointment.status)) {
      throw httpError(409, `This appointment is already ${appointment.statusLabel.toLowerCase()}.`);
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await updateAppointmentStatus({ appointmentId: appointment.id, status: 'cancelled' }, connection);
    await notifyDonor({
      donorId,
      type: 'appointment_cancelled',
      title: 'Appointment cancelled',
      message: `Your appointment ${appointment.reference} at ${appointment.hospitalName} on ${appointment.appointmentDate} at ${appointment.timeSlot} was cancelled.`,
      relatedId: appointment.id,
    }, connection);

    await connection.commit();

    res.json({ success: true, message: `Appointment ${appointment.reference} cancelled.`, appointment: await getAppointmentById(appointment.id) });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(error, 'Could not cancel this appointment.'));
  } finally {
    if (connection) connection.release();
  }
};

const slotsForDate = async (req, res, next) => {
  try {
    const booked = await getBookedSlots(Number(req.params.hospitalId), req.query.date);
    res.json({ success: true, booked });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load available time slots.'));
  }
};

/* Hospital / blood bank side */

const listForHospital = async (req, res, next) => {
  try {
    const hospital = await getHospitalByUserId(req.user.user_id);
    if (!hospital) {
      throw httpError(404, 'No hospital record is linked to this account.');
    }
    const appointments = await getAppointmentsForHospital(hospital.hospitalId);
    res.json({ success: true, appointments });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load appointments.'));
  }
};

const listForBank = async (req, res, next) => {
  try {
    const appointments = await getAppointmentsForBank({
      date: req.query.date,
      status:req.query.status,search:req.query.search,
      hospitalId: req.query.hospitalId ? Number(req.query.hospitalId) : undefined,
    });
    res.json({ success: true, appointments });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load appointments.'));
  }
};

const setStatus = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const appointment = await getAppointmentById(Number(req.params.id),connection,true);
    if (!appointment) {
      throw httpError(404, 'Appointment not found.');
    }

    const { status } = req.body;
    if (req.user.role === 'blood_bank' && ['approved', 'completed'].includes(status)) {
      throw httpError(403, 'The hospital must approve appointments and record collected blood.');
    }
    if (req.user.role === 'hospital') {
      const [owners] = await connection.query(
        'SELECT hospital_id FROM hospitals WHERE user_id = ?', [req.user.user_id]
      );
      if (!owners[0] || owners[0].hospital_id !== appointment.hospitalId) {
        throw httpError(403, 'You can only approve appointments at your own hospital.');
      }
      if (!['approved', 'completed', 'cancelled'].includes(status)) throw httpError(403, 'Hospitals can approve appointments and record collected blood.');
      if (status === 'completed') {
        if (appointment.status !== 'approved') throw httpError(409, 'Approve this appointment before recording collected blood.');
        if (appointment.appointmentDate > toDateString(new Date())) throw httpError(409, 'Collected blood cannot be recorded before the appointment date.');
        const { collectedUnits, collectedVolumeMl } = req.body;
        if (!Number.isInteger(collectedUnits) || collectedUnits < 1 || collectedUnits > 1000 ||
            !Number.isInteger(collectedVolumeMl) || collectedVolumeMl < 1 || collectedVolumeMl > 100000) {
          throw httpError(400, 'Enter positive whole numbers for collected units and volume in millilitres.');
        }
        if(!req.body.component || !/^\d{4}-\d{2}-\d{2}$/.test(req.body.expiryDate || '') || req.body.expiryDate<appointment.appointmentDate)throw httpError(400,'Enter the blood component and actual expiry date.');
        if(req.body.campaignId!=null)await require('../models/campaignDonationModel').link(connection,appointment,req.user.user_id,req.body.campaignId,'Campaign selected while recording collection');
        await saveCollectionBatch(connection,appointment,req.user.user_id,req.body);
        await connection.query(
          'UPDATE appointments SET collected_units = ?, collected_volume_ml = ?, collection_recorded_at = NOW(), collection_recorded_by_user_id = ? WHERE appointment_id = ?',
          [collectedUnits, collectedVolumeMl, req.user.user_id, appointment.id]
        );
        await connection.query(
          "UPDATE donors SET last_donation_date = GREATEST(COALESCE(last_donation_date, '1000-01-01'), ?) WHERE donor_id = ?",
          [appointment.appointmentDate, appointment.donorId]
        );
      }
    }
    // Explicit state machine. Previously ANY of the final states blocked ALL
    // bank transitions, which made it impossible to ever mark an appointment
    // completed.
    const ALLOWED_TRANSITIONS = {
      pending: ['approved', 'completed', 'cancelled'],
      approved: ['completed', 'cancelled'],
    };
    const allowed = ALLOWED_TRANSITIONS[appointment.status] || [];
    if (!allowed.includes(status)) {
      throw httpError(409, `An appointment that is ${appointment.statusLabel.toLowerCase()} cannot be marked as ${status}.`);
    }



    await updateAppointmentStatus({ appointmentId: appointment.id, status }, connection);

    const notificationByStatus = {
      approved: {
        type: 'appointment_approved',
        title: 'Appointment approved',
        message: `Your appointment ${appointment.reference} at ${appointment.hospitalName} on ${appointment.appointmentDate} at ${appointment.timeSlot} was approved.`,
      },
      completed: {
        type: 'appointment_completed',
        title: 'Donation recorded',
        message: `Your donation at ${appointment.hospitalName} for ${appointment.reference} was recorded: ${req.body.collectedUnits} unit(s), ${req.body.collectedVolumeMl} mL.`,
      },
      cancelled: {
        type: 'appointment_cancelled',
        title: 'Appointment cancelled',
        message: `Your appointment ${appointment.reference} at ${appointment.hospitalName} on ${appointment.appointmentDate} at ${appointment.timeSlot} was cancelled by the ${req.user.role === 'hospital' ? 'hospital' : 'blood bank'}.`,
      },
    };
    const payload = notificationByStatus[status];
    if (payload) {
      await notifyDonor({ ...payload, donorId: appointment.donorId, relatedId: appointment.id }, connection);
    }

    if (req.user.role === 'hospital' && ['approved', 'completed', 'cancelled'].includes(status)) {
      const [banks] = await connection.query(
        "SELECT user_id FROM users WHERE role = 'blood_bank' AND account_status = 'active'"
      );
      for (const bank of banks) {
        await createNotification({
          userId: bank.user_id, type: status === 'completed' ? 'appointment_completed' : status==='cancelled'?'appointment_cancelled':'appointment_approved',
          title: status === 'completed' ? 'Hospital recorded collected blood' : status==='cancelled'?'Hospital cancelled an appointment':'Hospital approved a donor appointment',
          message: status === 'completed'
            ? `${appointment.hospitalName} collected ${req.body.collectedUnits} unit(s), ${req.body.collectedVolumeMl} mL from ${appointment.donorName} (${appointment.bloodGroup}), appointment ${appointment.reference}.`
            : `${appointment.hospitalName} ${status} appointment ${appointment.reference} for ${appointment.donorName} (${appointment.bloodGroup}) on ${appointment.appointmentDate} at ${appointment.timeSlot}.`,
          relatedType: 'appointment', relatedId: appointment.id, actionRoute: 'bank-appointments',
        }, connection);
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Appointment ${appointment.reference} marked as ${status}.`,
      appointment: await getAppointmentById(appointment.id),
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(error, 'Could not update this appointment.'));
  } finally {
    if (connection) connection.release();
  }
};

const linkCampaign=async(req,res,next)=>{
  let c;try{
    const hospital=await getHospitalByUserId(req.user.user_id);
    if(!hospital)throw httpError(403,'Hospital access required.');
    c=await pool.getConnection();await c.beginTransaction();
    const appointment=await getAppointmentById(Number(req.params.id),c,true);
    if(!appointment||appointment.hospitalId!==hospital.hospitalId)throw httpError(404,'Hospital appointment not found.');
    if(appointment.status!=='completed')throw httpError(409,'Only completed donations can be linked here. Select a campaign when recording a new collection.');
    const result=await require('../models/campaignDonationModel').link(c,appointment,req.user.user_id,req.body.campaignId,req.body.note);
    await c.commit();res.json({success:true,...result,appointment:await getAppointmentById(appointment.id),message:'Donation campaign link saved.'});
  }catch(e){if(c)await c.rollback();next(toFriendlyError(e,'Could not link the campaign.'));}finally{if(c)c.release();}
};
module.exports = {linkCampaign,
  bookAppointment,
  listMyAppointments,
  getMyAppointment,
  rescheduleMyAppointment,
  cancelMyAppointment,
  slotsForDate,
  listForHospital,
  listForBank,
  setStatus,
};
