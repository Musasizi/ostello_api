/**
 * controllers/roomController.js – Room Management Controller
 *
 * Endpoints:
 *   GET    /api/hostels/:hostelId/rooms     → list rooms in a hostel (public)
 *   GET    /api/rooms/:id                   → get room details (public)
 *   POST   /api/hostels/:hostelId/rooms     → add room (CUSTODIAN owner)
 *   PUT    /api/rooms/:id                   → update room (CUSTODIAN owner)
 *   DELETE /api/rooms/:id                   → delete room (CUSTODIAN owner)
 */

const Room = require('../models/roomModel');
const Hostel = require('../models/hostelModel');

/**
 * GET /api/hostels/:hostelId/rooms – List all rooms in a hostel (public)
 */
const getRoomsByHostel = async (req, res) => {
    try {
        const [rooms] = await Room.getByHostel(req.params.hostelId);
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/rooms/:id – Get room details (public)
 */
const getRoomById = async (req, res) => {
    try {
        const [results] = await Room.getById(req.params.id);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Room not found.' });
        }
        res.json(results[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/hostels/:hostelId/rooms – Create a room (CUSTODIAN owner)
 * Body: { room_number, room_type, price_per_semester, capacity, description, is_available }
 */
const createRoom = async (req, res) => {
    const hostelId = req.params.hostelId;

    try {
        // Verify hostel ownership
        const [hostels] = await Hostel.getById(hostelId);
        if (hostels.length === 0) {
            return res.status(404).json({ error: 'Hostel not found.' });
        }
        if (hostels[0].custodian_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You can only add rooms to your own hostels.' });
        }

        const { room_number, room_type, price_per_semester, capacity, description, is_available } = req.body;

        if (!price_per_semester) {
            return res.status(400).json({ error: 'price_per_semester is required.' });
        }

        const [result] = await Room.create({
            hostel_id: hostelId,
            room_number,
            room_type,
            price_per_semester,
            capacity,
            description,
            is_available,
        });

        res.status(201).json({
            message: 'Room created successfully.',
            roomId: result.insertId,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /api/rooms/:id – Update a room (CUSTODIAN owner)
 */
const updateRoom = async (req, res) => {
    try {
        const [rooms] = await Room.getById(req.params.id);
        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found.' });
        }
        if (rooms[0].custodian_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You can only update rooms in your own hostels.' });
        }

        const { room_number, room_type, price_per_semester, capacity, description, is_available } = req.body;
        await Room.update(req.params.id, { room_number, room_type, price_per_semester, capacity, description, is_available });
        res.json({ message: 'Room updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /api/rooms/:id – Delete a room (CUSTODIAN owner)
 */
const deleteRoom = async (req, res) => {
    try {
        const [rooms] = await Room.getById(req.params.id);
        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found.' });
        }
        if (rooms[0].custodian_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You can only delete rooms in your own hostels.' });
        }

        await Room.delete(req.params.id);
        res.json({ message: 'Room deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getRoomsByHostel, getRoomById, createRoom, updateRoom, deleteRoom };
