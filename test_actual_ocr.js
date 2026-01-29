// Test with ACTUAL OCR text from your invoice
const actualOCRText = `A a
\% He
JAWAHAR AUTO NAGAR, PLOT roal SHRIKA sERVICES
State proXIX BLOCK, 1 F1-OOR., VIIAYAWADA, KRIZHNA, 520002, AP, India
GSTIN No: 37q00€:37 Contagy 307! 12342,
Authorized Her or XPD1386Ci275, an NO: AFXPDIIS6G
Gettin uy yor: Hero MotoCorp Lid.
TAX INy (ICE wo
Credit
Customer Code S00555-02-RC-122
Customer Name: SRI SALBALAJ] Invoice Ny, S00555BA26P6062 Date: 03/01/2026 10:55:28
AUTOMOBILES Order No, S00555-00-PSA0-0126- Date: 03/01/2026 10:06:36
Place of Supply AP,37 6391
Address: JANARDHANAVARAM
4 ROAD
CHATRAI
CHATRAL
AP, +
521214
State Code: 37
Mobile#: 9849443359
ASH Sules Execyive: ~~ MUSTAKHIL BEG MD
PAN:
Sub Total 9,193.44
Net Amount 10,848.26
Round Off -026
Net Amount(After Round Off) 10,848.00
Invoice Number: "0055SBA26P6062
Page 1 of 2`;

const invoiceNumberPatterns = [
  /invoice\s+(?:ny|no)\.?\s*[,:]?\s*["]?([A-Z0-9]+?)(?:\s|$|")/i,       // Invoice Ny, "0055SBA26P6062
  /invoice\s+number\s*:?\s*["]?([A-Z0-9\-\/]+?)(?:\s|$|")/i,            // Invoice Number: "0055SBA26P6062
  /invoice\s*(?:no|ny)\.?\s*:?\s*["]?([A-Z0-9]+)/i,                     // Invoice No:0055SBA26P6062
  /inv\.?\s+(?:no|ny)\.?\s*:?\s*["]?([A-Z0-9\-\/]+)/i,                 // Inv No or Inv Ny
];

console.log('Testing with ACTUAL OCR text from your Hero invoice\n');

let extracted = null;
for (const pattern of invoiceNumberPatterns) {
  const match = actualOCRText.match(pattern);
  console.log(`Pattern: ${pattern}`);
  console.log(`Match: ${match ? match[1] : 'NO MATCH'}\n`);
  
  if (match && match[1]) {
    let num = match[1].trim().replace(/[^A-Z0-9\-\/]/gi, '');
    num = num.replace(/[\-\/]+$/, '');
    console.log(`Candidate: ${num}`);
    
    if (num.length >= 4 && num.length <= 30 && !num.match(/^(buyer|order|po|purchase|ack|arn|irn|gst|hsn|customer|credit|description|part)/i)) {
      extracted = num;
      console.log(`✓ EXTRACTED: ${extracted}\n`);
      break;
    } else {
      console.log(`✗ Rejected\n`);
    }
  }
}

if (!extracted) {
  console.log('FAILED - No invoice number found');
} else {
  console.log(`\n=== FINAL RESULT ===`);
  console.log(`Invoice Number: ${extracted}`);
}
