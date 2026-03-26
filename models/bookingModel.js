/**
 * models/bookingModel.js – Data Access Layer for Bookings
 *
 * Booking status flow: PENDING → APPROVED → COMPLETED (after payment)
 *                      PENDING → DECLINED
 *                      PENDING / APPROVED → CANCELLED
 */

const db = require('../config/db');

const Booking = {
    /**
     * Create a new booking (status = PENDING).
     */
    create: ({ student_id, room_id, check_in_date, check_out_date }) => {
        const sql = `INSERT INTO bookings
      (student_id, room_id, check_in_date, check_out_date, status)
      VALUES (?, ?, ?, ?, 'PENDING')`;
        return db.query(sql, [student_id, room_id, check_in_date, check_out_date]);
    },

    /**
     * Get a booking by ID with full details.
     */
    getById: (id) => {
        const sql = `SELECT b.*,
                        u.full_name AS student_name, u.email AS student_email,
                        r.room_number, r.room_type, r.price_per_semester, r.hostel_id,
                        h.name AS hostel_name, h.custodian_id
                 FROM bookings b
                 JOIN users u ON b.student_id = u.id
                 JOIN rooms r ON b.room_id = r.id
                 JOIN hostels h ON r.hostel_id = h.id
                 WHERE b.id = ?`;
        return db.query(sql, [id]);
    },

    /**
     * Get all bookings for a student.
     */
    getByStudent: (student_id) => {
        const sql = `SELECT b.*,
                        r.room_number, r.room_type, r.price_per_semester,
                        h.name AS hostel_name, h.id AS hostel_id
                 FROM bookings b
                 JOIN rooms r ON b.room_id = r.id
                 JOIN hostels h ON r.hostel_id = h.id
                 WHERE b.student_id = ?
                 ORDER BY b.created_at DESC`;
        return db.query(sql, [student_id]);
    },

    /**
     * Get all bookings for a custodian's hostels.
     */
    getByCustodian: (custodian_id, status = null) => {
        let sql = `SELECT b.*,
                      u.full_name AS student_name, u.email AS student_email,
                      r.room_number, r.room_type, r.price_per_semester,
                      h.name AS hostel_name, h.id AS hostel_id
               FROM bookings b
               JOIN users u ON b.student_id = u.id
               JOIN rooms r ON b.room_id = r.id
               JOIN hostels h ON r.hostel_id = h.id
               WHERE h.custodian_id = ?`;
        const params = [custodian_id];

        if (status) {
            sql += ' AND b.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY b.created_at DESC';
        return db.query(sql, params);
    },

    /**
     * Update booking status.
     */
    updateStatus: (id, status) => {
        const sql = 'UPDATE bookings SET status = ? WHERE id = ?';
        return db.query(sql, [status, id]);
    },

    /**
     * Check if room has overlapping approved bookings for given dates.
     */
    checkOverlap: (room_id, check_in_date, check_out_date, exclude_id = null) => {
        let sql = `SELECT COUNT(*) AS count FROM bookings
               WHERE room_id = ?
               AND status IN ('PENDING', 'APPROVED')
               AND check_in_date < ?
               AND check_out_date > ?`;
        const params = [room_id, check_out_date, check_in_date];
        if (exclude_id) {
            sql += ' AND id != ?';
            params.push(exclude_id);
        }
        return db.query(sql, params);
    },

    /**
     * Get all bookings (admin view).
     */
    getAll: () => {
        const sql = `SELECT b.*,
                        u.full_name AS student_name,
                        r.room_number, r.room_type, r.price_per_semester,
                        h.name AS hostel_name
                 FROM bookings b
                 JOIN users u ON b.student_id = u.id
                 JOIN rooms r ON b.room_id = r.id
                 JOIN hostels h ON r.hostel_id = h.id
                 ORDER BY b.created_at DESC`;
        return db.query(sql);
    },
};

module.exports = Booking;
