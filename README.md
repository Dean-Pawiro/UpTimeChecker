
# UpTime Checker

Full-stack uptime monitoring app with Node.js/Express backend and Vite/React frontend.

## Quick Start

### 1. Install dependencies

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd frontend
npm install
```

### 2. Start the app

**Windows:**
Double-click `start.bat` in the project root (starts both backend and frontend).

**Manual:**
Open two terminals:
```bash
# Terminal 1
cd backend && npm run dev
# Terminal 2
cd frontend && npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:5000

### 3. Environment Variables

Create a `.env` file in the `backend` folder:
```
PORT=5000
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=uptime_checker
```

## Deploying

1. Create a MySQL database in Hostinger control panel
2. Update `.env` in backend with DB credentials
3. Upload backend folder, install dependencies, and run `npm start`
4. Build frontend (`npm run build`), upload `dist` to `public_html`

---
For more details, see comments in the code or ask for help!
If it works locally, it will work on Hostinger!
