const express = require('express');
const router = express.Router();
const SuperCategory = require('../models/SuperCategory');
const { protect } = require('../middleware/auth');

// Get all super categories
router.get('/', protect, async (req, res) => {
  try {
    const superCategories = await SuperCategory.find().sort({ name: 1 });
    res.json({
      success: true,
      data: { superCategories }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching super categories',
      error: error.message
    });
  }
});

// Create super category
router.post('/', protect, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Super category name is required'
      });
    }

    const superCategory = new SuperCategory({
      name: name.trim()
    });

    await superCategory.save();

    res.status(201).json({
      success: true,
      data: { superCategory },
      message: 'Super category created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Super category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating super category',
      error: error.message
    });
  }
});

// Update super category
router.put('/:id', protect, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Super category name is required'
      });
    }

    const superCategory = await SuperCategory.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!superCategory) {
      return res.status(404).json({
        success: false,
        message: 'Super category not found'
      });
    }

    res.json({
      success: true,
      data: { superCategory },
      message: 'Super category updated successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Super category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating super category',
      error: error.message
    });
  }
});

// Delete super category
router.delete('/:id', protect, async (req, res) => {
  try {
    const superCategory = await SuperCategory.findByIdAndDelete(req.params.id);

    if (!superCategory) {
      return res.status(404).json({
        success: false,
        message: 'Super category not found'
      });
    }

    res.json({
      success: true,
      message: 'Super category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting super category',
      error: error.message
    });
  }
});

module.exports = router;
