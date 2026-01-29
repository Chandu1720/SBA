// Test OCR parsing for invoice number
const text = `
SAI SHRIK AUTO Pvices
TAX INVOICE

Invoice No: 505553A2626062
Date: 03/01/2026

Net Amount (After Round Off): 10,848.00
`;

const invoiceNumberPatterns = [
  /invoice\s+no\.?\s*:?\s*([A-Z0-9]+)\s*(?:\n|$)/i,       
  /invoice\s+no\.?\s*:?\s*([A-Z0-9\-\/]+?)(?:\s|$)/i,     
  /invoice\s+no\.?\s*:?\s*(\d+)(?:\s|$)/i,                
  /^.*?invoice\s+no\.?\s*:?\s*([A-Z0-9\-\/]+?)\s*$/im,    
  /inv\.?\s+(?:no\.?|number)?\s*:?\s*([A-Z0-9\-\/]+)/i,   
];

let result = null;
for (const pattern of invoiceNumberPatterns) {
  const match = text.match(pattern);
  if (match && match[1]) {
    result = match[1];
    console.log('✓ Extracted Invoice Number:', result);
    break;
  }
}

if (!result) {
  console.log('✗ Failed to extract invoice number');
}
