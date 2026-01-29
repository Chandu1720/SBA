# Invoice Auto-Capture Feature - Architecture & Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│         FRONTEND (React TypeScript)                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │       InvoiceForm.tsx                              │ │
│  │  (Create Invoice - /invoices/new)                 │ │
│  │                                                    │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │ OCRUpload.tsx Component                      │ │ │
│  │  │ ────────────────────────────────────────────│ │ │
│  │  │ • Drag-drop upload area                     │ │ │
│  │  │ • File validation (type, size)             │ │ │
│  │  │ • Image preview                             │ │ │
│  │  │ • Progress indicator (30-60s)               │ │ │
│  │  │ • Extracted data display                    │ │ │
│  │  │ • Confidence score visualization            │ │ │
│  │  │ • Raw text viewer (debug)                   │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                    ↓                               │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │ Form Fields (Auto-filled by OCR)            │ │ │
│  │  │ ────────────────────────────────────────────│ │ │
│  │  │ Supplier (manual)                            │ │ │
│  │  │ Invoice Number (← OCR extracted)            │ │ │
│  │  │ Invoice Date (← OCR extracted)              │ │ │
│  │  │ Due Date (← OCR extracted)                  │ │ │
│  │  │ Amount (← OCR extracted)                    │ │ │
│  │  │ Payment Status (manual)                      │ │ │
│  │  │ Notes (manual)                               │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
           ↓ (Submit Form with Extracted Data)
┌─────────────────────────────────────────────────────────┐
│           BACKEND (Express.js + MongoDB)                │
│                                                          │
│  POST /api/invoices                                    │
│  ├─ Validate supplier, dates, amount                  │
│  ├─ Check permissions (invoices:create)               │
│  ├─ Store in MongoDB                                  │
│  └─ Return created invoice with ID                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Data Flow - OCR Processing Pipeline

```
USER UPLOADS IMAGE
       ↓
┌──────────────────────────────────────────────────────────┐
│ File Validation (OCRUpload.tsx)                          │
│ • Check: JPG/PNG only                                    │
│ • Check: Size < 5MB                                      │
│ ✓ Pass → Continue | ✗ Fail → Show Error Toast           │
└──────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────┐
│ Image Preview (OCRUpload.tsx)                            │
│ • Read file as Data URL                                  │
│ • Display thumbnail                                      │
│ • Show progress spinner                                  │
└──────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────┐
│ OCR Processing (ocrService.extractTextFromImage)        │
│ • Load Tesseract.js                                      │
│ • Process image with OCR engine                          │
│ • Extract raw text + confidence                          │
│ ⏱️  30-60 seconds (first time: download language files)  │
└──────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────┐
│ Text Parsing (ocrService.parseInvoiceText)              │
│                                                          │
│ Apply Regex Patterns:                                    │
│ ┌────────────────────────────────────────────────────┐  │
│ │ INVOICE NUMBER:                                     │  │
│ │ • Patterns: INV-XXXX, Invoice No:, Bill #, etc.   │  │
│ │ • Result: "INV-2025-001" or "INV/25/0123"         │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ DATES:                                              │  │
│ │ • Patterns: DD/MM/YYYY, YYYY-MM-DD, etc.          │  │
│ │ • Normalize: → YYYY-MM-DD format                   │  │
│ │ • Find 2 dates (invoice & due date)                │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ AMOUNT:                                             │  │
│ │ • Patterns: ₹5000, RS. 5000, Total: 5000           │  │
│ │ • Result: Numeric value (5000.50)                  │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Calculate Confidence Score:                              │
│ • Invoice # found: +25%                                 │
│ • Date found: +25%                                      │
│ • Amount found: +30%                                    │
│ • Due date found: +20%                                  │
│ • Total: 0-100%                                         │
└──────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────┐
│ Display Results & Feedback (OCRUpload.tsx)              │
│                                                          │
│ ✓ Confidence ≥ 70%: Success Toast + Green Preview       │
│   "✓ Data extracted (82% confidence)"                   │
│                                                          │
│ ⚠️  40-70% Confidence: Warning Toast + Amber Preview     │
│   "⚠ Data extracted but verify fields (55%)"            │
│                                                          │
│ ❌ <40% Confidence: Error Toast + No Auto-fill          │
│   "❌ Could not extract data. Fill manually."            │
└──────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────┐
│ Auto-Fill Form Fields (handleOCRDataExtracted)          │
│                                                          │
│ supplierInvoiceNumber ← extracted value                 │
│ invoiceDate ← extracted value                           │
│ dueDate ← extracted value                               │
│ amount ← extracted value                                │
│ invoiceFile ← image file (for document upload)         │
└──────────────────────────────────────────────────────────┘
       ↓
USER REVIEWS & CORRECTS FIELDS
       ↓
USER SUBMITS FORM
       ↓
INVOICE SAVED TO DATABASE
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   InvoiceForm                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ State:                                             │  │
│  │ • supplierId, invoiceDate, dueDate                │  │
│  │ • amount, paymentStatus, invoiceFile              │  │
│  │                                                    │  │
│  │ Functions:                                         │  │
│  │ • handleSubmit() → API call                        │  │
│  │ • handleOCRDataExtracted() → setState              │  │
│  └───────────────────────────────────────────────────┘  │
│         ↑                                    ↓           │
│         │                                    │           │
│         │                         ┌──────────────────┐   │
│         │                         │ OCRUpload        │   │
│         │                         ├──────────────────┤   │
│         │                         │ Props:           │   │
│         │                         │ • onDataExtracted│   │
│         │                         │ • disabled       │   │
│         │                         │                  │   │
│         │                         │ State:           │   │
│         │                         │ • previewUrl     │   │
│         │                         │ • extractedData  │   │
│         │                         │ • isProcessing   │   │
│         │                         │ • rawText        │   │
│         │                         │                  │   │
│         └─ extracted data ────────│ onDataExtracted()│   │
│                                   └──────────────────┘   │
│                                           ↓              │
│                                   ┌──────────────────┐   │
│                                   │ ocrService       │   │
│                                   ├──────────────────┤   │
│                                   │ Functions:       │   │
│                                   │ • extractText()  │   │
│                                   │ • parseText()    │   │
│                                   │ • calcConfidence │   │
│                                   └──────────────────┘   │
│                                           ↓              │
│                                   ┌──────────────────┐   │
│                                   │ Tesseract.js     │   │
│                                   │ (OCR Engine)     │   │
│                                   └──────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Extraction Pattern Examples

### Invoice Number Extraction
```
Raw Text from OCR:
"INVOICE NO: INV-2025-001234
Date: 15/01/2025
Total Amount: ₹5000.50"

Regex Patterns Applied:
Pattern 1: /(?:invoice|inv|no\.?|#)\s*:?\s*([A-Z0-9\-\/]+)/i
           ↓ MATCH
Extracted: "INV-2025-001234" ✓

Pattern 2: /^INV[A-Z0-9\-\/]*$/m
Pattern 3: /([A-Z]{2,}\-?\d{4,})/
(Fallbacks if Pattern 1 fails)
```

### Date Extraction
```
Raw Text:
"Date: 15/01/2025
Due: 30/01/2025"

Pattern: /(?:date|dated)\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i
         ↓ MATCHES
Extracted: "15/01/2025", "30/01/2025"

Normalization:
"15/01/2025" → "2025-01-15" (YYYY-MM-DD)
"30/01/2025" → "2025-01-30" (YYYY-MM-DD)
```

### Amount Extraction
```
Raw Text:
"Grand Total: ₹ 5000.50"

Pattern: /(?:total|amount)\s*:?\s*(?:₹|rs|inr)?\s*([\d,]+\.?\d*)/i
         ↓ MATCH
Extracted: "5000.50" → 5000.50 (Float) ✓

Confidence Scoring:
✓ Amount found: +30 points = 30%
```

## Confidence Scoring Example

### Scenario: Partial Extraction
```
Extracted Fields:
✓ Invoice Number: "INV-001" → +25
✓ Invoice Date: "2025-01-15" → +25
✓ Amount: "₹5000" → +30
✗ Due Date: Not found → +0

Total Score: (25+25+30+0) / 100 = 80%
UI Feedback: ✓ Success Toast - "Data extracted (80% confidence)"
```

### Scenario: Low Extraction
```
Extracted Fields:
✗ Invoice Number: Not found → +0
✓ Invoice Date: "2025-01-15" → +25
✓ Amount: "₹5000" → +30
✗ Due Date: Not found → +0

Total Score: (0+25+30+0) / 100 = 55%
UI Feedback: ⚠️ Warning Toast - "Verify fields before saving (55%)"
```

## File Dependencies

```
InvoiceForm.tsx
    ↓ imports
OCRUpload.tsx ←──────────┐
    ↓ imports            │
ocrService.ts            │
    ↓ imports            │
Tesseract.js (npm lib)   │
                         │
types/models.ts ← ExtractedInvoiceData
    ↓ used by
InvoiceForm.tsx ─────────┘
```

## Performance Timeline

```
User Action: Upload 2MB invoice photo
│
├─ 0ms: File validation
├─ 50ms: File read & display preview
├─ 100ms: OCR starts (Tesseract loads)
├─ 1-3s: Tesseract processes image
├─ 3-5s: Raw text extracted
├─ 10ms: Text parsing & pattern matching
├─ 10ms: Confidence scoring
├─ 20ms: State update & render
│
└─ Total: 30-60 seconds (mostly OCR processing)

User can:
✓ Review preview while processing
✓ See progress message
✓ View results after completion
✓ Edit form fields
```

---

**Diagram Created**: January 2025
**Architecture**: Client-side OCR (no server processing)
**Technology**: Tesseract.js (JavaScript OCR library)
