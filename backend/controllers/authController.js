const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { findUserByUsernameOrEmail, createUser, findUserById } = require('../models/userModel');
const { createDonorProfile, getDonorByUserId } = require('../models/donorModel');
const { createHospitalProfile } = require('../models/hospitalModel');
const { toFriendlyError } = require('../validators/common');

const RESET_TOKEN_TTL_MINUTES = 60;

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const registerDonor = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
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

    const [existingUser] = await connection.query(
      'SELECT user_id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existingUser.length > 0) {
      throw httpError(409, 'Username or email already exists.');
    }

    const [existingNic] = await connection.query('SELECT donor_id FROM donors WHERE nic = ?', [nic]);
    if (existingNic.length > 0) {
      throw httpError(409, 'This NIC is already registered.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await createUser({
      username,
      email,
      passwordHash,
      role: 'donor',
      accountStatus: 'active',
    }, connection);

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
    }, connection);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Donor registration successful.',
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(error, 'Donor registration failed. Please try again.'));
  } finally {
    if (connection) connection.release();
  }
};

const registerHospital = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
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

    const [existingUser] = await connection.query(
      'SELECT user_id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existingUser.length > 0) {
      throw httpError(409, 'Username or email already exists.');
    }

    const [existingHospitalCode] = await connection.query(
      'SELECT hospital_id FROM hospitals WHERE hospital_code = ?',
      [hospital_code]
    );
    if (existingHospitalCode.length > 0) {
      throw httpError(409, 'This hospital code is already registered.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Hospitals always start as `pending` and stay blocked until a blood bank
    // user approves them.
    const userId = await createUser({
      username,
      email,
      passwordHash,
      role: 'hospital',
      accountStatus: 'pending',
    }, connection);

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
    }, connection);

    await connection.commit();

    res.status(201).json({
      success: true,
      message:
        'Hospital registration submitted. Your account is pending approval by the Blood Bank and dashboard access stays locked until then.',
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(toFriendlyError(error, 'Hospital registration failed. Please try again.'));
  } finally {
    if (connection) connection.release();
  }
};

const updateProfile = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = req.user.user_id;
    const { email, full_name, phone, district, gender, weight, date_of_birth, blood_group } = req.body;

    await connection.beginTransaction();

    if (email) {
      const [existing] = await connection.query(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, userId]
      );
      if (existing.length > 0) {
        throw httpError(409, 'This email address is already in use.');
      }
      await connection.query('UPDATE users SET email = ? WHERE user_id = ?', [email, userId]);
    }

    // Column names are whitelisted here — user input only ever supplies values.
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
      await connection.query(`UPDATE donors SET ${setClause} WHERE user_id = ?`, [
        ...Object.values(fields),
        userId,
      ]);
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
    if (connection) await connection.rollback();
    next(toFriendlyError(error, 'Profile update failed. Please try again.'));
  } finally {
    if (connection) connection.release();
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await findUserByUsernameOrEmail(username);

    if (!user) {
      throw httpError(401, 'Invalid username or password.');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw httpError(401, 'Invalid username or password.');
    }

    if (user.account_status !== 'active') {
      if (user.role === 'hospital' && user.account_status === 'pending') {
        throw httpError(403, 'Your hospital registration is awaiting approval from the Blood Bank.');
      }
      if (user.role === 'hospital' && user.account_status === 'inactive') {
        throw httpError(403, 'Your hospital registration was rejected. Please contact the Blood Bank.');
      }
      throw httpError(403, 'Your account is not active. Please contact the Blood Bank.');
    }

    const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET, {
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
    next(toFriendlyError(error, 'Login failed. Please try again.'));
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.user_id);
    if (!user) {
      throw httpError(404, 'User not found.');
    }

    let profile = null;

    if (user.role === 'donor') {
      profile = await getDonorByUserId(user.user_id);
    } else if (user.role === 'hospital') {
      const [rows] = await pool.query('SELECT * FROM hospitals WHERE user_id = ?', [user.user_id]);
      profile = rows[0] || null;
    }

    res.json({ success: true, user, profile });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load your account.'));
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const [rows] = await pool.query('SELECT user_id, email FROM users WHERE LOWER(email) = ?', [email]);

    // Always answer the same way so the endpoint cannot be used to discover
    // which email addresses are registered.
    const response = {
      success: true,
      message:
        'If an account exists for that email address, a password reset link has been generated.',
    };

    if (rows.length === 0) {
      return res.json(response);
    }

    const userId = rows[0].user_id;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    // Invalidate any outstanding tokens before issuing a new one.
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [
      userId,
    ]);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );

    // No SMTP provider is configured in this build, so the link is returned to
    // the caller and logged server-side instead of being emailed.
    if (process.env.NODE_ENV !== 'production') {
      const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/reset-password?token=${rawToken}`;
      console.log(`[forgot-password] reset link for ${email} (valid ${RESET_TOKEN_TTL_MINUTES} min): ${link}`);
    }

    return res.json({ ...response, resetToken: process.env.NODE_ENV === 'production' ? undefined : rawToken });
  } catch (error) {
    next(toFriendlyError(error, 'Could not start the password reset. Please try again.'));
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const [rows] = await pool.query(
      `SELECT t.token_id, t.user_id
         FROM password_reset_tokens t
        WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW()
        LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      throw httpError(400, 'This password reset link is invalid or has expired. Please request a new one.');
    }

    const { token_id: tokenId, user_id: userId } = rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
      await connection.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_id = ?', [tokenId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({ success: true, message: 'Your password has been updated. You can now log in.' });
  } catch (error) {
    next(toFriendlyError(error, 'Password reset failed. Please try again.'));
  }
};

module.exports = {
  registerDonor,
  registerHospital,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
};
