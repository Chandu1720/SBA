// Test amount extraction with actual OCR text
const actualOCRText = `Sub Total 9,193.44
CGST @ 9 % on Amount 9,193.44 827.41
SGST @ 9 % on Amount 9,193.44 827.41
Net Amount 10,848.26
Round Off -026
Net Amount(After Round Off) 10,848.00`;

const amountPatterns = [
  /net\s+amount\s*\(?after\s+round(?:ed)?\s+off?\)?\s*:?\s*([0-9,]+\.?\d*)/i,  
  /net\s+amount\(after\s+round\s+off\)\s*:?\s*([0-9,]+\.?\d*)/i,               
  /grand\s+total\s*:?\s*(?:₹|rs\.?|inr)?\s*([0-9,]+\.?\d*)/i,                  
  /total\s*:?\s*(?:rs\.?)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,               
  /rs\.\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*$/im,                             
  /rs\.?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/i,                              
  /net\s+amount\s*(?:\(.*?\))?\s*:?\s*([0-9,]+\.?\d*)/i,                      
  /₹\s*([0-9,]+\.?\d*)/,                                                       
];

console.log('=== TESTING AMOUNT EXTRACTION ===\n');

const fullText = actualOCRText.toUpperCase();
let extracted = null;

for (const pattern of amountPatterns) {
  const match = fullText.match(pattern);
  console.log(`Pattern: ${pattern}`);
  if (match) {
    console.log(`Match found: "${match[1]}"`);
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    console.log(`Parsed amount: ${amount}`);
    
    if (amount > 0 && amount < 10000000) {
      extracted = Math.round(amount * 100) / 100;
      console.log(`✓ EXTRACTED AMOUNT: ${extracted}\n`);
      break;
    } else {
      console.log(`✗ Amount out of range\n`);
    }
  } else {
    console.log(`No match\n`);
  }
}

if (!extracted) {
  console.log('FAILED - No amount extracted');
} else {
  console.log(`=== FINAL RESULT ===`);
  console.log(`Amount: ₹${extracted}`);
}
