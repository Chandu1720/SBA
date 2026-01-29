require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Permission = require('./models/Permission');
const ShopProfile = require('./models/ShopProfile');

const MONGO_URI = process.env.MONGO_URI;

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding');

    // Define permissions
    const permissions = [
      { name: 'users:view', description: 'View users' },
      { name: 'users:create', description: 'Create users' },
      { name: 'users:edit', description: 'Edit users' },
      { name: 'users:delete', description: 'Delete users' },
      { name: 'suppliers:view', description: 'View suppliers' },
      { name: 'suppliers:create', description: 'Create suppliers' },
      { name: 'suppliers:edit', description: 'Edit suppliers' },
      { name: 'suppliers:delete', description: 'Delete suppliers' },
      { name: 'bills:view', description: 'View bills' },
      { name: 'bills:create', description: 'Create bills' },
      { name: 'bills:edit', description: 'Edit bills' },
      { name: 'bills:delete', description: 'Delete bills' },
      { name: 'invoices:view', description: 'View invoices' },
      { name: 'invoices:create', description: 'Create invoices' },
      { name: 'invoices:edit', description: 'Edit invoices' },
      { name: 'invoices:delete', description: 'Delete invoices' },
      { name: 'shop-profile:view', description: 'View shop profile' },
      { name: 'shop-profile:edit', description: 'Edit shop profile' },
      { name: 'products:view', description: 'View products' },
      { name: 'products:create', description: 'Create products' },
      { name: 'products:update', description: 'Update products' },
      { name: 'products:delete', description: 'Delete products' },
      { name: 'kits:view', description: 'View kits' },
      { name: 'kits:create', description: 'Create kits' },
      { name: 'kits:edit', description: 'Edit kits' },
      { name: 'kits:delete', description: 'Delete kits' },
      // Add other permissions as needed

    ];

    // Clear existing permissions and create new ones
    await Permission.deleteMany({});
    const createdPermissions = await Permission.insertMany(permissions);
    console.log('Permissions created successfully');

    // Clear existing users
    await User.deleteMany({});

    // Find the first shop profile to associate with the admin user
    const shopProfile = await ShopProfile.findOne();
    if (!shopProfile) {
      console.error('Could not find a shop profile. Please create one before seeding users.');
      mongoose.connection.close();
      return;
    }

    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@bms.com',
      password: 'Admin@123',
      role: 'Admin',
      permissions: createdPermissions.map(p => p._id),
      shop: shopProfile._id,
    });
    await adminUser.save();
    console.log('Admin user created successfully');

  } catch (err) {
    console.error(err.message);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

seedDatabase();