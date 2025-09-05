const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'SKU cannot be more than 20 characters']
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [150, 'Product name cannot be more than 100 characters']
  },

  origin: {
    type: String,
    trim: true,
    maxlength: [50, 'Origin cannot be more than 50 characters']
  },
  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: [true, 'Category is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
productSchema.index({ sku: 1 });
productSchema.index({ productName: 'text' });
productSchema.index({ categoryId: 1 });

module.exports = mongoose.model('Product', productSchema);


