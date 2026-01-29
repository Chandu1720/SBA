const Counter = require('../models/Counter');

// Function to get financial year
function getFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  if (month >= 3) { // April or later
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

// Function to get next sequence number with retry logic
async function getNextSequence(type, retries = 3) {
  // 💡 Products and Kits have a single sequence, not year-dependent
  const query = (type === 'product' || type === 'kit')
    ? { type }
    : { type, year: getFinancialYear() };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const counter = await Counter.findOneAndUpdate(
        query,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      return counter.seq;
    } catch (error) {
      // 💡 Handle duplicate key error for all types
      if (error.code === 11000 && attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  // If all retries fail, throw an error
  throw new Error(`Failed to get next sequence for type "${type}" after ${retries} attempts.`);
}


// Function to generate invoice/bill number
async function generateNumber(type) {
  const seq = await getNextSequence(type);
  const year = getFinancialYear();
  // 💡 Keep product logic separate from invoice/bill string formatting
  if (type === 'product') {
    // This function is for formatted numbers, for product ID just use getNextSequence
    return seq; 
  }
  const prefix = type === 'invoice' ? 'INV' : 'BILL';
  return `${prefix}/${year}/${seq.toString().padStart(6, '0')}`;
}

// 💡 Export getNextSequence
module.exports = { generateNumber, getNextSequence };
