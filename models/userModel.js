/**
 * models/userModel.js - Data Access Layer for Users (Ostello)
 *
 * Roles: STUDENT, CUSTODIAN, ADMIN
 * Fields: full_name, email, phone, password_hash, role, institution,
 *         is_verified, verification_token, reset_token, reset_token_expires
 */
const db   = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  /** Create a new user. Password is hashed before storage. */
  create: async ({ full_name, email, phone, password, role, institution, verification_token }) => {
    const password_hash = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO users
        (full_name, email, phone, password_hash, role, institution, is_verified, verification_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    return db.query(sql, [
      full_name,
      email,
      phone || null,
      password_hash,
      role || 'STUDENT',
      institution || null,
      false,
      verification_token || null,
    ]);
  },

  /** Find user by email (used during login). */
  findByEmail: (email) =>
    db.query('SELECT * FROM users WHERE email = ?', [email]),

  /** Find user by id (excludes password_hash for safe public use). */
  findById: (id) =>
    db.query(
      'SELECT id, full_name, email, phone, role, institution, is_verified, created_at FROM users WHERE id = ?',
      [id]
    ),

  /** Find user by id including password_hash (internal use). */
  findByIdFull: (id) =>
    db.query('SELECT * FROM users WHERE id = ?', [id]),

  /** Find user by email-verification token. */
  findByVerificationToken: (token) =>
    db.query('SELECT * FROM users WHERE verification_token = ?', [token]),

  /** Mark user as verified and clear the token. */
  verify: (id) =>
    db.query(
      'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = ?',
      [id]
    ),

  /** Store a password-reset token with expiry. */
  setResetToken: (id, reset_token, expires) =>
    db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [reset_token, expires, id]
    ),

  /** Find user by valid (non-expired) reset token. */
  findByResetToken: (token) =>
    db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    ),

  /** Update password and clear reset token. */
  updatePassword: async (id, newPassword) => {
    const password_hash = await bcrypt.hash(newPassword, 10);
    return db.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [password_hash, id]
    );
  },

  /** Return all users, optionally filtered by role. */
  getAll: (role = null) => {
    let sql = 'SELECT id, full_name, email, phone, role, institution, is_verified, created_at FROM users';
    const params = [];
    if (role) {
      sql += ' WHERE role = ?';
      params.push(role);
    }
    sql += ' ORDER BY created_at DESC';
    return db.query(sql, params);
  },

  /** Update user profile fields. */
  update: (id, { full_name, email, phone, institution }) =>
    db.query(
      'UPDATE users SET full_name = ?, email = ?, phone = ?, institution = ? WHERE id = ?',
      [full_name, email, phone, institution, id]
    ),

  /** Permanently delete a user. */
  delete: (id) =>
    db.query('DELETE FROM users WHERE id = ?', [id]),
};

module.exports = User;
