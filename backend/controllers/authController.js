const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { findUserByUsernameOrEmail, createUser, findUserById } = require('../models/userModel');
const { createDonorProfile, getDonorByUserId } = require('../models/donorModel');
const { createHospitalProfile } = require('../models/hospitalModel');

const registerDonor = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      username,
      email,
      password,
      full_name,
      nic,
      date_of_birth,
      gender,
      blood_group,
      phone,
      district,
      weight,
      last_donation_date,
      declaration_checked,
    } = req.body;

    const existingUser = await connection.query('SELECT user_id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser[0].length > 0) {
      throw Object.assign(new Error('Username or email already exists.'), { statusCode: 409 });
    }

    const existingNic = await connection.query('SELECT donor_id FROM donors WHERE nic = ?', [nic]);
    if (existingNic[0].length > 0) {
      throw Object.assign(new Error('NIC already registered.'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await createUser({
      username,
      email,
      passwordHash,
      role: 'donor',
      accountStatus: 'active',
    });

    await createDonorProfile({
      userId,
      fullName: full_name,
      nic,
      dateOfBirth: date_of_birth || null,
      gender: gender || null,
      bloodGroup: blood_group,
      phone: phone || null,
      district: district || null,
      weight: weight || null,
      lastDonationDate: last_donation_date || null,
      declarationChecked: declaration_checked || false,
    });

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Donor registration successful.',
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

const registerHospital = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      username,
      email,
      password,
      hospital_name,
      hospital_code,
      hospital_type,
      district,
      address,
      official_phone,
      contact_person_name,
      contact_person_designation,
      contact_person_phone,
      contact_person_email,
    } = req.body;

    const existingUser = await connection.query('SELECT user_id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser[0].length > 0) {
      throw Object.assign(new Error('Username or email already exists.'), { statusCode: 409 });
    }

    const existingHospitalCode = await connection.query('SELECT hospital_id FROM hospitals WHERE hospital_code = ?', [hospital_code]);
    if (existingHospitalCode[0].length > 0) {
      throw Object.assign(new Error('Hospital code already registered.'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await createUser({
      username,
      email,
      passwordHash,
      role: 'hospital',
      accountStatus: 'pending',
    });

    await createHospitalProfile({
      userId,
      hospitalName: hospital_name,
      hospitalCode: hospital_code,
      hospitalType: hospital_type || null,
      district: district || null,
      address: address || null,
      officialPhone: official_phone || null,
      contactPersonName: contact_person_name || null,
      contactPersonDesignation: contact_person_designation || null,
      contactPersonPhone: contact_person_phone || null,
      contactPersonEmail: contact_person_email || null,
    });

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Hospital registration submitted successfully. Your account is pending approval.',
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

const updateProfile = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.user_id;
    const {
      email,
      full_name,
      phone,
      district,
      gender,
      weight,
      date_of_birth,
      blood_group,
    } = req.body;

    await connection.beginTransaction();

    if (email) {
      const existing = await connection.query('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [email, userId]);
      if (existing[0].length > 0) {
        throw Object.assign(new Error('Email already in use.'), { statusCode: 409 });
      }
      await connection.query('UPDATE users SET email = ? WHERE user_id = ?', [email, userId]);
    }

    const fields = {};
    if (full_name !== undefined) fields.full_name = full_name;
    if (phone !== undefined) fields.phone = phone || null;
    if (district !== undefined) fields.district = district || null;
    if (gender !== undefined) fields.gender = gender || null;
    if (weight !== undefined) fields.weight = weight === '' || weight === null ? null : weight;
    if (date_of_birth !== undefined) fields.date_of_birth = date_of_birth || null;
    if (blood_group !== undefined) fields.blood_group = blood_group;

    if (Object.keys(fields).length > 0) {
      const setClause = Object.keys(fields).map((col) => `${col} = ?`).join(', ');
      await connection.query(`UPDATE donors SET ${setClause} WHERE user_id = ?`, [...Object.values(fields), userId]);
    }

    await connection.commit();

    const user = await findUserById(userId);
    const profile = await getDonorByUserId(userId);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user,
      profile,
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await findUserByUsernameOrEmail(username);

    if (!user) {
      throw Object.assign(new Error('Invalid username or password.'), { statusCode: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw Object.assign(new Error('Invalid username or password.'), { statusCode: 401 });
    }

    if (user.role === 'hospital' && user.account_status === 'pending') {
      throw Object.assign(new Error('Your hospital account is currently pending approval.'), { statusCode: 403 });
    }

    if (user.account_status === 'inactive' || user.account_status === 'suspended') {
      throw Object.assign(new Error('Your account is not active.'), { statusCode: 403 });
    }

    const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.user_id);
    if (!user) {
      throw Object.assign(new Error('User not found.'), { statusCode: 404 });
    }

    let profile = null;

    if (user.role === 'donor') {
      const [rows] = await pool.query('SELECT * FROM donors WHERE user_id = ?', [user.user_id]);
      profile = rows[0] || null;
    } else if (user.role === 'hospital') {
      const [rows] = await pool.query('SELECT * FROM hospitals WHERE user_id = ?', [user.user_id]);
      profile = rows[0] || null;
    }

    res.json({
      success: true,
      user,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerDonor,
  registerHospital,
  login,
  getCurrentUser,
  updateProfile,
};
