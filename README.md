# UpTime Checker - Phase 1: Auth System

A full-stack uptime monitoring application built with Node.js/Express backend and Vite/React frontend.

**Database:** MySQL/MariaDB (optimized for Hostinger deployment)

## Project Structure

```
UpTimeChecker/
├── backend/               # Node.js/Express API with Sequelize ORM
│   ├── src/
│   │   ├── server.js      # Main server file with database initialization
│   │   ├── config/
│   │   │   └── database.js    # Sequelize database configuration
│   │   ├── models/
│   │   │   └── User.js        # User database model
│   │   ├── routes/
│   │   │   └── auth.js        # Auth & user management endpoints
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT verification & admin middleware
│   │   └── utils/
│   │       ├── jwt.js         # Token generation and verification
│   │       └── password.js    # Password hashing (bcryptjs)
│   ├── setup-db.js        # Database initialization script
│   ├── package.json
│   └── .env               # Environment variables
│
└── frontend/              # Vite/React SPA
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx     # Auth & user state management
    │   └── pages/
    │       ├── Login.jsx           # Login/Register pages
    │       ├── Dashboard.jsx       # Protected dashboard
    │       └── UserManagement.jsx  # Admin user management page
    ├── package.json
    ├── vite.config.js
    └── index.html
```

## Phase 1 Features - ✅ Implemented

### User Roles
- **Admin**: Can manage all users (view, change roles, delete)
  - Default admin: `dean@bitdynamics.sr`
  - Admin account is protected and cannot be deleted or downgraded
- **User**: Regular user (default role for new registrations)

### Backend API Endpoints

**Auth Endpoints:**
- **POST /auth/register** - Register new user
  - Request: `{ email, password, name }`
  - Response: `{ token, user }`
  - Auto-assigns `admin` role to `dean@bitdynamics.sr`, `user` for others

- **POST /auth/login** - Login user
  - Request: `{ email, password }`
  - Response: `{ token, user }`

- **GET /auth/me** - Get current user (protected)
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ user }`

**User Management Endpoints (Admin Only):**
- **GET /auth/users** - Get all users list
  - Headers: `Authorization: Bearer <token>` (must be admin)
  - Response: `{ users: [...] }`

- **PUT /auth/users/:id/role** - Update user role
  - Headers: `Authorization: Bearer <token>` (must be admin)
  - Body: `{ role: "user"|"admin" }`
  - Response: `{ user }`
  - Cannot change role of admin account

- **DELETE /auth/users/:id** - Delete user
  - Headers: `Authorization: Bearer <token>` (must be admin)
  - Response: `{ message }`
  - Cannot delete admin account

### Frontend Pages
- **Login/Register Page** - User authentication
- **Dashboard** - Protected main page showing user info and quick stats
  - Shows user's role (admin/user badge)
  - Admin users see "Manage Users" button
- **User Management Page** - Admin-only page for managing users
  - View all registered users
  - Change user roles (user ↔ admin)
  - Delete users
  - Protected admin account (dean@bitdynamics.sr)

### Auth System
- JWT-based authentication (24-hour tokens)
- Role-based access control (RBAC)
- Password hashing with bcryptjs
- Automatic token persistence (localStorage)
- Protected routes with AuthContext
- Admin middleware for protecting admin endpoints
- Auth status persists on page refresh

## Quick Start

### Easiest Way - Use the Start Script

**Windows:**
1. Double-click `start.bat` in the project root
2. This will automatically:
   - Open two terminal windows (backend & frontend)
   - Start backend server with nodemon (auto-reload on file changes)
   - Start frontend server with Vite (hot module reload)
   - Open the app at http://localhost:3002

**Or manually:**

### Manual Setup

#### Backend
```bash
cd backend
npm install
npm run dev  # Development with nodemon
# or
npm start    # Production
```
Server runs on: `http://localhost:5000`

### Frontend
```bash
cd frontend
npm install
npm run dev   # Development server with Vite
# or
npm run build  # Production build
npm run preview # Preview production build
```
Client runs on: `http://localhost:3000`

## Testing the Application

### 1. Start both servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 2. Test Registration & Admin Account
- Open http://localhost:3000
- Register with email `dean@bitdynamics.sr` (becomes admin automatically)
- Register another account with a different email (becomes regular user)
- You should be logged in and see the Dashboard

### 3. Admin User Management
- If logged in as admin, click "Manage Users" button
- You can:
  - View all registered users
  - Change user roles (user ↔ admin)
  - Delete users (except admin account)
  - See protected status on admin account

### 4. Test Protected Route
- Manually delete the token from browser localStorage
- Refresh page - you should be back at Login page

### 5. Test Admin Restrictions
- Try to delete the admin account (dean@bitdynamics.sr) - should be prevented
- Try to change admin account's role - should be prevented

### 6. API Testing (with curl or Postman)

**Register as Admin:**
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dean@bitdynamics.sr","password":"admin123","name":"Admin User"}'
```

**Register Regular User:**
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"user123","name":"Regular User"}'
```

**Get All Users (Admin Only):**
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:5000/auth/users
```

**Change User Role (Admin Only):**
```bash
curl -X PUT http://localhost:5000/auth/users/2/role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

**Delete User (Admin Only):**
```bash
curl -X DELETE http://localhost:5000/auth/users/2 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Environment Variables

### Backend (.env)
```
PORT=5000
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
ADMIN_EMAIL=dean@bitdynamics.sr
```

## Architecture

### Authentication & Authorization Flow
1. User registers/submits login form
2. Frontend makes POST request to `/auth/register` or `/auth/login`
3. Backend validates credentials, generates JWT token with role
4. Token is returned to frontend and stored in localStorage
5. Frontend stores token and user info in AuthContext
6. All subsequent API calls include token in Authorization header
7. Backend middleware verifies token and role before allowing access
8. Admin endpoints check `adminMiddleware` for admin role
9. Token persists on page refresh (restored from localStorage)

### State Management
- **Frontend:** React Context API (AuthContext) with localStorage persistence
- **Backend:** In-memory user storage (file structure ready for database migration)

### Security Features
- JWT tokens with 24-hour expiration
- bcryptjs password hashing (salt rounds: 10)
- Admin account protected from deletion and role changes
- Role-based access control on all admin endpoints
- CORS enabled for frontend requests

## Next Steps (Future Phases)

- [ ] Phase 2: Database integration (MongoDB/PostgreSQL)
- [ ] Phase 3: Monitor management (CRUD operations)
- [ ] Phase 4: Uptime tracking and alerts
- [ ] Phase 5: Dashboard analytics and charts
- [ ] Phase 6: Email notifications
- [ ] Phase 7: User management and teams

## Development Notes

- Backend uses ES6 modules (`type: "module"` in package.json)
- Frontend uses React 18 with Vite for fast development
- **Database:** Sequelize ORM with MySQL/MariaDB
- CORS is enabled on backend for frontend requests
- Vite proxy configured to route `/api` requests to backend
- **Data is now persistent** in MySQL database (not in-memory)
- JWT tokens expire after 24 hours
- Admin role is automatically assigned to `dean@bitdynamics.sr`
- Sequelize auto-syncs tables on startup (safe mode, doesn't alter existing data)

### Auto-Reload & Hot Module Reload

**Backend (nodemon):**
- Watches all files in the project
- Automatically restarts when files change
- File extensions watched: `.js`, `.mjs`, `.cjs`, `.json`

**Frontend (Vite):**
- Hot module reload (HMR) enabled by default
- Changes update instantly in browser without full page refresh
- CSS changes apply immediately

### Running Both Servers

**Option 1: Using start.bat (Windows)**
```bash
# Simply double-click start.bat in the project root
# Or run from terminal:
.\start.bat
```

**Option 2: Manual (All Platforms)**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Then open http://localhost:3002 in your browser.

## Hosting on Hostinger

### Why MySQL + Sequelize?

You're using Hostinger's Business Plan, which includes:
- ✅ Node.js runtime support
- ✅ MySQL/MariaDB database included
- ✅ SSH access for deployment
- ✅ Environment variable configuration
- ✅ Automatic process management

This setup uses **Sequelize ORM** for MySQL, which is perfect for Hostinger because:
- Works seamlessly with Hostinger's MySQL
- Automatic table creation on startup
- Easy migrations for future updates
- Supports both development and production

### Database Setup for Hostinger

**1. Create Database on Hostinger**
```
Control Panel → Databases → Create Database
- Database name: uptime_checker
- Database user: create_new_user
- Password: strong_password
```

**2. Update .env with Hostinger Credentials**
```env
PORT=5002
JWT_SECRET=change_this_to_random_string
NODE_ENV=production

# Hostinger database details
DB_HOST=db_server_from_hostinger.com
DB_PORT=3306
DB_USER=hostinger_db_user
DB_PASSWORD=hostinger_db_password
DB_NAME=uptime_checker
```

**3. Automatic Table Creation**
- Sequelize automatically creates the `users` table on first startup
- No manual SQL scripts needed
- Safe to restart - tables won't be recreated if they exist

### Deployment Steps

**Backend Deployment:**
1. Upload `backend` folder to Hostinger
2. SSH into server
3. Run:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. Backend available at your Hostinger app URL

**Frontend Deployment:**
1. Build locally: `npm run build` in frontend folder
2. Upload `dist` folder contents to public_html
3. Update API URL in code if needed

### Hostinger-Specific Notes

- Use `NODE_ENV=production` on Hostinger
- Sequelize will use connection pooling: max 5 connections
- Database logging is disabled in production mode
- Tables auto-sync on startup with `alter: false` (safe mode)

### Testing Before Hostinger

Test with a local MySQL database first:
```bash
# Install MySQL locally (or use Docker)
# Update .env with local MySQL credentials
npm run dev
```

If it works locally, it will work on Hostinger!
