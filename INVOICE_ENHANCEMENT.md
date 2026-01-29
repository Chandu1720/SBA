# Invoice Enhancement - Supplier Invoice Number & File Management

## Changes Made

### 1. **Backend - Invoice Schema** (`models/Invoice.js`)
- Added `supplierInvoiceNumber: String` field to store the supplier's actual invoice number
- Added `createdAt` and `updatedAt` timestamps
- Both fields are optional to support existing invoices

### 2. **Backend - Invoice Routes** (`routes/invoices.js`)
- **Updated Joi Schemas**: Added `supplierInvoiceNumber` field to both create and update schemas
- **Enhanced POST Handler**: Included `supplierInvoiceNumber` in form data conversion
- **Added Download Endpoint**: `GET /api/invoices/:id/download`
  - Authenticates user with permission check
  - Validates invoice exists and has file
  - Downloads file with proper filename: `Invoice-{invoiceNumber}.pdf`

- **Added View Endpoint**: `GET /api/invoices/:id/file`
  - Authenticates user with permission check
  - Sets proper Content-Type based on file extension (pdf, jpg, png)
  - Streams file inline for browser viewing
  - Supports pdf, jpg, jpeg, png formats

- **Added fs Import**: For file system operations

### 3. **Frontend - Types** (`src/types/models.ts`)
- Added `supplierInvoiceNumber?: string` field to Invoice interface
- Added `updatedAt?: string` timestamp

### 4. **Frontend - Invoice Form** (`src/components/Invoices/InvoiceForm.tsx`)
- Added state for `supplierInvoiceNumber`
- Added new form field with icon for supplier invoice number input
- Positioned between supplier selection and invoice date
- Updated form data submission to include `supplierInvoiceNumber`
- Updated edit mode to populate the field when editing

### 5. **Frontend - Invoices List** (`src/components/Invoices/Invoices.tsx`)
- **Desktop Table**:
  - Renamed "Invoice Number" to "System Invoice #"
  - Added new column "Supplier Invoice #" 
  - Shows supplier's invoice number (or "-" if empty)
  
- **Action Buttons**:
  - Added **View File Button** (FileText icon, purple)
    - Opens invoice file in browser new tab for viewing
    - Only shows if invoice has a file
  - Added **Download File Button** (Download icon, indigo)
    - Downloads invoice file with proper name
    - Only shows if invoice has a file
  
- **Mobile Cards**:
  - Shows supplier invoice number under system number
  - Added view and download buttons for files
  - Maintains responsive layout

## Frontend API Endpoints

```
GET  /api/invoices/:id/file        - View/preview invoice file in browser
GET  /api/invoices/:id/download    - Download invoice file
```

## Features

✅ **Supplier Invoice Number Storage**
- Separate field for supplier's invoice number from system-generated number
- Helps with invoice reconciliation and tracking

✅ **File Upload & Management**
- Upload invoice copy during creation
- File stored in `/uploads/invoices/` directory

✅ **File Viewing**
- Click FileText icon to view PDF, JPG, PNG in browser
- Opens in new tab for non-intrusive viewing

✅ **File Download**
- Click Download icon to download invoice file
- Downloaded with meaningful name: `Invoice-{invoiceNumber}.pdf`

✅ **Both Desktop & Mobile**
- Full functionality on desktop table view
- Complete feature set on mobile cards

## User Permissions

Both view and download operations require:
- Authentication (valid JWT token)
- Permission: `invoices:view`

## File Types Supported

- PDF (application/pdf)
- JPEG (image/jpeg)
- PNG (image/png)
