# BMS (Business Management System)
## Project Overview
A full-stack business management system with **React TypeScript frontend** and **Express.js + MongoDB backend**. Two separate applications: `bms-frontend-ts/` and `server/` that communicate via REST API.

## Architecture & Data Flow

### Backend (Express.js + MongoDB)
- **Port**: 5002 (via `.env` `PORT` variable)
- **Key routes**: `/api/{auth,users,invoices,suppliers,products,bills,kits,permissions,shop-profile,dues}`
- **Authentication**: JWT tokens (7-day expiry) with refresh token rotation
- **Authorization**: Permission-based via `middleware/authorize.js` - extracts permissions array from decoded JWT
- **Database**: MongoDB with Mongoose models in `server/models/`

### Frontend (React TypeScript)
- **Port**: 3001 (via `npm start` in `bms-frontend-ts/`)
- **Build output**: `bms-frontend-ts/build/` (server serves from here)
- **State Management**: Context API (`UserContext`) stores `user`, `authLoading`, `logout()`
- **API Client**: Axios instance in `services/api.ts` with automatic JWT injection and 401 refresh logic

### Critical Integration Points
1. **Token Lifecycle**: JWT stored in localStorage → decoded via `jwtDecode` → auto-refresh on 401 in API interceptor
2. **Permission Flow**: Backend populates `permissions` array in JWT → frontend checks via `PrivateRoute` component
3. **User State**: `UserProvider` wraps app, initializes from token on mount, triggers refresh if expired
4. **Static Files**: Server serves built frontend from `../bms-frontend-ts/build/` (see `BUILD_FIX.md`)

## Essential Developer Workflows

### Local Development (Two Terminals)
```bash
# Terminal 1: Backend
cd server
npm install  # first time only
npm start    # runs on :5002, expects .env with MONGO_URI & JWT_SECRET

# Terminal 2: Frontend  
cd bms-frontend-ts
npm install  # first time only
npm start    # runs on :3001 with hot reload
```

### Quick Start Script
```bash
chmod +x start.sh
./start.sh   # Installs deps, builds frontend, starts server
```

### Environment Setup
Create `server/.env`:
```env
PORT=5002
MONGO_URI=mongodb://localhost:27017/bms
JWT_SECRET=<your-secret-key>
JWT_REFRESH_SECRET=<refresh-secret>
```

### Build & Deployment
```bash
cd bms-frontend-ts && npm run build  # Creates optimized build/
cd ../server && npm start             # Serves static files + API
```

## Code Patterns & Conventions

### API Service Integration
- **Location**: `bms-frontend-ts/src/services/api.ts`
- **Pattern**: Axios instance with global JWT interceptor
- **Key feature**: Automatic token refresh on 401 via `processQueue()` - prevents request race conditions
- **Usage**: `import api from '../services/api'; api.get('/invoices')` automatically includes auth

### Permission System
- **Frontend check**: `<PrivateRoute permission="invoices:create">` wraps components
- **Backend check**: `[auth, authorize(['invoices:create'])]` middleware on routes
- **Permission format**: Strings like `"invoices:create"`, `"users:view"`, `"kits:edit"`
- **Admin bypass**: `user.role === 'Admin'` bypasses permission checks

### Type Definitions
- **Location**: `bms-frontend-ts/src/types/models.ts`
- **Key types**: `User`, `DecodedUser` (JWT payload), `Supplier`, `Invoice`, `Bill`, `Product`, `Kit`
- **Pattern**: Interface for each entity, use `_id?: string` for MongoDB ObjectIds

### Component Structure
- **Layout wrapper**: `src/components/Layout/Layout.tsx` wraps all protected routes
- **Folder per feature**: `/Invoices`, `/Bills`, `/Suppliers`, `/Products`, `/Kits`, `/Users`
- **Standard CRUD pattern**: `[Entity]List.tsx` → `[Entity]Form.tsx` → `[Entity]Details.tsx`
- **Forms use**: `react-hook-form` for validation, `react-hot-toast` for notifications

## Important Implementation Details

### Authentication & Token Refresh
1. Frontend stores JWT in `localStorage.getItem('token')`
2. `UserProvider` hydrates state on app mount via `jwtDecode`
3. API interceptor catches 401 → calls `/auth/refresh-token` → retries original request
4. Queue mechanism prevents multiple refresh attempts during retry window
5. Logout clears token and redirects to `/login`

### Backend Models & Relationships
- **User**: References `shop` (required), has `permissions` array
- **Invoice/Bill**: Use `Counter` model for auto-incrementing IDs (see `utils/numberGenerator.js`)
- **ShopProfile**: Single profile per shop, used by all users in that shop
- **Permissions**: Stored in separate collection, referenced in User via Mongoose populate

### File Uploads
- **Location**: `server/routes/invoices.js` (PDF handling)
- **Storage**: `server/uploads/invoices/` (static served at `/uploads/invoices/`)
- **Libraries**: `multer` (upload), `pdfkit` (PDF generation)

### OCR (Optical Character Recognition) - Invoice Auto-Capture
- **Purpose**: Extract invoice data automatically from uploaded photos/documents
- **Service**: `bms-frontend-ts/src/services/ocrService.ts` - OCR text extraction & parsing
- **Component**: `bms-frontend-ts/src/components/Invoices/OCRUpload.tsx` - Upload UI with preview
- **Library**: `tesseract.js` (browser-side OCR processing)
- **Extracted fields**: Invoice number, date, due date, amount
- **Confidence scoring**: Calculation based on completeness (0-100%)
- **Integration**: Auto-fills InvoiceForm fields when data is extracted
- **Performance note**: OCR processing takes 30-60 seconds (client-side)

### Dashboard & Analytics
- Multiple dashboard versions exist: `DashboardV2.tsx`, `DashboardV3.tsx`
- Uses `chart.js` with `react-chartjs-2` for visualizations
- **Key metrics**: Due amounts (suppliers & customers), payment status summaries

## Debugging Tips

### Common Issues
1. **401 errors**: Check JWT_SECRET matches between frontend and backend, verify token format
2. **Build path errors**: Server must serve from `../bms-frontend-ts/build/` (not `../build/`)
3. **CORS errors**: Verify `server.js` includes `http://localhost:3001` in cors origins
4. **Token not persisting**: Ensure localStorage API is available (check privacy/incognito mode)
5. **Permissions not working**: Confirm middleware chains are `[auth, authorize([...])]` in correct order

### Debug Output
- Backend logs decoded token/permissions in `middleware/auth.js` with `console.log()`
- Frontend token refresh logged in `UserContext.tsx`
- API errors logged in `services/api.ts` error handler

## File Organization Reference
- **Backend routes**: `server/routes/*.js` (one per entity)
- **Backend models**: `server/models/*.js` (Mongoose schemas)
- **Frontend components**: `bms-frontend-ts/src/components/[Feature]/`
- **Frontend services**: `bms-frontend-ts/src/services/` (API calls by entity)
- **Shared types**: `bms-frontend-ts/src/types/models.ts`

## When Modifying Features
1. Check if entity exists in `server/models/` (schema definition)
2. Add/update route in `server/routes/[entity].js`
3. Apply permission checks with `authorize()` middleware
4. Create corresponding service in `bms-frontend-ts/src/services/[entity]Service.ts`
5. Update type definitions in `models.ts` if schema changes
6. Wrap protected components with `<PrivateRoute permission="...">`
