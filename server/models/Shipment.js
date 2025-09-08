const mongoose = require('mongoose');

const productInBoxSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  externalSku: {
    type: String,
    required: false,
    trim: true,
    maxlength: [50, 'External SKU cannot be more than 50 characters']
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  }
}, { _id: false });

const boxSchema = new mongoose.Schema({
  boxNo: {
    type: String,
    required: true
  },
  isShortBox: {
    type: Boolean,
    default: false
  },
  weight: {
    type: Number,
    required: true,
    min: [0, 'Weight cannot be negative']
  },
  length: {
    type: Number,
    required: true,
    min: [0, 'Length cannot be negative']
  },
  height: {
    type: Number,
    required: true,
    min: [0, 'Height cannot be negative']
  },
  width: {
    type: Number,
    required: true,
    min: [0, 'Width cannot be negative']
  },
  volume: {
    type: Number,
    required: true,
    min: [0, 'Volume cannot be negative']
  },
  volumeWeight: {
    type: Number,
    required: true,
    min: [0, 'Volume weight cannot be negative']
  },
  finalWeight: {
    type: Number,
    required: true,
    min: [0, 'Final weight cannot be negative']
  },
  products: [productInBoxSchema]
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  invoiceNo: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  partyName: {
    type: String,
    required: [true, 'Party name is required'],
    trim: true,
    maxlength: [100, 'Party name cannot be more than 100 characters']
  },
  requiredQty: {
    type: Number,
    required: [true, 'Required quantity is mandatory'],
    min: [1, 'Required quantity must be at least 1']
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  },
  boxes: [boxSchema],
  totalWeight: {
    type: Number,
    required: false,
    min: [0, 'Total weight cannot be negative']
  },
  totalVolume: {
    type: Number,
    required: false,
    min: [0, 'Total volume cannot be negative']
  },
  totalVolumeWeight: {
    type: Number,
    required: false,
    min: [0, 'Total volume weight cannot be negative']
  },
  chargedWeight: {
    type: Number,
    required: false,
    min: [0, 'Charged weight cannot be negative']
  },
  status: {
    type: String,
    enum: ['draft', 'packing', 'ready', 'shipped', 'delivered'],
    default: 'draft'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isTempShipment: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
shipmentSchema.index({ invoiceNo: 1 });
shipmentSchema.index({ customer: 1 });
shipmentSchema.index({ partyName: 1 });
shipmentSchema.index({ date: -1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ createdBy: 1 });

// Virtual for total pieces
shipmentSchema.virtual('totalPieces').get(function() {
  return this.boxes.reduce((sum, box) => 
    sum + box.products.reduce((boxSum, product) => boxSum + product.quantity, 0), 0
  );
});

// Ensure virtual fields are serialized
shipmentSchema.set('toJSON', { virtuals: true });
shipmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Shipment', shipmentSchema);


