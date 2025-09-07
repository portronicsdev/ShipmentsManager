const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const xlsx = require('xlsx');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, group, city, state, region, page = 1, limit } = req.query;
    
    // If no limit specified, load all customers (set a very high limit)
    const actualLimit = limit ? parseInt(limit) : 999999;
    
    console.log('Customer API request params:', { search, group, city, state, region, page, limit });
    
    // Build query
    let query = { isActive: { $ne: false } }; // Only show active customers
    
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (group) {
      query.group = { $regex: group, $options: 'i' };
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (state) {
      query.state = { $regex: state, $options: 'i' };
    }

    if (region) {
      query.region = { $regex: region, $options: 'i' };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const customers = await Customer.find(query)
      .populate({
        path: 'createdBy',
        select: 'name email',
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(actualLimit);

    const total = await Customer.countDocuments(query);

    console.log('Customer query results:', {
      customersFound: customers.length,
      totalCount: total,
      limitUsed: actualLimit,
      query: query
    });

    res.json({
      success: true,
      data: {
        customers,
        totalCount: total,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / actualLimit),
          hasNext: skip + customers.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching customers' 
    });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate({
        path: 'createdBy',
        select: 'name email',
        options: { strictPopulate: false }
      });

    if (!customer) {
      return res.status(404).json({ 
        message: 'Customer not found' 
      });
    }

    res.json({
      success: true,
      data: { customer }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching customer' 
    });
  }
});

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private (Admin/Manager)
router.post('/', [
  protect,
  authorize('admin', 'manager'),
  body('code')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Code must be between 1 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Code must contain only uppercase letters and numbers'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Name must be between 2 and 150 characters'),
  body('group')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Group cannot be more than 100 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot be more than 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot be more than 100 characters'),
  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region cannot be more than 100 characters'),
  body('stateCode')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('State Code cannot be more than 10 characters')
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

    const { code, name, group, city, state, region, stateCode } = req.body;

    // Check if customer code already exists
    const existingCustomer = await Customer.findOne({ code: code.toUpperCase() });
    if (existingCustomer) {
      return res.status(400).json({ 
        message: 'Customer with this code already exists' 
      });
    }

    // Create new customer
    const customer = await Customer.create({
      code: code.toUpperCase(),
      name,
      group,
      city,
      state,
      region,
      stateCode: stateCode ? stateCode.toUpperCase() : undefined,
      createdBy: req.user.id
    });

    // Populate the createdBy field
    await customer.populate({
      path: 'createdBy',
      select: 'name email',
      options: { strictPopulate: false }
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Customer with this code already exists' 
      });
    }
    res.status(500).json({ 
      message: 'Server error while creating customer' 
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private (Admin/Manager)
router.put('/:id', [
  protect,
  authorize('admin', 'manager'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Code must be between 1 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Code must contain only uppercase letters and numbers'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Name must be between 2 and 150 characters'),
  body('group')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Group cannot be more than 100 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot be more than 100 characters'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot be more than 100 characters'),
  body('region')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region cannot be more than 100 characters'),
  body('stateCode')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('State Code cannot be more than 10 characters')
], async (req, res) => {
  try {
    console.log('Update customer request body:', req.body);
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { code, name, group, city, state, region, stateCode } = req.body;

    // Check if customer exists
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ 
        message: 'Customer not found' 
      });
    }

    // Check if new code conflicts with existing customer (if code is being changed)
    if (code && code.toUpperCase() !== customer.code) {
      const existingCustomer = await Customer.findOne({ 
        code: code.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existingCustomer) {
        return res.status(400).json({ 
          message: 'Customer with this code already exists' 
        });
      }
    }

    // Update customer
    const updateData = {};
    if (code) updateData.code = code.toUpperCase();
    if (name) updateData.name = name;
    if (group !== undefined) updateData.group = group;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (region !== undefined) updateData.region = region;
    if (stateCode !== undefined) updateData.stateCode = stateCode ? stateCode.toUpperCase() : undefined;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'createdBy',
      select: 'name email',
      options: { strictPopulate: false }
    });

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer: updatedCustomer }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Customer with this code already exists' 
      });
    }
    res.status(500).json({ 
      message: 'Server error while updating customer' 
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Hard delete customer
// @access  Private (Admin/Manager)
router.delete('/:id', [
  protect,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    // Validate ID parameter
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ 
        message: 'Invalid customer ID' 
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ 
        message: 'Customer not found' 
      });
    }

    // Hard delete - permanently remove from database
    await Customer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Customer permanently deleted'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting customer' 
    });
  }
});

// @route   POST /api/customers/import
// @desc    Import customers from Excel file
// @access  Private (Admin/Manager)
router.post('/import', [
  protect,
  authorize('admin', 'manager'),
  upload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file uploaded' 
      });
    }

    // Read Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ 
        message: 'No data found in Excel file' 
      });
    }

    // Clean and validate data
    const cleanedData = data.map(row => {
      const code = row.Code || row.code || '';
      const name = row.Name || row.name || '';
      const group = row.Group || row.group || '';
      const city = row.City || row.city || '';
      const state = row.State || row.state || '';
      const region = row.Region || row.region || '';
      const stateCode = row['State Code'] || row.stateCode || row['StateCode'] || '';

      return {
        code: code.toString().trim().toUpperCase(),
        name: name.toString().trim(),
        group: group.toString().trim() || undefined,
        city: city.toString().trim() || undefined,
        state: state.toString().trim() || undefined,
        region: region.toString().trim() || undefined,
        stateCode: stateCode.toString().trim().toUpperCase() || undefined,
        createdBy: req.user.id
      };
    }).filter(customer => customer.code && customer.name);

    if (cleanedData.length === 0) {
      return res.status(400).json({ 
        message: 'No valid customer data found. Please ensure Code and Name columns exist.' 
      });
    }

    // Check for duplicate codes
    const existingCustomers = await Customer.find({ 
      code: { $in: cleanedData.map(c => c.code) } 
    });
    const existingCodes = new Set(existingCustomers.map(c => c.code));

    // Filter out duplicates
    const newCustomers = cleanedData.filter(customer => !existingCodes.has(customer.code));

    if (newCustomers.length === 0) {
      return res.status(400).json({ 
        message: 'All customers already exist in the database' 
      });
    }

    // Bulk insert new customers
    const insertedCustomers = await Customer.insertMany(newCustomers);

    res.json({
      success: true,
      message: `Import successful! ${insertedCustomers.length} customers imported.`,
      data: {
        importedCount: insertedCustomers.length,
        skippedCount: cleanedData.length - newCustomers.length,
        totalRows: data.length
      }
    });

  } catch (error) {
    console.error('Import customers error:', error);
    res.status(500).json({ 
      message: 'Server error while importing customers' 
    });
  }
});

module.exports = router;
