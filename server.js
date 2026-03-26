/**
 * server.js – Ostello API Entry Point
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the FIRST file Node.js runs when you type `npm start`.
 * Its job is to:
 *   1. Load environment variables from .env (database password, JWT secret …)
 *   2. Create an Express application
 *   3. Attach "middleware" that pre-processes every request
 *   4. Mount all the route groups under /api
 *   5. Add a catch-all error handler
 *   6. Tell the application to listen for incoming HTTP connections
 *
 * LEARNING TIP – How does an HTTP request travel through this file?
 *
 *   Browser → server.js → express.json() → cors() → router → controller → model → DB
 *                                                                                   ↓
 *   Browser ←────────────────────────────────────────── res.json(data) ←───────────┘
 *
 * Every incoming request passes through the middleware chain in ORDER.
 * If a middleware calls next() the request moves to the next one.
 * If it calls res.json() or res.send() the chain stops there.
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// dotenv.config() reads the .env file and copies every key=value pair into
// process.env so the rest of the app can access them with process.env.PORT etc.
// ALWAYS call this before you use any process.env values!
dotenv.config();

// Import route groups — each file defines its own express.Router()
// and exports it. We mount them all on the main app below.
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// ─── Create Express Application ──────────────────────────────────────────────
// express() returns a new application object. Think of it as an empty HTTP
// server that we then configure by attaching middleware and routes.
const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────
// Middleware functions run on EVERY request before it reaches a route handler.
// They are attached with app.use() and called in the order they are registered.

// express.json() parses the request body from a raw JSON string into a
// JavaScript object available at req.body.
// Without this, req.body would always be undefined for POST/PUT requests.
app.use(express.json());

// cors() adds the headers that tell browsers it is safe to send requests from
// a different origin (e.g. our React app at localhost:5173 talking to the API
// at localhost:3000 — these are "cross-origin" because the ports differ).
// In production you would restrict this to your specific domain.
app.use(cors());

// ─── Health-Check Route ───────────────────────────────────────────────────────
// A simple GET / endpoint that returns a JSON "ping" response.
// Useful to quickly verify the server is running without needing any auth.
// Try: curl http://localhost:3000/
app.get('/', (req, res) => {
  res.json({ message: 'Ostello API is running 🏠', status: 'ok' });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// app.use('/api', router) mounts every route inside `router` under the /api
// prefix. So a route defined as router.get('/hostels', ...) inside hostelRoutes
// becomes accessible at GET /api/hostels.
//
// The order here matters for performance but not for correctness — Express
// matches routes in registration order within each router file, not here.
app.use('/api', authRoutes);      // /api/register, /api/login, /api/verify-email, etc.
app.use('/api', userRoutes);      // /api/users/me, /api/users, /api/users/:id
app.use('/api', hostelRoutes);    // /api/hostels, /api/hostels/:id
app.use('/api', roomRoutes);      // /api/hostels/:id/rooms, /api/rooms/:id
app.use('/api', bookingRoutes);   // /api/bookings, /api/bookings/:id
app.use('/api', paymentRoutes);   // /api/payments, /api/payments/:id
app.use('/api', reviewRoutes);    // /api/reviews, /api/hostels/:id/reviews

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// If no route above matched the incoming URL this middleware runs.
// A request "falls through" to here when every router.get/post/put/delete
// above returned next() without calling res.json().
//
// We return 404 (Not Found) with a descriptive message so the client knows
// the path doesn't exist — rather than hanging forever or crashing.
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Express identifies an error-handling middleware by the FOUR parameters
// (err, req, res, next). Any middleware or controller can trigger this by
// calling next(new Error('something went wrong')).
//
// This is a safety net — it catches any unexpected crash that was not already
// handled inside a try/catch block in a controller.
//
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
// process.env.PORT lets you change the port via .env without editing code.
// Falls back to 3000 if PORT is not set.
// app.listen() opens a TCP socket and starts accepting connections.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
