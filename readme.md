# Ostello API — Hostel Discovery & Booking Platform

> **Learning Project** — Built by MUSASIZI KENNETH to teach students how to design and
> build a real-world REST API with Node.js, Express.js and MySQL.
>
> Work through this code top-to-bottom. Every file has detailed comments that
> explain *why* the code is written that way, not just *what* it does.

---

## Table of Contents

1. [What is Ostello?](#what-is-ostello)
2. [What You Will Learn](#what-you-will-learn)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Setup — Step by Step](#setup--step-by-step)
7. [Environment Variables](#environment-variables)
8. [Database Schema](#database-schema)
9. [Seeded Test Accounts](#seeded-test-accounts)
10. [API Reference](#api-reference)
11. [Testing with cURL / Postman](#testing-with-curl--postman)
12. [Key Concepts Explained](#key-concepts-explained)
13. [Author](#author)

---

## What is Ostello?

Ostello is a **hostel discovery and booking platform** for university students.
It lets students find hostels near their campus, view available rooms, make
booking requests, and pay — all through a REST API.

There are **three user roles**:

| Role | What they can do |
|------|-----------------|
| **STUDENT** | Browse hostels, book rooms, make payments, leave reviews |
| **CUSTODIAN** | List and manage hostels & rooms, approve / decline bookings |
| **ADMIN** | Manage all users and view platform-wide data |

---

## What You Will Learn

By reading and extending this codebase you will understand:

- **REST API design** — resources, HTTP verbs, status codes
- **Express.js** — routing, middleware, error handling
- **MySQL with mysql2** — connection pools, parameterised queries, JOINs
- **Authentication** — password hashing with bcryptjs, JWT creation & verification
- **Authorisation** — role-based access control (RBAC) with middleware
- **Environment variables** — keeping secrets out of source code with dotenv
- **Database relationships** — one-to-many and many-to-many associations
- **JSON columns** — storing structured data (amenities, photos) in MySQL
- **Modular code structure** — models → controllers → routes separation

---

## Tech Stack

| Layer | Library / Tool | Purpose |
|-------|---------------|---------|
| Runtime | **Node.js** (v18+) | JavaScript on the server |
| Framework | **Express.js** 4 | HTTP routing and middleware |
| Database | **MySQL** 8 | Relational data storage |
| DB Driver | **mysql2** | MySQL client with Promise support |
| Auth | **jsonwebtoken** | Create and verify JWT tokens |
| Hashing | **bcryptjs** | Securely hash passwords |
| Email | **nodemailer** | Send verification / reset emails |
| Config | **dotenv** | Load `.env` into `process.env` |
| Dev server | **nodemon** | Auto-restart on file changes |

---

## Project Structure

```
ostello_api/
│
├── .env                    ← Secret config (NEVER commit this file!)
├── package.json            ← npm metadata & scripts
├── server.js               ← Entry point: creates Express app, mounts routes
│
├── config/
│   └── db.js               ← MySQL connection pool (shared by all models)
│
├── middleware/
│   └── authMiddleware.js   ← JWT verification + role-based guard functions
│
├── models/                 ← Pure database layer: only SQL queries live here
│   ├── userModel.js
│   ├── hostelModel.js
│   ├── roomModel.js
│   ├── bookingModel.js
│   ├── paymentModel.js
│   └── reviewModel.js
│
├── controllers/            ← Business logic: validate input, call models, send response
│   ├── authController.js
│   ├── userController.js
│   ├── hostelController.js
│   ├── roomController.js
│   ├── bookingController.js
│   ├── paymentController.js
│   └── reviewController.js
│
├── routes/                 ← Route definitions: maps URL + method → controller function
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── hostelRoutes.js
│   ├── roomRoutes.js
│   ├── bookingRoutes.js
│   ├── paymentRoutes.js
│   └── reviewRoutes.js
│
├── scripts/
│   └── seed.js             ← Creates all tables and inserts sample data
│
└── tests/
    └── hello.test.js       ← Jest test suite placeholder
```

> **Pattern to notice:** every feature follows the same three-layer pattern:
> `routes` → `controllers` → `models`. This separation makes the code easy to
> read, test, and extend.

---

## Prerequisites

Before you start make sure you have the following installed:

| Tool | Minimum version | Install guide |
|------|----------------|---------------|
| **Node.js** | v18 | https://nodejs.org |
| **npm** | v9 (comes with Node) | — |
| **MySQL** | v8 | https://dev.mysql.com/downloads/ |
| **Git** | any | https://git-scm.com |
| **Postman** *(optional)* | any | https://www.postman.com |

Verify your installations:

```bash
node --version    # should print v18.x.x or higher
npm --version     # should print 9.x.x or higher
mysql --version   # should print 8.x.x
```

---

## Setup — Step by Step

### Step 1 — Clone the repository

```bash
git clone https://github.com/musasizi/ostello.git
cd ostello/ostello_api
```

### Step 2 — Install dependencies

```bash
npm install
```

This reads `package.json` and downloads all libraries into the `node_modules/`
folder. You should see a `node_modules/` directory appear.

### Step 3 — Create the MySQL database

Log in to MySQL and create an empty database. The seed script will create all
the tables for you in the next step.

```bash
# Start the MySQL CLI (enter your root password when prompted)
mysql -u root -p
```

```sql
-- Inside the MySQL shell:
CREATE DATABASE ostello_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

> **What is CHARACTER SET utf8mb4?** It supports all Unicode characters,
> including emojis. Always use it for new projects.

### Step 4 — Create your `.env` file

Create a file called `.env` in the `ostello_api/` directory. This file holds
secret values that must NOT be committed to Git.

```bash
# copy the example
cp .env.example .env    # if an example exists, otherwise create it manually
```

Or create it manually (see the [Environment Variables](#environment-variables)
section for all the values you need).

### Step 5 — Seed the database

This command runs `scripts/seed.js`, which:
1. Drops any existing tables
2. Re-creates them with the correct schema
3. Inserts sample users, hostels, rooms, bookings, payments, and reviews

```bash
npm run seed
```

Expected output:
```
Connected to database. Running Ostello seed...

✔  Dropped existing tables
✔  Table: users
✔  Table: hostels
✔  Table: rooms
✔  Table: bookings
✔  Table: payments
✔  Table: reviews
✔  Seeded: 6 users
✔  Seeded: 4 hostels + rooms
✔  Seeded: bookings, payments, reviews
Seed complete!
```

### Step 6 — Start the server

```bash
npm start
```

Nodemon starts the server and watches for file changes. Every time you save a
`.js` file it automatically restarts — no need to stop and re-run manually.

You should see:
```
[nodemon] starting `node server.js`
MySQL connected
Server running on port 3000
```

### Step 7 — Verify it works

Open a new terminal and run:

```bash
curl http://localhost:3000/
```

Expected response:
```json
{ "message": "Ostello API is running 🏠", "status": "ok" }
```

---

## Environment Variables

Create a file named `.env` in `ostello_api/`. **Never commit this file to Git**
— it is already listed in `.gitignore`.

```dotenv
# ── Database ──────────────────────────────────────────────────────────────────
DB_HOST=localhost          # MySQL host (use 'localhost' for local dev)
DB_PORT=3306               # MySQL port (default is 3306)
DB_USER=root               # MySQL username
DB_PASSWORD=yourpassword   # MySQL password — CHANGE THIS!
DB_DATABASE=ostello_db     # Database name you created in Step 3

# ── Server ────────────────────────────────────────────────────────────────────
PORT=3000                  # Port the API listens on

# ── JSON Web Tokens ───────────────────────────────────────────────────────────
# A JWT_SECRET is a long random string used to sign tokens.
# Anyone with this string can forge tokens — keep it secret!
# Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=change_this_to_a_long_random_secret_string

# ── Email (optional — needed for verify-email / forgot-password flows) ────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password   # Use a Gmail App Password, NOT your real password
EMAIL_FROM="Ostello <your@gmail.com>"
```

---

## Database Schema

```
users
  id, full_name, email, phone, password_hash, role, institution,
  is_verified, verification_token, reset_token, reset_token_expires, created_at

hostels
  id, custodian_id* → users.id, name, description, address,
  latitude, longitude, photos (JSON), amenities (JSON), avg_rating, created_at

rooms
  id, hostel_id* → hostels.id, room_number, room_type, price_per_semester,
  capacity, description, is_available, created_at

bookings
  id, student_id* → users.id, room_id* → rooms.id,
  check_in_date, check_out_date, status (PENDING/APPROVED/DECLINED/COMPLETED/CANCELLED),
  price_per_semester, created_at

payments
  id, booking_id* → bookings.id, student_id* → users.id,
  amount, payment_method, transaction_ref, status, paid_at

reviews
  id, hostel_id* → hostels.id, student_id* → users.id, booking_id* → bookings.id,
  rating (1-5), comment, created_at
```

> `*` denotes a foreign key.

---

## Seeded Test Accounts

All accounts use the password **`password123`**.

| Email | Role | Purpose |
|-------|------|---------|
| `admin@ostello.com` | ADMIN | Platform administration |
| `john@ostello.com` | CUSTODIAN | Manages hostels (has 2 hostels) |
| `grace@ostello.com` | CUSTODIAN | Manages hostels (has 2 hostels) |
| `alice@student.com` | STUDENT | Test student user |
| `bob@student.com` | STUDENT | Test student user |
| `diana@student.com` | STUDENT | Test student user |

---

## API Reference

All protected routes require the header:
```
Authorization: Bearer <token>
```
You get the token by calling `POST /api/login`.

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/register` | Public | Register a new account |
| POST | `/api/login` | Public | Log in and receive a JWT |
| GET | `/api/verify-email?token=…` | Public | Verify email address |
| POST | `/api/forgot-password` | Public | Request a password reset link |
| POST | `/api/reset-password` | Public | Set a new password using the reset token |

**Register body:**
```json
{
  "full_name": "Alice Nakato",
  "email": "alice@student.com",
  "password": "password123",
  "role": "STUDENT",
  "institution": "Makerere University"
}
```

**Login body:**
```json
{ "email": "alice@student.com", "password": "password123" }
```

**Login response:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": 3, "full_name": "Alice Nakato", "role": "STUDENT" }
}
```

---

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Any | Get your own profile |
| GET | `/api/users` | ADMIN | List all users |
| PUT | `/api/users/:id` | ADMIN | Update a user |
| DELETE | `/api/users/:id` | ADMIN | Delete a user |

---

### Hostels

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/hostels` | Public | Search / list all hostels |
| GET | `/api/hostels/:id` | Public | Get hostel details |
| GET | `/api/hostels/my` | CUSTODIAN | Get my hostels |
| GET | `/api/hostels/stats` | CUSTODIAN | Dashboard stats |
| POST | `/api/hostels` | CUSTODIAN | Create a hostel |
| PUT | `/api/hostels/:id` | CUSTODIAN | Update a hostel |
| DELETE | `/api/hostels/:id` | CUSTODIAN | Delete a hostel |

**Search query parameters** (all optional):
```
GET /api/hostels?search=makerere&min_price=500000&max_price=1500000
```

---

### Rooms

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/hostels/:id/rooms` | Public | List rooms for a hostel |
| POST | `/api/hostels/:id/rooms` | CUSTODIAN | Add a room |
| PUT | `/api/rooms/:id` | CUSTODIAN | Update a room |
| DELETE | `/api/rooms/:id` | CUSTODIAN | Delete a room |

**Create room body:**
```json
{
  "room_number": "A01",
  "room_type": "SINGLE",
  "price_per_semester": 900000,
  "capacity": 1,
  "description": "Self-contained single room with WiFi"
}
```

---

### Bookings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/bookings` | STUDENT | Create a booking |
| GET | `/api/bookings/my` | STUDENT | My bookings |
| PUT | `/api/bookings/:id/cancel` | STUDENT | Cancel a booking |
| GET | `/api/bookings/custodian` | CUSTODIAN | Bookings for my hostels |
| PUT | `/api/bookings/:id/approve` | CUSTODIAN | Approve a booking |
| PUT | `/api/bookings/:id/decline` | CUSTODIAN | Decline a booking |
| GET | `/api/bookings` | ADMIN | All bookings |

**Create booking body:**
```json
{
  "room_id": 1,
  "check_in_date": "2026-08-01",
  "check_out_date": "2027-01-31"
}
```

---

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payments` | STUDENT | Pay for an approved booking |
| GET | `/api/payments/my` | STUDENT | My payment history |
| GET | `/api/payments` | ADMIN | All payments |

**Payment body:**
```json
{
  "booking_id": 1,
  "amount": 900000,
  "payment_method": "MOBILE_MONEY",
  "transaction_ref": "MTN-2026-XYZ"
}
```

---

### Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/reviews` | STUDENT | Review a hostel (requires a COMPLETED booking) |
| GET | `/api/hostels/:id/reviews` | Public | Reviews for a hostel |
| DELETE | `/api/reviews/:id` | STUDENT/ADMIN | Delete a review |

**Review body:**
```json
{
  "booking_id": 1,
  "rating": 5,
  "comment": "Clean rooms, excellent security, highly recommend!"
}
```

> **Why `booking_id` and not `hostel_id`?**
> Reviews are only allowed after a student has *completed* a stay. The API
> looks up the booking to verify this, and also gets the hostel_id from the
> booking record. This prevents fake reviews.

---

## Testing with cURL / Postman

### Login and save the token

```bash
# 1. Login as a student
curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@student.com","password":"password123"}'
```

Copy the `token` value from the response. In the examples below replace
`<TOKEN>` with that value.

### Browse hostels (public — no token needed)

```bash
curl http://localhost:3000/api/hostels
```

### Get rooms for hostel 1 (public)

```bash
curl http://localhost:3000/api/hostels/1/rooms
```

### Create a booking (requires STUDENT token)

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"room_id":1,"check_in_date":"2026-08-01","check_out_date":"2027-01-31"}'
```

### Approve a booking (requires CUSTODIAN token)

```bash
# First login as a custodian
curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@ostello.com","password":"password123"}'

# Then approve booking with id=1
curl -X PUT http://localhost:3000/api/bookings/1/approve \
  -H "Authorization: Bearer <CUSTODIAN_TOKEN>"
```

---

## Key Concepts Explained

### Why do we use a connection pool?

A single database connection can only run one query at a time. If two users
send requests simultaneously, the second request has to wait for the first to
finish. A **connection pool** maintains multiple open connections and hands
them out as needed — so concurrent requests run in parallel.

### What is a JWT and why does it expire?

A **JSON Web Token (JWT)** is a signed, self-contained string that proves who
you are. The server signs it with `JWT_SECRET` when you log in. On every
protected request your browser sends it back in the `Authorization` header.
The server verifies the signature — no database lookup needed.

Tokens expire (default 24 h) so a stolen token cannot be used forever.

### Why hash passwords instead of storing them plain?

If the database were ever breached, plain-text passwords would expose all
users. **bcryptjs** runs a slow one-way hashing algorithm. Even if an attacker
gets the hash they cannot reverse it — they would have to guess billions of
combinations.

### Why separate models from controllers?

- **Models** only talk to the database. Swap MySQL for PostgreSQL and you only
  change the model files.
- **Controllers** contain business logic (validate input, decide what to do).
  They call models but never write SQL directly.
- This separation makes each layer independently testable and maintainable.

### Why are `amenities` and `photos` stored as JSON?

Every hostel has a different number of amenities. Storing them in a separate
table would require a JOIN for every hostel query. MySQL 8 supports native
JSON columns, so we store them as arrays directly in the `hostels` row.
`mysql2` automatically parses them back into JavaScript arrays when you read
the data — no `JSON.parse()` needed.

---

## Running Tests

```bash
npm test
```

Tests live in the `tests/` folder and use **Jest**.

---

## Author

**MUSASIZI KENNETH**
- GitHub: [github.com/musasizi](https://github.com/musasizi)
- Email: kennymusasizi@gmail.com

---

*Happy Coding! 🚀 — If something is unclear, read the comments in the source
files. Every important decision is documented there.*


This project is a comprehensive example of building a RESTful API using **Express.js** and **MySQL**. It includes features like **user authentication**, **CRUD operations for users**, and **association chapters** (e.g., Robotics Chapter, Gaming Chapter, etc.). This project is designed to help students learn Express.js, MySQL, and REST API development in a structured and modular way.

---

## **Features**
1. **User Authentication**:
   - Register a new user.
   - Login and generate a JWT token.
   - Protected routes using JWT authentication.

2. **User CRUD Operations**:
   - Create, read, update, and delete users.

3. **Association Chapters**:
   - Create, read, update, and delete chapters.
   - Add users to chapters.
   - Retrieve all users in a specific chapter.

4. **Modular Code Structure**:
   - Organized into separate files and folders for better maintainability.

---

## **Technologies Used**
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JSON Web Tokens (JWT)
- **Password Hashing**: bcryptjs
- **Environment Variables**: dotenv
- **Development Tool**: Nodemon

---

## **Project Structure**
```
express-mysql-app/
├── .env
├── package.json
├── server.js
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   └── chapterController.js
├── middleware/
│   └── authMiddleware.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   └── chapterRoutes.js
└── models/
    ├── userModel.js
    └── chapterModel.js
```

---

## **Setup Instructions**

### **1. Prerequisites**
- Install [Node.js](https://nodejs.org/) (v16 or higher).
- Install [MySQL](https://dev.mysql.com/downloads/installer/).
- Install a REST client like [Postman](https://www.postman.com/downloads/) or use `curl` for testing.

### **2. Clone the Repository**
```bash
git clone https://github.com/musasizi/express-mysql-app.git
cd express-mysql-app
```

### **3. Install Dependencies**
```bash
npm install
```

### **4. Set Up the Database**
1. Log in to MySQL:
   ```bash
   mysql -u root -p
   ```

2. Create the database and tables:
   ```sql
   CREATE DATABASE express_auth;
   USE express_auth;

   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(255) NOT NULL UNIQUE,
     password VARCHAR(255) NOT NULL,
     email VARCHAR(255) NOT NULL UNIQUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE chapters (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL UNIQUE,
     description TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE user_chapters (
     user_id INT,
     chapter_id INT,
     PRIMARY KEY (user_id, chapter_id),
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
     FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
   );
   ```

### **5. Configure Environment Variables**
Create a `.env` file in the root directory and add the following:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_DATABASE=express_auth
JWT_SECRET=yourjwtsecretkey
PORT=3000
```

### **6. Run the Application**
```bash
npm start
```

The server will start on `http://localhost:3000`.

---

## **API Endpoints**

### **Authentication**
- **Register a User**: `POST /api/register`
  ```json
  {
    "username": "john_doe",
    "password": "password123",
    "email": "john@example.com"
  }
  ```

- **Login**: `POST /api/login`
  ```json
  {
    "username": "john_doe",
    "password": "password123"
  }
  ```

### **Users**
- **Get All Users**: `GET /api/users` (Protected)
- **Update a User**: `PUT /api/users/:id` (Protected)
- **Delete a User**: `DELETE /api/users/:id` (Protected)

### **Chapters**
- **Create a Chapter**: `POST /api/chapters` (Protected)
  ```json
  {
    "name": "Robotics Chapter",
    "description": "A chapter for robotics enthusiasts."
  }
  ```

- **Get All Chapters**: `GET /api/chapters`
- **Get Chapter by ID**: `GET /api/chapters/:id`
- **Update a Chapter**: `PUT /api/chapters/:id` (Protected)
- **Delete a Chapter**: `DELETE /api/chapters/:id` (Protected)
- **Add User to Chapter**: `POST /api/chapters/add-user` (Protected)
  ```json
  {
    "userId": 1,
    "chapterId": 1
  }
  ```

- **Get Users in a Chapter**: `GET /api/chapters/:id/users` (Protected)

---

## **Testing the API**
Use a tool like **Postman** or **cURL** to test the endpoints. Here are some examples:

### **Register a User**
```bash
curl -X POST http://localhost:3000/api/register \
-H "Content-Type: application/json" \
-d '{
  "username": "john_doe",
  "password": "password123",
  "email": "john@example.com"
}'
```

### **Login**
```bash
curl -X POST http://localhost:3000/api/login \
-H "Content-Type: application/json" \
-d '{
  "username": "john_doe",
  "password": "password123"
}'
```

### **Get All Users (Protected)**
```bash
curl -X GET http://localhost:3000/api/users \
-H "Authorization: Bearer <token>"
```

---

## **Learning Objectives**
1. **Express.js Basics**:
   - Routing, middleware, and request handling.
2. **MySQL Integration**:
   - Connecting to MySQL, executing queries, and managing relationships.
3. **Authentication**:
   - Implementing JWT-based authentication.
4. **Modular Code Structure**:
   - Organizing code into controllers, models, and routes.
5. **REST API Design**:
   - Designing and implementing RESTful endpoints.

---

## **Contributing**
Feel free to contribute to this project by opening issues or submitting pull requests. Your feedback and improvements are welcome!

---

## **License**
This project is open-source and available under the [MIT License](LICENSE).

---

## **Author**
[MUSASIZI KENNETH]
[github.com/musasizi]
[kennymusasizi@gmail.com]

---

Happy Coding! 🚀