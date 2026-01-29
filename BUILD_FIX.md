# BMS Build & Deployment Fix

## Issue Fixed
```
Error: ENOENT: no such file or directory, stat 'C:\Users\chandu\Downloads\BMS\build\index.html'
```

## Root Cause
The server was looking for the built frontend in:
- `C:\Users\chandu\Downloads\BMS\build\` ❌

But the React app builds to:
- `C:\Users\chandu\Downloads\BMS\bms-frontend-ts\build\` ✅

## Solution Applied

### Updated server.js (lines 592-597)
Changed the static file serving paths:

**Before:**
```javascript
app.use(express.static(path.join(__dirname, '../build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});
```

**After:**
```javascript
app.use(express.static(path.join(__dirname, '../bms-frontend-ts/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../bms-frontend-ts/build/index.html'));
});
```

## Directory Structure
```
BMS/
├── server/                      # Express server
│   ├── server.js               # ✅ Fixed to point to correct build
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── package.json
├── bms-frontend-ts/            # React TypeScript app
│   ├── src/
│   ├── build/                  # ✅ Frontend builds here
│   │   └── index.html
│   └── package.json
└── start.sh                    # Helper script
```

## How to Run

### Option 1: Manual Build and Run
```bash
# Build frontend
cd bms-frontend-ts
npm run build
cd ..

# Start server
cd server
npm start
```

Server will:
- Serve static files from `bms-frontend-ts/build/`
- Serve API endpoints on `/api/*`
- Fallback to `index.html` for SPA routing

### Option 2: Use Start Script
```bash
./start.sh
```

## Verification

✅ Frontend build location confirmed: `bms-frontend-ts/build/index.html`
✅ Server paths updated and verified
✅ Server syntax validated
✅ Static file serving configured correctly

## Next Steps

1. Build the frontend: `npm run build` in `bms-frontend-ts/`
2. Start the server: `npm start` in `server/`
3. Access the app at `http://localhost:5002`
