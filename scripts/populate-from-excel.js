const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
require('dotenv').config();

// Import models
const SuperCategory = require('../server/models/SuperCategory');
const Category = require('../server/models/Category');
const Product = require('../server/models/Product');
const User = require('../server/models/User');

// Database connection
const connectDB = async () => {
  try {
    console.log("MongoDB URI:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipments-manager', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Read Excel file
const readExcelFile = (filePath) => {
  try {
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found: ${filePath}`);
    }
    
    const workbook = xlsx.readFile(filePath);
    
    // Read the first/default sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Read ${data.length} rows from "${sheetName}" sheet`);
    console.log(`📋 Available sheets in Excel: ${workbook.SheetNames.join(', ')}`);
    
    // Show sample of data for verification
    if (data.length > 0) {
      console.log(`📝 Sample data (first row):`, Object.keys(data[0]));
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error reading Excel file:', error);
    throw error;
  }
};

// Clean and validate data
const cleanData = (data) => {
  if (data.length === 0) {
    console.log('⚠️ No data to clean');
    return [];
  }
  
  // Find the correct column names (handle variations with \r\n)
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  
  const skuCol = columns.find(col => col.toLowerCase().includes('sku'));
  const productCol = columns.find(col => col.toLowerCase().includes('product') && !col.toLowerCase().includes('short'));
  const categoryCol = columns.find(col => col.toLowerCase().includes('category') && !col.toLowerCase().includes('super'));
  const superCategoryCol = columns.find(col => col.toLowerCase().includes('super') && col.toLowerCase().includes('category'));
  const originCol = columns.find(col => col.toLowerCase().includes('origin'));
  
  const cleanedData = data.map(row => ({
    sku: row[skuCol]?.toString().trim().toUpperCase(),
    productName: row[productCol]?.toString().trim(),
    category: row[categoryCol]?.toString().trim(),
    superCategory: row[superCategoryCol]?.toString().trim(),
    origin: row[originCol]?.toString().trim()
  })).filter(row => 
    row.sku && 
    row.productName && 
    row.category && 
    row.superCategory
  );
  
  console.log(`🧹 Cleaned data: ${cleanedData.length} valid rows`);
  
  return cleanedData;
};

// Create super categories
const createSuperCategories = async (data) => {
  const superCategories = [...new Set(data.map(row => row.superCategory))];
  const createdSuperCategories = {};
  
  console.log(`🏷️ Found ${superCategories.length} unique super categories`);
  
  for (const superCategoryName of superCategories) {
    try {
      // Check if super category already exists
      let superCategory = await SuperCategory.findOne({ name: superCategoryName });
      
      if (!superCategory) {
        superCategory = new SuperCategory({ name: superCategoryName });
        await superCategory.save();
        console.log(`✅ Created super category: ${superCategoryName}`);
      } else {
        console.log(`ℹ️ Super category already exists: ${superCategoryName}`);
      }
      
      createdSuperCategories[superCategoryName] = superCategory._id;
    } catch (error) {
      console.error(`❌ Error creating super category ${superCategoryName}:`, error.message);
    }
  }
  
  return createdSuperCategories;
};

// Create categories
const createCategories = async (data, superCategoryMap) => {
  const categoryMap = new Map();
  
  // Group categories by super category
  const categoriesBySuperCategory = {};
  data.forEach(row => {
    const key = `${row.superCategory}|${row.category}`;
    if (!categoriesBySuperCategory[key]) {
      categoriesBySuperCategory[key] = {
        name: row.category,
        superCategoryId: superCategoryMap[row.superCategory]
      };
    }
  });
  
  const categories = Object.values(categoriesBySuperCategory);
  console.log(`📂 Found ${categories.length} unique categories`);
  
  for (const categoryData of categories) {
    try {
      // Check if category already exists
      let category = await Category.findOne({ 
        name: categoryData.name, 
        superCategoryId: categoryData.superCategoryId 
      });
      
      if (!category) {
        category = new Category(categoryData);
        await category.save();
        console.log(`✅ Created category: ${categoryData.name} (${categoryData.superCategoryId})`);
      } else {
        console.log(`ℹ️ Category already exists: ${categoryData.name}`);
      }
      
      categoryMap.set(categoryData.name, category._id);
    } catch (error) {
      console.error(`❌ Error creating category ${categoryData.name}:`, error.message);
    }
  }
  
  return categoryMap;
};

// Create products
const createProducts = async (data, categoryMap) => {
  console.log(`📦 Creating ${data.length} products...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Get a default user (you might want to change this)
  let defaultUser;
  try {
    defaultUser = await User.findOne();
    if (!defaultUser) {
      console.log('⚠️ No users found. Creating products without createdBy field.');
    }
  } catch (error) {
    console.log('⚠️ Could not find user. Creating products without createdBy field.');
  }
  
  for (const row of data) {
    try {
      // Check if product already exists
      const existingProduct = await Product.findOne({ sku: row.sku });
      
      if (existingProduct) {
        console.log(`ℹ️ Product already exists: ${row.sku}`);
        continue;
      }
      
      const categoryId = categoryMap.get(row.category);
      if (!categoryId) {
        console.error(`❌ Category not found for product ${row.sku}: ${row.category}`);
        errorCount++;
        continue;
      }
      
      const productData = {
        sku: row.sku,
        productName: row.productName,
        origin: row.origin || null,
        categoryId: categoryId,
        isActive: true
      };
      
      // Add createdBy if user exists
      if (defaultUser) {
        productData.createdBy = defaultUser._id;
      }
      
      const product = new Product(productData);
      await product.save();
      
      console.log(`✅ Created product: ${row.sku} - ${row.productName}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error creating product ${row.sku}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Product creation summary:`);
  console.log(`✅ Successfully created: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total processed: ${data.length}`);
};

// Main function
const populateDatabase = async () => {
  try {
    console.log('🚀 Starting database population from Excel...\n');
    
    // Connect to database
    await connectDB();
    
    // Read Excel file (you need to update this path)
    const excelFilePath = path.join(__dirname, 'products.xlsx');
    console.log(`📁 Reading Excel file: ${excelFilePath}`);
    
    const rawData = readExcelFile(excelFilePath);
    
    // Clean and validate data
    const cleanDataArray = cleanData(rawData);
    console.log(`🧹 Cleaned data: ${cleanDataArray.length} valid rows\n`);
    
    if (cleanDataArray.length === 0) {
      console.log('❌ No valid data found in Excel file');
      return;
    }
    
    // Create super categories first
    console.log('🏷️ Creating super categories...');
    const superCategoryMap = await createSuperCategories(cleanDataArray);
    console.log('');
    
    // Create categories
    console.log('📂 Creating categories...');
    const categoryMap = await createCategories(cleanDataArray, superCategoryMap);
    console.log('');
    
    // Create products
    console.log('📦 Creating products...');
    await createProducts(cleanDataArray, categoryMap);
    
    console.log('\n🎉 Database population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database population:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  populateDatabase();
}

module.exports = { populateDatabase };
