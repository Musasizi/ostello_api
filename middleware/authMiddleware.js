/**
 * middleware/authMiddleware.js – JWT Authentication & Role-Based Access Control
 * ─────────────────────────────────────────────────────────────────────────────
 * This file exports two middleware functions used to protect API routes:
 *
 *   authenticateToken  – Checks that the request carries a valid JWT.
 *                        Attaches the decoded user payload to req.user.
 *
 *   authorize(...roles) – Checks that req.user has one of the permitted roles.
 *                         Must always be used AFTER authenticateToken.
 *
 * ── HOW MIDDLEWARE WORKS ──────────────────────────────────────────────────────
 * An Express middleware is just a function with three parameters:
 *   (req, res, next)
 *
 *   req  – the incoming HTTP request object
 *   res  – the outgoing HTTP response object
 *   next – a function you call to pass control to the NEXT middleware/handler
 *
 * You end a request by calling res.json() / res.send() / res.status().json().
 * You continue the chain by calling next().
 * If you do neither, the request hangs — always one or the other!
 *
 * ── HOW JWTs WORK ─────────────────────────────────────────────────────────────
 * When a user logs in, the server creates a JWT (JSON Web Token):
 *   1. Takes a payload: { id, email, role, iat, exp }
 *   2. Signs it with JWT_SECRET using HMAC-SHA256
 *   3. Returns a base64-encoded string: header.payload.signature
 *
 * The client stores this token and sends it back on every protected request:
 *   Authorization: Bearer eyJhbGci...
 *
 * The server verifies the SIGNATURE to confirm it hasn't been tampered with.
 * No database lookup is needed — the payload is self-contained.
 *
 * ── USAGE IN ROUTES ──────────────────────────────────────────────────────────
 *   const { authenticateToken, authorize } = require('../middleware/authMiddleware');
 *
 *   // Any logged-in user can access this
 *   router.get('/profile', authenticateToken, getProfile);
 *
 *   // Only CUSTODIANs and ADMINs can create a hostel
 *   router.post('/hostels', authenticateToken, authorize('CUSTODIAN', 'ADMIN'), createHostel);
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * authenticateToken
 * ─────────────────
 * Middleware that:
 *   1. Reads the Authorization header from the request.
 *   2. Extracts the token after "Bearer ".
 *   3. Verifies the token's signature using JWT_SECRET.
 *   4. If valid, stores the decoded payload in req.user and calls next().
 *   5. If invalid or missing, immediately returns a 401 or 403 response.
 *
 * After this middleware runs, every subsequent handler can safely read:
 *   req.user.id    → the user's database ID
 *   req.user.email → the user's email
 *   req.user.role  → 'STUDENT' | 'CUSTODIAN' | 'ADMIN'
 */
const authenticateToken = (req, res, next) => {
    // The Authorization header looks like: "Bearer eyJhbGci..."
    // We use optional chaining (?.) to safely read it even if the header is absent.
    const authHeader = req.headers['authorization'];

    // Split on the space and take the second part — the actual token string.
    // If there is no header, token will be undefined.
    const token = authHeader?.split(' ')[1];

    // No token at all → 401 Unauthorized
    // 401 means "you need to authenticate first" (send us a token!)
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // jwt.verify() checks:
    //   • The signature is valid (wasn't tampered with)
    //   • The token hasn't expired (exp field)
    // If it passes, `decoded` contains the original payload object.
    // If it fails, `err` is set with details.
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // 403 Forbidden means "your token was recognised but is invalid/expired"
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }

        // Attach the decoded payload to the request so downstream handlers
        // can read the user's id, email, and role without querying the database.
        req.user = decoded;

        // Pass control to the next middleware or route handler.
        next();
    });
};

/**
 * authorize(...roles)
 * ───────────────────
 * A "factory function" — it takes a list of allowed roles and RETURNS a
 * new middleware function tailored for those roles.
 *
 * This pattern is called a "higher-order function": a function that returns
 * another function.
 *
 * Example usage:
 *   authorize('CUSTODIAN', 'ADMIN')
 *   → returns (req, res, next) => { ... } which checks req.user.role
 *
 * The spread operator `...roles` collects all arguments into an array:
 *   authorize('A', 'B')  →  roles = ['A', 'B']
 */
const authorize = (...roles) => {
    // The returned function IS the actual middleware.
    // It runs after authenticateToken has already set req.user.
    return (req, res, next) => {

        // Defensive check — shouldn't normally trigger if you always
        // put authenticateToken before authorize in your route chain.
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        // roles.includes() checks whether the user's role is in the allowed list.
        // If not, return 403 Forbidden — the user IS authenticated but NOT authorised.
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required role: ${roles.join(' or ')}.`,
            });
        }

        // Role check passed — continue to the actual route handler.
        next();
    };
};

// Export both functions so route files can import them.
module.exports = { authenticateToken, authorize };
