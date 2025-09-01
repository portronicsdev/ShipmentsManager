const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('./config');
const User = require('./models/User');
const Product = require('./models/Product');

const connectDB = require('./db');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    
    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin'
    });
    
    console.log('Created admin user:', adminUser.email);

    // Create sample products
    const sampleProducts = [
      {
        sku: 'PROD001',
        name: 'Sample Product 1',
        description: 'This is a sample product for testing',
        category: 'Electronics',
        createdBy: adminUser._id
      },
      {
        sku: 'PROD002',
        name: 'Sample Product 2',
        description: 'Another sample product for testing',
        category: 'Clothing',
        createdBy: adminUser._id
      }
    ];

    const products = await Product.create(sampleProducts);
    console.log(`Created ${products.length} sample products`);

    console.log('Database seeding completed successfully!');
    console.log('Admin credentials: admin@example.com / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

// Run seeder if this file is executed directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
