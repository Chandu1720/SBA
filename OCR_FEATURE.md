# Invoice Auto-Capture Feature (OCR)

## Overview
This feature allows users to upload a photo or scan of an invoice document. The system uses **Optical Character Recognition (OCR)** to automatically extract key data and populate the invoice form.

## How It Works

### 1. User Flow
1. User opens "Create Invoice" form
2. Sees **"Upload Invoice Photo"** section at the top
3. Uploads/drags image (JPG, PNG)
4. System processes image (30-60 seconds) using Tesseract.js
5. Extracted data appears in preview with confidence score
6. Form fields auto-fill with extracted values
7. User reviews and adjusts as needed
8. Saves invoice

### 2. Data Extraction Process
The `ocrService.ts` performs three steps:

1. **OCR Recognition**: Tesseract.js extracts all text from image
2. **Pattern Matching**: Regex patterns identify:
   - Invoice/Bill numbers (e.g., "INV-2025-001")
   - Dates (DD/MM/YYYY, YYYY-MM-DD, etc.)
   - Amounts (₹, RS, INR currency symbols)
3. **Data Normalization**: Converts extracted values to proper formats:
   - Dates → YYYY-MM-DD
   - Amounts → Number

### 3. Confidence Scoring
Score based on fields successfully extracted:
- Invoice number: +25 points
- Date: +25 points
- Amount: +30 points
- Due date: +20 points
- **Max**: 100 points

**User feedback**:
- ✓ **70%+**: Success toast - data is reliable
- ⚠️ **40-70%**: Warning toast - verify fields before saving
- ❌ **<40%**: Error - insufficient data extracted

## File Structure

```
bms-frontend-ts/
├── src/
│   ├── services/
│   │   └── ocrService.ts              # OCR logic & text parsing
│   └── components/Invoices/
│       ├── OCRUpload.tsx              # Upload UI component
│       └── InvoiceForm.tsx            # Integrated with OCR
```

## Component APIs

### OCRUpload Component
```tsx
<OCRUpload 
  onDataExtracted={(data: ExtractedInvoiceData, file: File) => {
    // Auto-fill form with extracted data
    // Store file for upload
  }}
  disabled={false}
/>
```

### ocrService Functions

#### `extractTextFromImage(file: File)`
Extracts raw text from image using Tesseract.js.
```ts
const { text, confidence } = await extractTextFromImage(imageFile);
```

#### `parseInvoiceText(text: string)`
Parses extracted text for invoice fields.
```ts
const data = parseInvoiceText(ocrText);
// Returns: { supplierInvoiceNumber, invoiceDate, amount, dueDate }
```

#### `calculateConfidenceScore(data: ExtractedInvoiceData)`
Calculates extraction confidence (0-100).
```ts
const score = calculateConfidenceScore(extractedData); // e.g., 75
```

## Supported Invoice Formats

### Invoice Number Patterns
- `INV-2025-001`
- `Invoice No: INV/2025/001`
- `Bill # B-25-0001`
- Similar variations with letters and numbers

### Date Formats
- `DD/MM/YYYY` (e.g., `15/01/2025`)
- `DD-MM-YYYY` (e.g., `15-01-2025`)
- `YYYY-MM-DD` (e.g., `2025-01-15`)
- With or without leading zeros

### Amount Patterns
- `₹ 5000.50`
- `Amount: ₹5000.50`
- `Total RS. 5000`
- `Grand Total: INR 5000.50`
- Plain numbers for context (e.g., `5000`)

## Limitations & Known Issues

1. **OCR Accuracy**: Depends on image quality
   - Clear, well-lit photos work best
   - Blurry or tilted images may extract incorrectly
   - Handwritten invoices may not work well

2. **Processing Time**: 30-60 seconds due to browser-side OCR
   - No server upload needed (privacy benefit)
   - User sees progress indicator

3. **Field Coverage**: Only extracts basic fields
   - Invoice number, date, amount, due date
   - Does not extract: line items, taxes, supplier details
   - User must manually enter these

4. **Language**: Currently supports English text only

## Testing the Feature

### Test Images Recommended
1. **Clear photo**: Well-lit, straight invoice photo
2. **Screen shot**: Screenshot of PDF invoice
3. **Blurry image**: Test error handling
4. **Handwritten**: Expected to fail gracefully

### Test Cases
- ✅ Extract data, verify accuracy, submit
- ✅ Partial extraction (≥40% confidence), correct and submit
- ✅ Low extraction (<40%), fill manually
- ⚠️ Drag-drop file
- ⚠️ File size validation (>5MB rejected)
- ⚠️ Invalid file type rejection

## Future Enhancements

1. **Multi-language OCR**: Support invoices in Hindi, other regional languages
2. **Line Item Extraction**: Auto-detect product rows and quantities
3. **Tax & Discount Parsing**: Extract GST, discounts, other charges
4. **Supplier Auto-Match**: Match extracted supplier name to database
5. **Batch Processing**: Process multiple invoices at once
6. **Server-side OCR**: Better accuracy using dedicated OCR service
7. **Template Learning**: Learn common invoice layouts for better extraction

## Dependencies

```json
{
  "tesseract.js": "^5.x.x"
}
```

Installed via: `npm install tesseract.js`

## Usage Example

```tsx
import OCRUpload from './components/Invoices/OCRUpload';

export const InvoiceForm = () => {
  const handleDataExtracted = (data, file) => {
    setSupplierInvoiceNumber(data.supplierInvoiceNumber);
    setInvoiceDate(data.invoiceDate);
    setAmount(data.amount);
    setInvoiceFile(file);
  };

  return (
    <form>
      <OCRUpload onDataExtracted={handleDataExtracted} />
      {/* Rest of form fields */}
    </form>
  );
};
```

## Debugging

### Enable Debug Logs
Check browser console for OCR progress:
```
OCR Progress: 25%
OCR Progress: 50%
OCR Progress: 75%
OCR Progress: 100%
```

### Common Errors
- **"OCR failed"**: Image file corrupted or unsupported format
- **"Failed to read file"**: File reading error (permissions)
- **Confidence < 40%**: Image text not clear enough for extraction

### Performance Optimization
- OCR runs on worker thread (doesn't block UI)
- User can close form while processing (would lose state)
- Consider adding "Save & Continue" for large forms

---

**Last Updated**: January 2025
**Feature Status**: Production Ready
