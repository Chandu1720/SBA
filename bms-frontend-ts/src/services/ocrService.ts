import Tesseract from 'tesseract.js';

export interface ExtractedInvoiceData {
  supplierInvoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  amount?: number;
  confidence: number;
}

/**
 * Extract text from invoice image using OCR
 * @param file Image file to process
 * @returns Extracted text and confidence score
 */
export const extractTextFromImage = async (
  file: File
): Promise<{ text: string; confidence: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const imageSrc = e.target?.result as string;

        const result = await Tesseract.recognize(imageSrc, 'eng', {
          logger: (m) => {
            // Log progress silently
            if (m.status === 'recognizing') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        resolve({
          text: result.data.text,
          confidence: result.data.confidence,
        });
      } catch (error) {
        reject(new Error(`OCR failed: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Parse extracted invoice text and extract structured data
 * @param text Raw text from OCR
 * @returns Extracted invoice fields
 */
export const parseInvoiceText = (text: string): ExtractedInvoiceData => {
  const data: ExtractedInvoiceData = {
    confidence: 0.5, // Default confidence
  };

  if (!text) return data;

  // Clean text
  const fullText = text.toUpperCase();
  
  // DEBUG: Log raw OCR text for troubleshooting
  console.log('=== OCR RAW TEXT ===');
  console.log(text);
  console.log('=== END RAW TEXT ===');

  // Extract invoice/bill number from "Invoice No" or "Invoice Number" labels
  // Handles: alphanumeric (505553A2626062, SRI0555A2626962) AND numeric only (2045)
  // IMPORTANT: Prioritize "Invoice No" - avoid "Buyer Order No", "Ack No", "IRN" and other numbers
  const invoiceNumberPatterns = [
    /invoice\s+(?:ny|no)\.?\s*[,:]?\s*["]?([A-Z0-9]+?)(?:\s|$|")/i,       // Invoice Ny, "0055SBA26P6062 (handles OCR misreads like "Ny" instead of "No")
    /invoice\s+number\s*:?\s*["]?([A-Z0-9\-\/]+?)(?:\s|$|")/i,            // Invoice Number: "0055SBA26P6062
    /invoice\s*(?:no|ny)\.?\s*:?\s*["]?([A-Z0-9]+)/i,                     // Invoice No:0055SBA26P6062
    /inv\.?\s+(?:no|ny)\.?\s*:?\s*["]?([A-Z0-9\-\/]+)/i,                 // Inv No or Inv Ny
  ];

  for (const pattern of invoiceNumberPatterns) {
    const match = text.match(pattern);
    console.log(`Testing pattern: ${pattern} - Match: ${match ? match[1] : 'NO MATCH'}`);
    if (match && match[1]) {
      let num = match[1].trim().replace(/[^A-Z0-9\-\/]/gi, '');
      // Remove trailing special chars
      num = num.replace(/[\-\/]+$/, '');
      console.log(`Extracted candidate: ${num}`);
      // Skip if it looks like it's from unwanted fields (Buyer, Ack, IRN, Description, etc.)
      if (num.length >= 4 && num.length <= 30 && !num.match(/^(buyer|order|po|purchase|ack|arn|irn|gst|hsn|customer|credit|description|part)/i)) {
        data.supplierInvoiceNumber = num;
        console.log(`✓ Using invoice number: ${num}`);
        break;
      } else {
        console.log(`✗ Rejected: length=${num.length}, matched unwanted field or too short`);
      }
    }
  }
  
  if (!data.supplierInvoiceNumber) {
    console.log('⚠ No invoice number extracted');
  }

  // Extract dates - Multiple formats (Indian invoices use various date formats)
  // Handles: DD/MM/YYYY (03/01/2026), DD-Mon-YY (24-Dec-25), DD-MM-YYYY, etc.
  // Priority: "Dated:" (HBS) > "Date:" (HERO) > Generic patterns
  const datePatterns = [
    /dated\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,                      // Dated: 03/01/2026 (HBS format)
    /dated\s*:?\s*(\d{1,2}[-\/][A-Za-z]{3,}[-\/]\d{2,4})/i,              // Dated: 24-Dec-25 (HBS format)
    /(?:invoice\s+)?date\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,       // Invoice Date: 03/01/2026 or Date: 03/01/2026
    /(?:invoice\s+)?date\s*:?\s*(\d{1,2}[-\/][A-Za-z]{3,}[-\/]\d{2,4})/i, // Date: 24-Dec-25
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,                                    // DD/MM/YYYY anywhere
    /(\d{1,2}[-\/][A-Za-z]{3,}[-\/]\d{2,4})/,                             // DD-Mon-YYYY anywhere
  ];

  const extractedDates: string[] = [];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extractedDates.push(match[1]);
    }
  }

  // Remove duplicates using filter
  const seen = new Set<string>();
  const uniqueDates = extractedDates.filter((date) => {
    if (seen.has(date)) return false;
    seen.add(date);
    return true;
  });

  // Normalize and assign dates
  if (uniqueDates.length > 0) {
    data.invoiceDate = normalizeDateString(uniqueDates[0]);
  }
  if (uniqueDates.length > 1) {
    data.dueDate = normalizeDateString(uniqueDates[1]);
  }

  // Extract amount - Multiple invoice formats
  // Handles: "Rs. 15,050.00", "Net Amount (After Round Off)", "Total", etc.
  // Priority: "Net Amount (After Round Off)" (FINAL AMOUNT) > "Grand Total" > "Rs." patterns > Other patterns
  const amountPatterns = [
    /net\s+amount\s*\(?after\s+round(?:ed)?\s+off?\)?\s*:?\s*([0-9,]+\.?\d*)/i,  // Net Amount (After Round Off) - HIGHEST PRIORITY
    /net\s+amount\(after\s+round\s+off\)\s*:?\s*([0-9,]+\.?\d*)/i,               // Net Amount(After Round Off) - no spaces
    /grand\s+total\s*:?\s*(?:₹|rs\.?|inr)?\s*([0-9,]+\.?\d*)/i,                  // Grand Total
    /total\s*:?\s*(?:rs\.?)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,               // Total: Rs. 15,050.00
    /rs\.\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*$/im,                             // Rs. 15,050.00 at end of line
    /rs\.?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/i,                              // Rs. 15,050.00 anywhere
    /net\s+amount\s*(?:\(.*?\))?\s*:?\s*([0-9,]+\.?\d*)/i,                      // Net Amount (with any text)
    /₹\s*([0-9,]+\.?\d*)/,                                                       // ₹ symbol
  ];

  console.log('=== AMOUNT EXTRACTION ===');
  for (const pattern of amountPatterns) {
    const match = fullText.match(pattern);
    console.log(`Pattern: ${pattern} - Match: ${match ? match[1] : 'NO MATCH'}`);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      console.log(`Parsed amount: ${amount}`);
      if (amount > 0 && amount < 10000000) { // Reasonable invoice amount (< 1 crore)
        data.amount = Math.round(amount * 100) / 100;
        console.log(`✓ Using amount: ${data.amount}`);
        break;
      }
    }
  }
  console.log('=== END AMOUNT EXTRACTION ===');

  return data;
};

/**
 * Normalize date string to YYYY-MM-DD format
 */
const normalizeDateString = (dateStr: string): string => {
  let normalized = dateStr.trim().replace(/\s+/g, '');

  // Month name to number mapping
  const monthMap: { [key: string]: string } = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12',
  };

  // Try DD-Mon-YY format (24-Dec-25)
  const monMatch = normalized.match(/^(\d{1,2})[-\/]([A-Za-z]{3,})[-\/](\d{2,4})$/i);
  if (monMatch) {
    const [, day, monthStr, yearStr] = monMatch;
    const month = monthMap[monthStr.toLowerCase()];
    if (month) {
      const year = yearStr.length === 2 ? `20${yearStr}` : yearStr;
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = normalized.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  const ydmMatch = normalized.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (ydmMatch) {
    const [, year, month, day] = ydmMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try MM/DD/YYYY (US format as fallback)
  const mdyMatch = normalized.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (mdyMatch) {
    // Try to determine if it's DD/MM or MM/DD by checking if month > 12
    const [, first, second, year] = mdyMatch;
    const firstNum = parseInt(first);
    const secondNum = parseInt(second);
    
    if (firstNum > 12) {
      // Definitely DD/MM
      return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
    } else if (secondNum > 12) {
      // Definitely MM/DD, but we store as DD/MM for Indian invoices
      return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
    } else {
      // Ambiguous, assume DD/MM (Indian default)
      return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
    }
  }

  return '';
};

/**
 * Calculate confidence score based on extracted data completeness
 */
export const calculateConfidenceScore = (data: ExtractedInvoiceData): number => {
  let score = 0;
  let maxScore = 0;

  // Check each field
  if (data.supplierInvoiceNumber) score += 25;
  maxScore += 25;

  if (data.invoiceDate) score += 25;
  maxScore += 25;

  if (data.amount) score += 30;
  maxScore += 30;

  if (data.dueDate) score += 20;
  maxScore += 20;

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
};
