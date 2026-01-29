require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const MONGO_URI = process.env.MONGO_URI;

const addKitPermissions = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    // Define kit permissions
    const kitPermissions = [
      { name: 'kits:view', description: 'View kits' },
      { name: 'kits:create', description: 'Create kits' },
      { name: 'kits:edit', description: 'Edit kits' },
      { name: 'kits:delete', description: 'Delete kits' },
    ];

    // Check if kit permissions already exist
    for (const perm of kitPermissions) {
      const exists = await Permission.findOne({ name: perm.name });
      if (!exists) {
        const newPerm = new Permission(perm);
        await newPerm.save();
        console.log(`✓ Created permission: ${perm.name}`);
      } else {
        console.log(`✓ Permission already exists: ${perm.name}`);
      }
    }

    console.log('\nKit permissions setup complete!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

addKitPermissions();
