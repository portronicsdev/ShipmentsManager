const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const SuperCategory = require('../models/SuperCategory');
const { protect } = require('../middleware/auth');

// Get all categories with super category info
router.get('/', protect, async (req, res) => {
  try {
    const categories = await Category.find()
      .populate('superCategoryId', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// Get categories by super category
router.get('/super-category/:superCategoryId', protect, async (req, res) => {
  try {
    const categories = await Category.find({ superCategoryId: req.params.superCategoryId })
      .populate('superCategoryId', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// Create category
router.post('/', protect, async (req, res) => {
  try {
    const { name, superCategoryId } = req.body;

    if (!name || !superCategoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category name and super category are required'
      });
    }

    // Check if super category exists
    const superCategory = await SuperCategory.findById(superCategoryId);
    if (!superCategory) {
      return res.status(400).json({
        success: false,
        message: 'Super category not found'
      });
    }

    const category = new Category({
      name: name.trim(),
      superCategoryId
    });

    await category.save();

    // Populate the super category info
    await category.populate('superCategoryId', 'name');

    res.status(201).json({
      success: true,
      data: { category },
      message: 'Category created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists in the selected super category'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
});

// Update category
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, superCategoryId } = req.body;

    if (!name || !superCategoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category name and super category are required'
      });
    }

    // Check if super category exists
    const superCategory = await SuperCategory.findById(superCategoryId);
    if (!superCategory) {
      return res.status(400).json({
        success: false,
        message: 'Super category not found'
      });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), superCategoryId },
      { new: true, runValidators: true }
    ).populate('superCategoryId', 'name');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: { category },
      message: 'Category updated successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists in the selected super category'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
});

// Delete category
router.delete('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
});

module.exports = router;
