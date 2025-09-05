const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');
const SuperCategory = require('../models/SuperCategory');
const User = require('../models/User');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/products
// @desc    Get all products
// @access  Public (temporarily for development)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('createdBy', 'name email')
      .populate({
        path: 'categoryId',
        select: 'name superCategoryId',
        populate: {
          path: 'superCategoryId',
          select: 'name'
        }
      });
    
    res.json({
      success: true,
      data: {
        products
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching products' 
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate({
        path: 'categoryId',
        select: 'name superCategoryId',
        populate: {
          path: 'superCategoryId',
          select: 'name'
        }
      });

    if (!product) {
      return res.status(404).json({ 
        message: 'Product not found' 
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching product' 
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Admin, Manager)
router.post('/', [
  protect,
  authorize('admin', 'manager'),
  body('sku')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('SKU must be between 1 and 20 characters'),
  body('productName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),
  body('masterCartonSize')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Master carton size cannot be more than 50 characters'),
  body('categoryId')
    .isMongoId()
    .withMessage('Valid category is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { sku, productName, masterCartonSize, categoryId } = req.body;
    console.log('Creating product with SKU:', sku);

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return res.status(400).json({ 
        message: 'Product with this SKU already exists' 
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ 
        message: 'Category not found' 
      });
    }

    // Create product
    const product = await Product.create({
      sku: sku.toUpperCase(),
      productName,
      masterCartonSize,
      categoryId,
      createdBy: req.user._id
    });

    // Populate the product with category info
    await product.populate('categoryId', 'name superCategoryId');
    await product.populate('categoryId.superCategoryId', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      message: 'Server error while creating product' 
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin, Manager)
router.put('/:id', [
  protect,
  authorize('admin', 'manager'),
  body('productName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),
  body('masterCartonSize')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Master carton size cannot be more than 50 characters'),
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Valid category is required'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ 
        message: 'Product not found' 
      });
    }

    // If categoryId is being updated, check if it exists
    if (req.body.categoryId) {
      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        return res.status(400).json({ 
          message: 'Category not found' 
        });
      }
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('categoryId', 'name superCategoryId')
    .populate('categoryId.superCategoryId', 'name');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      message: 'Server error while updating product' 
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ 
        message: 'Product not found' 
      });
    }

    // Soft delete - set isActive to false
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting product' 
    });
  }
});

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Helper functions for import
const cleanData = (data) => {
  if (data.length === 0) {
    return [];
  }
  
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
  })).filter(row => {
    const isValid = row.sku && 
      row.productName && 
      row.category && 
      row.superCategory;
    
    
    return isValid;
  });
  
  return cleanedData;
};

const createSuperCategories = async (data) => {
  const superCategories = [...new Set(data.map(row => row.superCategory))];
  const superCategoryMap = new Map();
  
  for (const superCategoryName of superCategories) {
    try {
      let superCategory = await SuperCategory.findOne({ name: superCategoryName });
      
      if (!superCategory) {
        superCategory = new SuperCategory({ name: superCategoryName });
        await superCategory.save();
      }
      
      superCategoryMap.set(superCategoryName, superCategory._id);
    } catch (error) {
      console.error(`Error creating super category ${superCategoryName}:`, error.message);
    }
  }
  
  return superCategoryMap;
};

const createCategories = async (data, superCategoryMap) => {
  const categories = [...new Set(data.map(row => ({ 
    name: row.category, 
    superCategoryId: superCategoryMap.get(row.superCategory) 
  })))];
  const categoryMap = new Map();
  
  for (const categoryData of categories) {
    try {
      let category = await Category.findOne({ 
        name: categoryData.name, 
        superCategoryId: categoryData.superCategoryId 
      });
      
      if (!category) {
        category = new Category(categoryData);
        await category.save();
      }
      
      categoryMap.set(categoryData.name, category._id);
    } catch (error) {
      console.error(`Error creating category ${categoryData.name}:`, error.message);
    }
  }
  
  return categoryMap;
};

const createProducts = async (data, categoryMap, userId) => {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (const row of data) {
    try {
      const existingProduct = await Product.findOne({ sku: row.sku });
      
      if (existingProduct) {
        continue; // Skip existing products
      }
      
      const categoryId = categoryMap.get(row.category);
      if (!categoryId) {
        errors.push({ sku: row.sku, error: `Category not found: ${row.category}` });
        errorCount++;
        continue;
      }
      
      const productData = {
        sku: row.sku,
        productName: row.productName,
        origin: row.origin || null,
        categoryId: categoryId,
        isActive: true,
        createdBy: userId
      };
      
      const product = new Product(productData);
      await product.save();
      
      successCount++;
    } catch (error) {
      errors.push({ 
        sku: row.sku, 
        productName: row.productName,
        error: error.message 
      });
      errorCount++;
    }
  }
  
  return { successCount, errorCount, errors };
};

// @route   POST /api/products/import
// @desc    Import products from Excel file
// @access  Private
router.post('/import', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Read Excel file from memory buffer
    const workbook = xlsx.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);
    
    // Clean and validate data
    const cleanDataArray = cleanData(rawData);
    
    if (cleanDataArray.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid data found in Excel file' 
      });
    }
    
    // Create super categories
    const superCategoryMap = await createSuperCategories(cleanDataArray);
    
    // Create categories
    const categoryMap = await createCategories(cleanDataArray, superCategoryMap);
    
    // Create products
    const result = await createProducts(cleanDataArray, categoryMap, req.user.id);
    
    res.json({
      success: true,
      message: 'Products imported successfully',
      data: {
        totalProcessed: cleanDataArray.length,
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors
      }
    });
    
  } catch (error) {
    console.error('Import products error:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while importing products',
      error: error.message 
    });
  }
});

module.exports = router;

