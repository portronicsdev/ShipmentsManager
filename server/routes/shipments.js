const express = require('express');
const { body, validationResult } = require('express-validator');
const Shipment = require('../models/Shipment');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper function to calculate weights
const calculateWeights = (boxes) => {
  let totalWeight = 0;
  let totalVolume = 0;
  let totalVolumeWeight = 0;

  boxes.forEach(box => {
    totalWeight += box.finalWeight;
    totalVolume += box.volume;
    totalVolumeWeight += box.volumeWeight;
  });

  const chargedWeight = Math.max(totalWeight, totalVolumeWeight);

  return {
    totalWeight,
    totalVolume,
    totalVolumeWeight,
    chargedWeight
  };
};

// @route   GET /api/shipments
// @desc    Get all shipments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { 
      search, 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search.toUpperCase(), $options: 'i' } },
        { partyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const shipments = await Shipment.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Shipment.countDocuments(query);

    res.json({
      success: true,
      data: {
        shipments,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          hasNext: skip + shipments.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching shipments' 
    });
  }
});

// @route   GET /api/shipments/:id
// @desc    Get single shipment
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!shipment) {
      return res.status(404).json({ 
        message: 'Shipment not found' 
      });
    }

    res.json({
      success: true,
      data: { shipment }
    });
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching shipment' 
    });
  }
});

// @route   POST /api/shipments
// @desc    Create new shipment
// @access  Private
router.post('/', [
  protect,
  body('invoiceNo')
    .trim()
    .notEmpty()
    .withMessage('Invoice number is required'),
  body('partyName')
    .trim()
    .notEmpty()
    .withMessage('Party name is required'),
  body('startTime')
    .optional()
    .isString()
    .withMessage('Start time must be a string'),
  body('endTime')
    .optional()
    .isString()
    .withMessage('End time must be a string'),
  body('boxes')
    .isArray({ min: 1 })
    .withMessage('At least one box is required'),
  body('boxes.*.boxNo')
    .notEmpty()
    .withMessage('Box number is required'),
  body('boxes.*.weight')
    .isFloat({ min: 0 })
    .withMessage('Box weight must be a positive number'),
  body('boxes.*.length')
    .isFloat({ min: 0 })
    .withMessage('Box length must be a positive number'),
  body('boxes.*.height')
    .isFloat({ min: 0 })
    .withMessage('Box height must be a positive number'),
  body('boxes.*.width')
    .isFloat({ min: 0 })
    .withMessage('Box width must be a positive number'),
  body('boxes.*.products')
    .isArray({ min: 1 })
    .withMessage('At least one product is required per box'),
  body('boxes.*.products.*.sku')
    .notEmpty()
    .withMessage('Product SKU is required'),
  body('boxes.*.products.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Product quantity must be at least 1')
], async (req, res) => {
  try {

    console.log("Create shipment request body:", req.body); // Debug: Log incoming request body
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array()); // Debug: Log validation errors
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { invoiceNo, partyName, startTime, endTime, boxes, notes } = req.body;
    
    // Debug: Log incoming data
    console.log('Incoming shipment data:', {
      invoiceNo,
      partyName,
      startTime,
      endTime,
      boxesCount: boxes?.length,
      firstBox: boxes?.[0],
      notes
    });

    // Check if invoice number already exists
    const existingShipment = await Shipment.findOne({ invoiceNo: invoiceNo.toUpperCase() });
    if (existingShipment) {
      return res.status(400).json({ 
        message: 'Shipment with this invoice number already exists' 
      });
    }

    // Validate all products exist and add required fields
    for (const box of boxes) {
      for (const product of box.products) {
        const existingProduct = await Product.findOne({ 
          sku: product.sku.toUpperCase(),
          isActive: true 
        });
        
        if (!existingProduct) {
          // Fallback: Check if product exists without isActive filter
          const allProducts = await Product.find({ sku: product.sku.toUpperCase() });
          
          if (allProducts.length > 0) {
            const foundProduct = allProducts[0];
            console.log(`✅ Using found product: ${foundProduct.sku} - ${foundProduct.name}`);
            
            // Update product info with required fields for MongoDB schema
            product.product = foundProduct._id;
            product.productName = foundProduct.name;
            product.sku = foundProduct.sku;
            
            continue;
          }
          
          return res.status(400).json({ 
            message: `Product with SKU ${product.sku} not found` 
          });
        }
        
        // Update product info with required fields for MongoDB schema
        product.product = existingProduct._id;
        product.productName = existingProduct.name;
        product.sku = existingProduct.sku;
      }
    }

    // Calculate weights for each box
    const processedBoxes = boxes.map(box => {
      // Ensure all dimensions are numbers
      const length = parseFloat(box.length) || 0;
      const height = parseFloat(box.height) || 0;
      const width = parseFloat(box.width) || 0;
      const weight = parseFloat(box.weight) || 0;
      
      const volume = length * height * width;
      const volumeWeight = volume / 4500;
      const finalWeight = Math.max(weight, volumeWeight);
      
      return {
        ...box,
        length,
        height,
        width,
        weight,
        volume: parseFloat(volume.toFixed(2)),
        volumeWeight: parseFloat(volumeWeight.toFixed(2)),
        finalWeight: parseFloat(finalWeight.toFixed(2))
      };
    });

    // Debug: Log processed data
    console.log('Processed shipment data:', {
      processedBoxes: processedBoxes.map(box => ({
        boxNo: box.boxNo,
        productsCount: box.products?.length,
        firstProduct: box.products?.[0],
        dimensions: { length: box.length, height: box.height, width: box.width, weight: box.weight },
        calculated: { volume: box.volume, volumeWeight: box.volumeWeight, finalWeight: box.finalWeight }
      }))
    });

    // Create shipment (weights are calculated at runtime)
    const shipment = await Shipment.create({
      invoiceNo: invoiceNo.toUpperCase(),
      partyName,
      startTime,
      endTime,
      date: new Date(req.body.date), // Convert string to Date object
      boxes: processedBoxes,
      notes,
      createdBy: req.user.id
    });

    await shipment.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: { shipment }
    });
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ 
      message: 'Server error while creating shipment' 
    });
  }
});

// @route   PUT /api/shipments/:id
// @desc    Update shipment
// @access  Private
router.put('/:id', [
  protect,
  body('invoiceNo')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Invoice number cannot be empty'),
  body('partyName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Party name cannot be empty'),
  body('startTime')
    .optional()
    .notEmpty()
    .withMessage('Start time cannot be empty'),
  body('endTime')
    .optional()
    .notEmpty()
    .withMessage('End time cannot be empty'),
  body('status')
    .optional()
    .isIn(['draft', 'packing', 'ready', 'shipped', 'delivered'])
    .withMessage('Invalid status')
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

    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({ 
        message: 'Shipment not found' 
      });
    }

    // Check if updating invoice number and it already exists
    if (req.body.invoiceNo && req.body.invoiceNo !== shipment.invoiceNo) {
      const existingShipment = await Shipment.findOne({ 
        invoiceNo: req.body.invoiceNo.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      
      if (existingShipment) {
        return res.status(400).json({ 
          message: 'Shipment with this invoice number already exists' 
        });
      }
    }

    // Prepare update data (no need to calculate weights - they're calculated at runtime)
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    // Update shipment
    const updatedShipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: 'Shipment updated successfully',
      data: { shipment: updatedShipment }
    });
  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({ 
      message: 'Server error while updating shipment' 
    });
  }
});

// @route   DELETE /api/shipments/:id
// @desc    Delete shipment
// @access  Private (Admin, Manager)
router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({ 
        message: 'Shipment not found' 
      });
    }

    await Shipment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Shipment deleted successfully'
    });
  } catch (error) {
    console.error('Delete shipment error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting shipment' 
    });
  }
});

module.exports = router;


