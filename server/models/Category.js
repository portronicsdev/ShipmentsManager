const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  superCategoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SuperCategory', 
    required: [true, 'Super Category is required']
  },
}, { 
  timestamps: true 
});

// Compound index to ensure unique category names within each super category
categorySchema.index({ name: 1, superCategoryId: 1 }, { unique: true });

// Index for faster queries
categorySchema.index({ superCategoryId: 1 });

module.exports = mongoose.model('Category', categorySchema);
