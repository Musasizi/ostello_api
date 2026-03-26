/**
 * models/hostelModel.js – Data Access Layer for Hostels
 *
 * Supports: CRUD, search by name/location, filter by amenities/price/rating,
 *           distance-based queries using Haversine formula.
 */

const db = require('../config/db');

const Hostel = {
    /**
     * Create a new hostel listing.
     */
    create: async ({ custodian_id, name, description, address, latitude, longitude, photos, amenities }) => {
        const sql = `INSERT INTO hostels
      (custodian_id, name, description, address, latitude, longitude, photos, amenities)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        return db.query(sql, [
            custodian_id,
            name,
            description || '',
            address || '',
            latitude || null,
            longitude || null,
            JSON.stringify(photos || []),
            JSON.stringify(amenities || []),
        ]);
    },

    /**
     * Get all hostels with optional filters.
     * Supports: search (name), min_price, max_price, amenities, min_rating,
     *           room_type, lat/lng + radius (km) for distance filtering.
     */
    search: async (filters = {}) => {
        const { search, min_price, max_price, amenity, min_rating, room_type, lat, lng, radius, custodian_id } = filters;
        let sql = `
      SELECT h.*,
             COALESCE(h.avg_rating, 0) AS avg_rating,
             MIN(r.price_per_semester) AS min_price,
             MAX(r.price_per_semester) AS max_price`;

        // If lat/lng provided, calculate distance using Haversine formula
        if (lat && lng) {
            sql += `,
        (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(h.latitude)) *
          COS(RADIANS(h.longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(h.latitude))
        )) AS distance`;
        }

        sql += `
      FROM hostels h
      LEFT JOIN rooms r ON r.hostel_id = h.id`;

        const conditions = [];
        const params = [];

        if (lat && lng) {
            params.push(parseFloat(lat), parseFloat(lng), parseFloat(lat));
        }

        if (search) {
            conditions.push('(h.name LIKE ? OR h.address LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (custodian_id) {
            conditions.push('h.custodian_id = ?');
            params.push(custodian_id);
        }

        if (min_rating) {
            conditions.push('h.avg_rating >= ?');
            params.push(parseFloat(min_rating));
        }

        if (amenity) {
            // Search within JSON array
            conditions.push('JSON_CONTAINS(h.amenities, ?)');
            params.push(JSON.stringify(amenity));
        }

        if (room_type) {
            conditions.push('r.room_type = ?');
            params.push(room_type);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' GROUP BY h.id';

        // Having clause for price range (operates on aggregated values)
        const having = [];
        if (min_price) {
            having.push('min_price >= ?');
            params.push(parseFloat(min_price));
        }
        if (max_price) {
            having.push('max_price <= ?');
            params.push(parseFloat(max_price));
        }
        if (having.length > 0) {
            sql += ' HAVING ' + having.join(' AND ');
        }

        // Distance filtering
        if (lat && lng && radius) {
            const distanceCondition = `distance <= ?`;
            if (having.length > 0) {
                sql += ` AND ${distanceCondition}`;
            } else {
                sql += ` HAVING ${distanceCondition}`;
            }
            params.push(parseFloat(radius));
        }

        // Order by distance if location provided, otherwise newest first
        if (lat && lng) {
            sql += ' ORDER BY distance ASC';
        } else {
            sql += ' ORDER BY h.created_at DESC';
        }

        return db.query(sql, params);
    },

    /**
     * Get a single hostel by ID with full details.
     */
    getById: (id) => {
        const sql = 'SELECT * FROM hostels WHERE id = ?';
        return db.query(sql, [id]);
    },

    /**
     * Get hostels owned by a specific custodian.
     */
    getByCustodian: (custodian_id) => {
        const sql = 'SELECT * FROM hostels WHERE custodian_id = ? ORDER BY created_at DESC';
        return db.query(sql, [custodian_id]);
    },

    /**
     * Update a hostel listing.
     */
    update: (id, { name, description, address, latitude, longitude, photos, amenities }) => {
        const sql = `UPDATE hostels SET
      name = ?, description = ?, address = ?,
      latitude = ?, longitude = ?,
      photos = ?, amenities = ?
      WHERE id = ?`;
        return db.query(sql, [
            name, description, address,
            latitude, longitude,
            JSON.stringify(photos || []),
            JSON.stringify(amenities || []),
            id,
        ]);
    },

    /**
     * Update the average rating for a hostel (called after a new review).
     */
    updateRating: async (hostel_id) => {
        const sql = `UPDATE hostels SET avg_rating = (
      SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE hostel_id = ?
    ) WHERE id = ?`;
        return db.query(sql, [hostel_id, hostel_id]);
    },

    /**
     * Delete a hostel.
     */
    delete: (id) => {
        const sql = 'DELETE FROM hostels WHERE id = ?';
        return db.query(sql, [id]);
    },

    /**
     * Get dashboard stats for a custodian.
     */
    getCustodianStats: async (custodian_id) => {
        const [[{ hostelCount }]] = await db.query(
            'SELECT COUNT(*) AS hostelCount FROM hostels WHERE custodian_id = ?', [custodian_id]
        );
        const [[{ roomCount }]] = await db.query(
            `SELECT COUNT(*) AS roomCount FROM rooms r
       JOIN hostels h ON r.hostel_id = h.id
       WHERE h.custodian_id = ?`, [custodian_id]
        );
        const [[{ bookingCount }]] = await db.query(
            `SELECT COUNT(*) AS bookingCount FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN hostels h ON r.hostel_id = h.id
       WHERE h.custodian_id = ?`, [custodian_id]
        );
        const [[{ pendingCount }]] = await db.query(
            `SELECT COUNT(*) AS pendingCount FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN hostels h ON r.hostel_id = h.id
       WHERE h.custodian_id = ? AND b.status = 'PENDING'`, [custodian_id]
        );
        return { hostelCount, roomCount, bookingCount, pendingCount };
    },

    /**
     * Get platform-wide admin stats.
     */
    getAdminStats: async () => {
        const [[{ totalHostels }]] = await db.query('SELECT COUNT(*) AS totalHostels FROM hostels');
        const [[{ totalRooms }]] = await db.query('SELECT COUNT(*) AS totalRooms FROM rooms');
        const [[{ totalBookings }]] = await db.query('SELECT COUNT(*) AS totalBookings FROM bookings');
        const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
        const [[{ totalRevenue }]] = await db.query(
            "SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM payments WHERE status = 'COMPLETED'"
        );
        const [recentBookings] = await db.query(
            `SELECT b.*, u.full_name AS student_name, h.name AS hostel_name
       FROM bookings b
       JOIN users u ON b.student_id = u.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hostels h ON r.hostel_id = h.id
       ORDER BY b.created_at DESC LIMIT 10`
        );
        return { totalHostels, totalRooms, totalBookings, totalUsers, totalRevenue, recentBookings };
    },
};

module.exports = Hostel;
