const mongoose = require('mongoose');

const superCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Super Category name is required'], 
    unique: true,
    trim: true,
    maxlength: [50, 'Super Category name cannot be more than 50 characters']
  },
}, { 
  timestamps: true 
});

// Index for faster queries
superCategorySchema.index({ name: 1 });

module.exports = mongoose.model('SuperCategory', superCategorySchema);
