const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { generateNumber } = require('../utils/numberGenerator');
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bms";

async function testCounterGeneration() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    console.log('\n🧪 Testing counter generation...\n');

    // Test generating invoice numbers
    console.log('📋 Generating Invoice Numbers:');
    for (let i = 0; i < 3; i++) {
      const invNum = await generateNumber('invoice');
      console.log(`  Invoice ${i + 1}: ${invNum}`);
    }

    // Test generating bill numbers
    console.log('\n💰 Generating Bill Numbers:');
    for (let i = 0; i < 3; i++) {
      const billNum = await generateNumber('bill');
      console.log(`  Bill ${i + 1}: ${billNum}`);
    }

    console.log('\n✅ Counter generation test completed successfully!');
    console.log('No E11000 errors - duplicate key issue is fixed!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

testCounterGeneration();
