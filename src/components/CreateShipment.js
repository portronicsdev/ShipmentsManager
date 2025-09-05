import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import localDB from '../utils/localStorage';

const CreateShipment = ({ products = [], onAdd }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: '',
    invoiceNo: '',
    quantityToBePacked: '',
    partyName: '',
    startTime: '',
    endTime: ''
  });

  const [boxes, setBoxes] = useState([]);
  const [currentBox, setCurrentBox] = useState({
    boxNo: '1',
    products: [],
    weight: 0,
    length: 0,
    height: 0,
    width: 0
  });

  const [currentProduct, setCurrentProduct] = useState({
    sku: '',
    productName: '',
    externalSku: '',
    quantity: 1
  });

  const [editingBox, setEditingBox] = useState(null);
  const [errors, setErrors] = useState({});
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [isRemoving, setIsRemoving] = useState(false);

  // Auto-populate date, start time and load saved boxes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setFormData(prev => ({ 
      ...prev, 
      date: today,
      startTime: currentTime
    }));

    const savedBoxes = localDB.get('tempBoxes') || [];
    if (savedBoxes.length > 0) {
      setBoxes(savedBoxes);
      setCurrentBox(prev => ({ ...prev, boxNo: (savedBoxes.length + 1).toString() }));
    }
  }, []); // Empty dependency array - only run once on mount

  const n = v => (Number.isFinite(v) ? v : 0);

  const calculateVolume = (length, height, width) => {
    return (n(length) * n(height) * n(width)).toFixed(2);
  };

  const calculateVolumeWeight = (length, height, width) => {
    return ((n(length) * n(height) * n(width)) / 4500).toFixed(2);
  };

  const calculateFinalWeight = (boxWeight, volumeWeight) => {
    return Math.max(parseFloat(boxWeight) || 0, parseFloat(volumeWeight) || 0).toFixed(2);
  };

  const handleBoxChange = (field, value) => {
    setCurrentBox(prev => ({ ...prev, [field]: value }));
  };

  const handleProductChange = (field, value) => {
    setCurrentProduct(prev => ({ ...prev, [field]: value }));

    if (field === 'sku') {
      const product = products.find(p => p.sku === value);
      setCurrentProduct(prev => ({
        ...prev,
        productName: product ? product.name : ''
      }));
    }
  };

  const addProductToBoxImpl = (targetBoxSetter, targetBox) => {
    if (!currentProduct.sku || !currentProduct.quantity) {
      setErrors({ message: 'Please fill in SKU and quantity for the product.' });
      return;
    }

    const product = products.find(p => p.sku === currentProduct.sku);
    if (!product) {
      setErrors({ message: 'Product not found.' });
      return;
    }

    const newProduct = {
      id: Date.now().toString(),
      sku: currentProduct.sku,
      productName: product.name,
      externalSku: currentProduct.externalSku || '',
      quantity: parseInt(currentProduct.quantity) || 1,
      product: product._id || product.id // Add the required 'product' field (Product ObjectId)
    };

    targetBoxSetter(prev => ({
      ...prev,
      products: [...(targetBox?.products || prev.products), newProduct]
    }));

    setCurrentProduct({ sku: '', productName: '', externalSku: '', quantity: 1 });
    setErrors({});
  };

  const addProductToBox = () => addProductToBoxImpl(setCurrentBox, currentBox);
  const addProductToEditingBox = () => addProductToBoxImpl(setEditingBox, editingBox);

  const removeProductFromBox = (productId) => {
    setCurrentBox(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId)
    }));
  };

  const removeProductFromEditingBox = (productId) => {
    setEditingBox(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId)
    }));
  };

  const copyBox = (boxToCopy) => {
    const copiedBox = {
      ...boxToCopy,
      id: uuidv4(),
      boxNo: (boxes.length + 1).toString(),
      products: (boxToCopy.products || []).map(product => ({
        ...product,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 11)
      }))
    };

    const newBoxes = [...boxes, copiedBox];
    setBoxes(newBoxes);
    localDB.set('tempBoxes', newBoxes);
    setCurrentBox(prev => ({ ...prev, boxNo: (newBoxes.length + 1).toString() }));
  };

  const addBox = () => {
    if (!currentBox.length || !currentBox.height || !currentBox.width || !currentBox.weight) {
      if (!currentBox.isShortBox) {
          // For Short Boxes, skip dimension and weight validation  
          setErrors({ message: 'Please fill in all box dimensions and weight.' });
          return;
      }
    }

    if (currentBox.products.length === 0) {
      setErrors({ message: 'Please add at least one product to the box.' });
      return;
    }

    const volume = calculateVolume(currentBox.length, currentBox.height, currentBox.width);
    const volumeWeight = calculateVolumeWeight(currentBox.length, currentBox.height, currentBox.width);
    const finalWeight = calculateFinalWeight(currentBox.weight, volumeWeight);

    const newBox = {
      ...currentBox,
      id: uuidv4(),
      volume: parseFloat(volume),
      volumeWeight: parseFloat(volumeWeight),
      finalWeight: parseFloat(finalWeight)
    };

    const newBoxes = [...boxes, newBox];
    setBoxes(newBoxes);
    localDB.set('tempBoxes', newBoxes);

    setCurrentBox({
      boxNo: (newBoxes.length + 1).toString(),
      products: [],
      weight: 0,
      length: 0,
      height: 0,
      width: 0
    });

    setCurrentProduct({ sku: '', productName: '', externalSku: '', quantity: 1 });
    setErrors({});
    setShowBoxModal(false);
  };

  const editBox = (box) => {
    setEditingBox({ ...box });
    setModalMode('edit');
    setShowBoxModal(true);
  };

  const saveBoxChanges = () => {
    if (!editingBox.length || !editingBox.height || !editingBox.width || !editingBox.weight) {
      setErrors({ message: 'Please fill in all box dimensions and weight.' });
      return;
    }

    if (editingBox.products.length === 0) {
      setErrors({ message: 'Please add at least one product to the box.' });
      return;
    }

    const volume = calculateVolume(editingBox.length, editingBox.height, editingBox.width);
    const volumeWeight = calculateVolumeWeight(editingBox.length, editingBox.height, editingBox.width);
    const finalWeight = calculateFinalWeight(editingBox.weight, volumeWeight);

    const updatedBox = {
      ...editingBox,
      volume: parseFloat(volume),
      volumeWeight: parseFloat(volumeWeight),
      finalWeight: parseFloat(finalWeight)
    };

    const updatedBoxes = boxes.map(box => (box.id === editingBox.id ? updatedBox : box));
    setBoxes(updatedBoxes);
    localDB.set('tempBoxes', updatedBoxes);

    setEditingBox(null);
    setErrors({});
    setShowBoxModal(false);
  };

  const removeBox = (boxId) => {
        if (isRemoving) {
      return;
    }
    
    // Check for duplicate IDs
    const duplicateIds = boxes.filter(box => box.id === boxId);
    if (duplicateIds.length > 1) {
      // Handle duplicate IDs if needed
    }
    
    setIsRemoving(true);
    
    // Use functional state update to ensure we're working with the latest state
    setBoxes(prevBoxes => {
      const updatedBoxes = prevBoxes.filter(box => box.id !== boxId);
      
      const renumberedBoxes = updatedBoxes.map((box, index) => ({
        ...box,
        boxNo: (index + 1).toString()
      }));
      localDB.set('tempBoxes', renumberedBoxes);
      
      // Reset the removing flag after a short delay
      setTimeout(() => {
        setIsRemoving(false);
      }, 100);

      setCurrentBox(prev => ({ ...prev, boxNo: (renumberedBoxes.length + 1).toString() }));
      
      return renumberedBoxes;
    });
  };

  const openAddBoxModal = (isShortBox = false) => {
    // Check if trying to add a Short Box when one already exists
    if (isShortBox) {
      const existingShortBox = boxes.find(box => box.isShortBox);
      if (existingShortBox) {
        setErrors({ message: 'Only one Short Box is allowed per shipment.' });
        return;
      }
    }
    
    setModalMode('add');
    
    // Set dimensions to 0 for Short Boxes
    const shortBoxDimensions = {
      length: 0,  // 0cm
      height: 0,  // 0cm
      width: 0,   // 0cm
      weight: 0   // 0kg
    };
    
    setCurrentBox({
      boxNo: (boxes.length + 1).toString(),
      isShortBox: isShortBox,
      products: [],
      weight: isShortBox ? shortBoxDimensions.weight : 0,
      length: isShortBox ? shortBoxDimensions.length : 0,
      height: isShortBox ? shortBoxDimensions.height : 0,
      width: isShortBox ? shortBoxDimensions.width : 0
    });
    setCurrentProduct({ sku: '', productName: '', externalSku: '', quantity: 1 });
    setErrors({});
    setShowBoxModal(true);
  };

  const closeBoxModal = () => {
    setShowBoxModal(false);
    setEditingBox(null);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.invoiceNo || !formData.partyName || !formData.quantityToBePacked || boxes.length === 0) {
      setErrors({ message: 'Please fill in all required fields and add at least one box.' });
      return;
    }

    // Set end time when saving shipment
    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Process boxes to ensure each product has the required 'product' field (Product ObjectId)
    const processedBoxes = boxes.map(box => ({
      ...box,
      products: box.products.map(product => {
        // Find the product by SKU to get the ObjectId
        const foundProduct = products.find(p => p.sku === product.sku);
        if (!foundProduct) {
          return product;
        }
        
        return {
          ...product,
          product: foundProduct._id || foundProduct.id // Add the required 'product' field
        };
      })
    }));



    const shipment = {
      id: uuidv4(),
      date: formData.date,
      invoiceNo: formData.invoiceNo,
      partyName: formData.partyName,
      requiredQty: parseInt(formData.quantityToBePacked),
      startTime: formData.startTime,
      endTime: endTime, // Use the current time as end time
      boxes: processedBoxes
    };

    localDB.remove('tempBoxes');
    onAdd?.(shipment);
    navigate('/shipments');
  };

  const totalInvoiceQty = boxes.reduce(
    (sum, box) => sum + box.products.reduce((boxSum, product) => boxSum + (parseInt(product.quantity) || 0), 0),
    0
  );

  const sumFinalWeight = boxes.reduce((sum, box) => sum + (box.finalWeight || 0), 0).toFixed(2);
  const sumVolWeight = boxes.reduce((sum, box) => sum + (box.volumeWeight || 0), 0).toFixed(2);
  const sumVolume = boxes.reduce((sum, box) => sum + (box.volume || 0), 0).toFixed(2);

  // Quantity validation
  const requiredQty = parseInt(formData.quantityToBePacked) || 0;
  const isQuantityMatch = totalInvoiceQty === requiredQty;
  const isQuantityValid = requiredQty > 0;




  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Main Content */}
      <div>
      {errors.message && (
        <div
          style={{
            padding: '5px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}
        >
          {errors.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Ultra-Compact Shipment Details with Summary - Sticky */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '5px',
            marginBottom: '3px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
            width: '98%',
            margin: '0 auto 3px auto',
            position: 'sticky',
            top: '0',
            zIndex: 100,
            borderBottom: '2px solid #e9ecef'
          }}
        >
          
                    {/* Form Fields - One Line */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', alignItems: 'end' }}>
                          <div>
                <label style={{ display: 'block', marginBottom: '2px', fontWeight: '700', color: '#34495e', fontSize: '10px' }}>
                  Date
                </label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #e9ecef',
                    borderRadius: '3px',
                    fontSize: '15px',
                    backgroundColor: '#f8f9fa',
                    color: '#495057'
                  }}
                  value={formData.date || ''}
                  readOnly
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '2px', fontWeight: '700', color: '#34495e', fontSize: '12px' }}>
                  Invoice No <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #e9ecef',
                    borderRadius: '3px',
                    fontSize: '15px'
                  }}
                  value={formData.invoiceNo}
                  onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                  required
                  placeholder="Invoice #"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '2px', fontWeight: '700', color: '#34495e', fontSize: '10px' }}>
                  Total Quantity <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="number"
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: '1px solid #e9ecef',
                    borderRadius: '3px',
                    fontSize: '15px'
                  }}
                  value={formData.quantityToBePacked || ''}
                  onChange={(e) => setFormData({ ...formData, quantityToBePacked: e.target.value })}
                  required
                  placeholder="Qty"
                  min="1"
                />
              </div>

            <div>
              <label style={{ display: 'block', marginBottom: '2px', fontWeight: '700', color: '#34495e', fontSize: '10px' }}>
                Party Name <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '4px',
                  border: '1px solid #e9ecef',
                  borderRadius: '3px',
                  fontSize: '15px'
                }}
                value={formData.partyName}
                onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                required
                placeholder="Party Name"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '2px', fontWeight: '700', color: '#34495e', fontSize: '10px' }}>
                Start Time
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '4px',
                  border: '1px solid #e9ecef',
                  borderRadius: '3px',
                  fontSize: '15px',
                  backgroundColor: '#f8f9fa',
                  color: '#495057'
                }}
                value={formData.startTime}
                readOnly
                placeholder="HH:MM"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '2px', fontWeight: '700', color: '#34495e', fontSize: '10px' }}>
                End Time
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '4px',
                  border: '1px solid #e9ecef',
                  borderRadius: '3px',
                  fontSize: '15px',
                  backgroundColor: '#f8f9fa',
                  color: '#495057'
                }}
                value={formData.endTime}
                readOnly
                placeholder="HH:MM"
              />
            </div>
          </div>
          
          {/* Shipment Summary - Full Line */}
          {boxes.length > 0 && (
            <div style={{
              backgroundColor: '#e8f4fd',
              borderRadius: '6px',
              border: '1px solid #b3d9ff',
              padding: '10px',
              fontSize: '12px',
              marginTop: '8px'
            }}>
            
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', fontSize: '11px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6', textAlign: 'center', position: 'relative' }}>
                    <strong style={{ color: '#2c3e50', fontSize: '11px', display: 'block' }}>Packed Quantity</strong>
                    <span style={{ color: '#6c757d', fontSize: '17px', fontWeight: '600' }}>{totalInvoiceQty}</span>
                    {isQuantityValid && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '2px', 
                        right: '2px', 
                        fontSize: '12px',
                        color: isQuantityMatch ? '#28a745' : '#dc3545'
                      }}>
                        {isQuantityMatch ? '✅' : '❌'}
                      </div>
                    )}
                  </div>
                    <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                    <strong style={{ color: '#2c3e50', fontSize: '11px', display: 'block' }}>Total Volume</strong>
                    <span style={{ color: '#6c757d', fontSize: '17px', fontWeight: '600' }}>{sumVolume} cm³</span>
                  </div>
                <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                  <strong style={{ color: '#2c3e50', fontSize: '11px', display: 'block' }}>Actual Weight</strong>
                  <span style={{ color: '#6c757d', fontSize: '17px', fontWeight: '600' }}>{sumFinalWeight} kg</span>
                </div>
                <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                  <strong style={{ color: '#2c3e50', fontSize: '11px', display: 'block' }}>Volume Weight</strong>
                  <span style={{ color: '#6c757d', fontSize: '17px', fontWeight: '600' }}>{sumVolWeight} kg</span>
                </div>
                <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                  <strong style={{ color: '#2c3e50', fontSize: '11px', display: 'block' }}>Charged Weight</strong>
                  <span style={{ color: '#6c757d', fontSize: '17px', fontWeight: '600' }}>{sumFinalWeight} kg</span>
                </div>
              </div>
            </div>
          )}
        </div>



        {/* Boxes Added Section */}
        {boxes.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              width: '98%',
              margin: '0 auto 20px auto'
            }}
          >
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>
                      Box #
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>
                      Type
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>
                      Dimensions (L×H×W)
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>
                      Weight (kg)
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>
                      Volume Weight
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>
                      Products
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>
                      Calculations
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boxes.map((box) => (
                    <tr key={box.id} style={{ 
                      borderBottom: '1px solid #e9ecef',
                      backgroundColor: box.isShortBox ? '#ffe6e6' : 'transparent'
                    }}>
                      <td style={{ padding: '10px', fontWeight: '600', color: '#2c3e50' }}>Box #{box.boxNo}</td>
                      <td style={{ padding: '10px', fontSize: '12px', textAlign: 'center' }}>
                        {box.isShortBox ? (
                          <span style={{ 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            SHORT
                          </span>
                        ) : (
                          <span style={{ 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            NORMAL
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        {box.length} × {box.height} × {box.width}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        <div>
                          <strong>{box.weight}</strong> 
                        </div>
                      
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                       
                     
                       <div>
                          <strong>{box.volumeWeight} kg</strong> 
                        </div>
                      </td>
                      <td style={{ padding: '10px', maxWidth: '250px' }}>
                        {box.products.map((product) => (
                          <div
                            key={product.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '4px 6px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '3px',
                              margin: '1px 0',
                              fontSize: '11px'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ fontWeight: '500', fontSize: '10px' }}>{product.sku}</span>
                              {product.externalSku && (
                                <span style={{ fontSize: '9px', color: '#6c757d' }}>
                                  Ext: {product.externalSku}
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                padding: '1px 4px',
                                borderRadius: '2px',
                                fontSize: '9px'
                              }}
                            >
                              {product.quantity}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '10px', fontSize: '13px' }}>
                        <div>
                          <strong>Pieces:</strong>{' '}
                          {box.products.reduce((sum, product) => sum + (parseInt(product.quantity) || 0), 0)}
                        </div>
                        <div>
                          <strong>Max Wt:</strong> {box.finalWeight} kg
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                          <button
                            type="button"
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                            onClick={() => editBox(box)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                            onClick={() => copyBox(box)}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            style={{
                              padding: '4px 8px',
                              backgroundColor: isRemoving ? '#6c757d' : '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '10px',
                              cursor: isRemoving ? 'not-allowed' : 'pointer'
                            }}
                            disabled={isRemoving}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to remove Box #${box.boxNo}?`)) {
                                removeBox(box.id);
                              }
                            }}
                          >
                            {isRemoving ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons - Bottom */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          width: '98%',
          margin: '0 auto 20px auto'
        }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 15px 0', color: '#2c3e50' }}>Final Actions</h3>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              style={{
                padding: '12px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                minWidth: '140px'
              }}
              onClick={() => openAddBoxModal(false)}
            >
              ➕ Add Box
            </button>
            
            <button
              type="button"
              style={{
                padding: '12px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                minWidth: '140px'
              }}
              onClick={() => openAddBoxModal(true)}
            >
              ⚠️ Add Short Box
            </button>
            
            <button
              type="button"
              style={{
                padding: '12px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                minWidth: '140px'
              }}
              onClick={handleSubmit}
            >
              💾 Save Shipment
            </button>
            
            <button
              type="button"
              style={{
                padding: '12px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                minWidth: '140px'
              }}
              onClick={() => navigate('/shipments')}
            >
              ❌ Cancel
            </button>
          </div>
        </div>

      </form>

      {/* Box Modal */}
      {showBoxModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                              <h2 style={{ fontSize: '18px', margin: 0, color: '#2c3e50' }}>
                {modalMode === 'edit' ? 
                  `Edit ${editingBox?.isShortBox ? 'Short ' : ''}Box #${editingBox?.boxNo}` : 
                  `Add ${currentBox.isShortBox ? 'Short ' : ''}Box #${currentBox.boxNo}`
                }
              </h2>
              <button
                type="button"
                onClick={closeBoxModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            {/* Box Dimensions - Only for Normal Boxes */}
            {!currentBox.isShortBox && (
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#34495e' }}>Box Dimensions</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Height (CM) <span style={{ color: '#dc3545' }}>*</span></label>
                    <input
                      type="number"
                      style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                      value={modalMode === 'edit' ? editingBox?.height : currentBox.height}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (modalMode === 'edit') setEditingBox(prev => ({ ...prev, height: v }));
                        else handleBoxChange('height', v);
                      }}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Width (CM) <span style={{ color: '#dc3545' }}>*</span></label>
                    <input
                      type="number"
                      style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                      value={modalMode === 'edit' ? editingBox?.width : currentBox.width}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (modalMode === 'edit') setEditingBox(prev => ({ ...prev, width: v }));
                        else handleBoxChange('width', v);
                      }}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Length (CM) <span style={{ color: '#dc3545' }}>*</span></label>
                    <input
                      type="number"
                      style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                      value={modalMode === 'edit' ? editingBox?.length : currentBox.length}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (modalMode === 'edit') setEditingBox(prev => ({ ...prev, length: v }));
                        else handleBoxChange('length', v);
                      }}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Weight (KG) <span style={{ color: '#dc3545' }}>*</span></label>
                    <input
                      type="number"
                      style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                      value={modalMode === 'edit' ? editingBox?.weight : currentBox.weight}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (modalMode === 'edit') setEditingBox(prev => ({ ...prev, weight: v }));
                        else handleBoxChange('weight', v);
                      }}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Short Box Info - Only for Short Boxes */}
            {currentBox.isShortBox && (
              <div style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', color: '#856404' }}>
                  📦 Short Box - No Dimensions Required
                </h3>
                <p style={{ fontSize: '14px', margin: '0', color: '#856404' }}>
                  Short boxes have no physical dimensions and weight. Only products need to be added.
                </p>
              </div>
            )}

            {/* Add Products */}
            <div
              style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '15px'
              }}
            >
              <h4 style={{ fontSize: '13px', margin: '0 0 10px 0', color: '#34495e' }}>
                {modalMode === 'edit' ? 'Edit Products in Box' : 'Add Products to Box'}
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr', gap: '15px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '13px' }}>
                    SKU <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <select
                    style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                    value={currentProduct.sku}
                    onChange={(e) => handleProductChange('sku', e.target.value)}
                  >
                    <option value="">Select SKU</option>
                    {products.map((product) => (
                      <option key={product._id || product.sku} value={product.sku}>
                        {product.sku} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '13px' }}>
                    External SKU
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                    value={currentProduct.externalSku}
                    onChange={(e) => handleProductChange('externalSku', e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '13px' }}>
                    Quantity <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                    value={currentProduct.quantity}
                    onChange={(e) => handleProductChange('quantity', parseInt(e.target.value) || 1)}
                    min="1"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                    onClick={modalMode === 'edit' ? addProductToEditingBox : addProductToBox}
                  >
                    Add Product
                  </button>
                </div>
              </div>
            </div>

            {/* Current Products in Box */}
            {(modalMode === 'edit' ? (editingBox?.products?.length > 0) : (currentBox.products.length > 0)) && (
              <div
                style={{
                  padding: '15px',
                  backgroundColor: '#e8f4fd',
                  borderRadius: '8px',
                  marginBottom: '15px'
                }}
              >
                <h5 style={{ fontSize: '13px', margin: '0 0 10px 0', color: '#2c3e50' }}>
                  Products in Box #{modalMode === 'edit' ? editingBox?.boxNo : currentBox.boxNo}:
                </h5>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {(modalMode === 'edit' ? editingBox?.products : currentBox.products).map((product) => (
                      <div
                        key={product.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px',
                          backgroundColor: 'white',
                          borderRadius: '6px',
                          border: '1px solid #dee2e6'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '13px' }}>{product.sku}</div>
                          <div style={{ color: '#6c757d', fontSize: '12px' }}>{product.productName}</div>
                          {product.externalSku && (
                            <div style={{ color: '#17a2b8', fontSize: '11px', fontStyle: 'italic' }}>
                              External SKU: {product.externalSku}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            Qty: {product.quantity}
                          </span>
                          <button
                            type="button"
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            onClick={() =>
                              modalMode === 'edit' ? removeProductFromEditingBox(product.id) : removeProductFromBox(product.id)
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={closeBoxModal}
              >
                Cancel
              </button>
              {modalMode === 'edit' ? (
                <button
                  type="button"
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onClick={saveBoxChanges}
                >
                  Save Changes
                </button>
              ) : (
                <button
                  type="button"
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onClick={addBox}
                >
                  Add Box
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CreateShipment;
