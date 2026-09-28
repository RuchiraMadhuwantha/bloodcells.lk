const {
  getAppointmentsForDonor,
  getAppointmentsForHospital,
  getAppointmentsForBank,
  getBookedSlots,
  createAppointment,
  updateAppointmentStatus,
  getAppointmentById,
  getDonorIdByUserId,
} = require('../models/appointmentModel');
const { getHospitalByUserId } = require('../models/hospitalModel');
const { toFriendlyError } = require('../validators/common');
const { toDateString } = require('../utils/date');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/* ───────────────────────── Donor side ───────────────────────── */

const bookAppointment = async (req, res, next) => {
  try {
    const donorId = await getDonorIdByUserId(req.user.user_id);
    if (!donorId) {
      throw httpError(404, 'No donor profile is linked to this account.');
    }

    const { hospital_id: hospitalId, appointment_date: appointmentDate, time_slot: timeSlot, notes } = req.body;

    if (toDateString(appointmentDate) < toDateString(new Date())) {
      throw httpError(400, 'Appointments cannot be booked in the past.');
    }

    const appointmentId = await createAppointment({
      donorId,
      hospitalId: Number(hospitalId),
      appointmentDate: toDateString(appointmentDate),
      timeSlot,
      notes,
    });

    const appointment = await getAppointmentById(appointmentId);
    res.status(201).json({
      success: true,
      message: `Appointment ${appointment.reference} booked at ${appointment.hospitalName}.`,
      appointment,
    });
  } catch (error) {
    next(toFriendlyError(error, 'Could not book the appointment.'));
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

const cancelMyAppointment = async (req, res, next) => {
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

    await updateAppointmentStatus({ appointmentId: appointment.id, status: 'cancelled' });
    res.json({ success: true, message: `Appointment ${appointment.reference} cancelled.`, appointment: await getAppointmentById(appointment.id) });
  } catch (error) {
    next(toFriendlyError(error, 'Could not cancel this appointment.'));
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

/* ───────────────────────── Hospital / blood bank side ───────────────────────── */

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
      hospitalId: req.query.hospitalId ? Number(req.query.hospitalId) : undefined,
    });
    res.json({ success: true, appointments });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load appointments.'));
  }
};

const setStatus = async (req, res, next) => {
  try {
    const appointment = await getAppointmentById(Number(req.params.id));
    if (!appointment) {
      throw httpError(404, 'Appointment not found.');
    }

    const { status } = req.body;
    if (['approved', 'completed', 'cancelled'].includes(appointment.status)) {
      throw httpError(409, `This appointment is already ${appointment.statusLabel.toLowerCase()}.`);
    }

    await updateAppointmentStatus({ appointmentId: appointment.id, status });
    res.json({
      success: true,
      message: `Appointment ${appointment.reference} marked as ${status}.`,
      appointment: await getAppointmentById(appointment.id),
    });
  } catch (error) {
    next(toFriendlyError(error, 'Could not update this appointment.'));
  }
};

module.exports = {
  bookAppointment,
  listMyAppointments,
  cancelMyAppointment,
  slotsForDate,
  listForHospital,
  listForBank,
  setStatus,
};
