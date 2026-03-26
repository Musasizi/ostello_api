/**
 * controllers/paymentController.js – Payment Controller
 *
 * Rules:
 *   - Payment only allowed after booking is APPROVED
 *   - Transaction is atomic: payment + booking status update
 *
 * Endpoints:
 *   POST /api/payments              → make payment (STUDENT)
 *   GET  /api/payments/my           → student's payments
 *   GET  /api/payments/:id          → payment details
 *   GET  /api/payments              → all payments (ADMIN)
 */

const Payment = require('../models/paymentModel');
const Booking = require('../models/bookingModel');
const Room = require('../models/roomModel');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/payments – Make a payment for an approved booking
 * Body: { booking_id, method }
 */
const makePayment = async (req, res) => {
    const { booking_id, method } = req.body;

    if (!booking_id) {
        return res.status(400).json({ error: 'booking_id is required.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Verify booking exists and belongs to the student
        const [bookings] = await connection.query(
            `SELECT b.*, r.price_per_semester, r.id AS room_id
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ?`,
            [booking_id]
        );

        if (bookings.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Booking not found.' });
        }

        const booking = bookings[0];

        if (booking.student_id !== req.user.id) {
            await connection.rollback();
            return res.status(403).json({ error: 'You can only pay for your own bookings.' });
        }

        if (booking.status !== 'APPROVED') {
            await connection.rollback();
            return res.status(400).json({ error: 'Payment is only allowed for approved bookings.' });
        }

        // Check if payment already exists
        const [existingPayments] = await connection.query(
            "SELECT id FROM payments WHERE booking_id = ? AND status = 'COMPLETED'",
            [booking_id]
        );

        if (existingPayments.length > 0) {
            await connection.rollback();
            return res.status(409).json({ error: 'Payment has already been made for this booking.' });
        }

        const transaction_ref = `OST-${uuidv4().slice(0, 8).toUpperCase()}`;
        const amount = booking.price_per_semester;

        // Create payment record
        const [paymentResult] = await connection.query(
            `INSERT INTO payments (booking_id, student_id, amount, method, status, transaction_ref)
       VALUES (?, ?, ?, ?, 'COMPLETED', ?)`,
            [booking_id, req.user.id, amount, method || 'MOBILE_MONEY', transaction_ref]
        );

        // Update booking status to COMPLETED
        await connection.query(
            "UPDATE bookings SET status = 'COMPLETED' WHERE id = ?",
            [booking_id]
        );

        // Mark room as unavailable
        await connection.query(
            'UPDATE rooms SET is_available = false WHERE id = ?',
            [booking.room_id]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Payment successful! Your booking is confirmed.',
            paymentId: paymentResult.insertId,
            transaction_ref,
            amount,
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

/**
 * GET /api/payments/my – Student's payments
 */
const getMyPayments = async (req, res) => {
    try {
        const [payments] = await Payment.getByStudent(req.user.id);
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/payments/:id – Payment details
 */
const getPaymentById = async (req, res) => {
    try {
        const [results] = await Payment.getById(req.params.id);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Payment not found.' });
        }

        const payment = results[0];
        if (payment.student_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        res.json(payment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/payments – All payments (ADMIN)
 */
const getAllPayments = async (req, res) => {
    try {
        const [payments] = await Payment.getAll();
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { makePayment, getMyPayments, getPaymentById, getAllPayments };
