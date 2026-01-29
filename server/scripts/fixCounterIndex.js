const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bms";

async function fixCounterIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop the counters collection to remove old bad indexes
    try {
      await db.collection('counters').drop();
      console.log('✓ Dropped counters collection');
    } catch (err) {
      if (err.message.includes('ns not found')) {
        console.log('ℹ Counters collection does not exist (creating new)');
      } else {
        console.log('ℹ Error dropping collection:', err.message);
      }
    }

    // Create the collection with proper indexes manually
    const countersCollection = db.collection('counters');
    
    // Drop existing indexes except the default _id
    try {
      const indexes = await countersCollection.getIndexes();
      for (const indexName of Object.keys(indexes)) {
        if (indexName !== '_id_') {
          await countersCollection.dropIndex(indexName);
          console.log(`✓ Dropped old index: ${indexName}`);
        }
      }
    } catch (err) {
      console.log('ℹ No indexes to drop');
    }

    // Create new sparse unique index
    await countersCollection.createIndex(
      { type: 1, year: 1 },
      { unique: true, sparse: true }
    );
    console.log('✓ Created sparse unique index on type and year');

    console.log('\n✅ Counter index migration completed successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

fixCounterIndex();
