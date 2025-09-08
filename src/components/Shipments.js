import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';


/** =============================
 *  EditShipmentForm
 *  ============================= */
const EditShipmentForm = ({ shipment, products, onSave, onCancel }) => {
  // Debug: Log the shipment data to see what we're receiving
  console.log('EditShipmentForm - shipment data:', shipment);
  
  const [formData, setFormData] = useState({
    date: shipment.date ? new Date(shipment.date).toISOString().split('T')[0] : '',
    invoiceNo: shipment.invoiceNo || '',
    customer: (typeof shipment.customer === 'object' && shipment.customer._id) ? shipment.customer._id : shipment.customer || '',
    partyName: shipment.partyName || '',
    requiredQty: shipment.requiredQty || '',
    startTime: shipment.startTime || '',
    endTime: shipment.endTime || ''
  });
  
  // Debug: Log the initial form data
  console.log('EditShipmentForm - initial formData:', formData);



  // Customer dropdown states
  const [customers, setCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        // Load all customers without pagination
        const response = await api.getCustomers();
        if (response.success) {
          setCustomers(response.data.customers);
          // If shipment has a customer, find and set it
          if (shipment.customer) {
            console.log('EditShipmentForm - shipment.customer:', shipment.customer);
            // Handle both populated customer object and customer ID
            let customerId;
            if (typeof shipment.customer === 'object' && shipment.customer._id) {
              customerId = shipment.customer._id;
            } else if (typeof shipment.customer === 'string') {
              customerId = shipment.customer;
            }
            
            console.log('EditShipmentForm - extracted customerId:', customerId);
            
            if (customerId) {
              const customer = response.data.customers.find(c => 
                (c._id || c.id) === customerId
              );
              console.log('EditShipmentForm - found customer:', customer);
              if (customer) {
                setSelectedCustomer(customer);
                setCustomerSearchTerm(`${customer.code} - ${customer.name}`);
                console.log('EditShipmentForm - set customer search term:', `${customer.code} - ${customer.name}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };

    loadCustomers();
  }, [shipment.customer]);

  // Filter customers based on search term
  useEffect(() => {
    if (customerSearchTerm.trim() === '') {
      setFilteredCustomers([]);
      setShowCustomerSuggestions(false);
      return;
    }

    const filtered = customers.filter(customer => 
      customer.code.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
    );
    
    setFilteredCustomers(filtered);
    setShowCustomerSuggestions(filtered.length > 0);
  }, [customerSearchTerm, customers]);

  // Update formData when shipment prop changes
  useEffect(() => {
    setFormData({
      date: shipment.date ? new Date(shipment.date).toISOString().split('T')[0] : '',
      invoiceNo: shipment.invoiceNo || '',
      customer: (typeof shipment.customer === 'object' && shipment.customer._id) ? shipment.customer._id : shipment.customer || '',
      partyName: shipment.partyName || '',
      requiredQty: shipment.requiredQty || shipment.quantityToBePacked || '',
      startTime: shipment.startTime || '',
      endTime: shipment.endTime || ''
    });
  }, [shipment]);

  const [boxes, setBoxes] = useState(shipment.boxes || []);
  const [editingBox, setEditingBox] = useState(null);

  // Ensure boxes have IDs
  useEffect(() => {
    const boxesWithoutIds = boxes.filter(box => !box.id);
    if (boxesWithoutIds.length > 0) {
      const updatedBoxes = boxes.map((box, index) => {
        if (!box.id) {
          return {
            ...box,
            id: `box_${Date.now()}_${index}` // Generate a unique ID
          };
        }
        return box;
      });
      
      setBoxes(updatedBoxes);
    }
  }, [boxes, shipment.boxes]);

  const [currentProduct, setCurrentProduct] = useState({
    sku: '',
    productName: '',
    externalSku: '',
    quantity: 1
  });
  const [skuSearchResults, setSkuSearchResults] = useState([]);
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);

  // Update boxes state when shipment prop changes
  useEffect(() => {
    setBoxes(shipment.boxes || []);
  }, [shipment.boxes]);

  // Handle clicking outside SKU suggestions
  useEffect(() => {
    if (showSkuSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSkuSuggestions]);


  // Modal state for adding/editing boxes
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [isRemoving, setIsRemoving] = useState(false);
  const [newBox, setNewBox] = useState({
    id: undefined,
    boxNo: '',
    isShortBox: false,
    products: [],
    weight: 0,
    length: 0,
    height: 0,
    width: 0,
    volume: 0,
    volumeWeight: 0,
    finalWeight: 0
  });

  const calculateVolume = (length, height, width) => ((length || 0) * (height || 0) * (width || 0)).toFixed(2);
  const calculateVolumeWeight = (length, height, width) => (((length || 0) * (height || 0) * (width || 0)) / 4500).toFixed(2);
  const calculateFinalWeight = (boxWeight, volumeWeight) =>
    Math.max(parseFloat(boxWeight || 0), parseFloat(volumeWeight || 0)).toFixed(2);

  // Calculate total weight and charged weight for the shipment
  const calculateShipmentWeights = (boxesArray) => {
    let totalWeight = 0;
    let totalVolumeWeight = 0;
    
    boxesArray.forEach(box => {
      totalWeight += parseFloat(box.finalWeight || 0);
      totalVolumeWeight += parseFloat(box.volumeWeight || 0);
    });
    
    const chargedWeight = Math.max(totalWeight, totalVolumeWeight);
    
    return {
      totalWeight: totalWeight.toFixed(2),
      totalVolumeWeight: totalVolumeWeight.toFixed(2),
      chargedWeight: chargedWeight.toFixed(2)
    };
  };

  const handleProductChange = (field, value) => {
    setCurrentProduct(prev => ({ ...prev, [field]: value }));
    if (field === 'sku') {
      const product = products.find(p => p.sku === value);
      if (product) setCurrentProduct(prev => ({ ...prev, productName: product.productName }));
      else setCurrentProduct(prev => ({ ...prev, productName: '' }));
    }
  };

  const handleSkuChange = (e) => {
    const skuValue = e.target.value.toUpperCase();
    setCurrentProduct(prev => ({ ...prev, sku: skuValue }));

    if (skuValue.length >= 2) {
      // Search for products with matching SKU or productName
      const matchingProducts = products.filter(product => 
        product.sku.toLowerCase().includes(skuValue.toLowerCase()) ||
        product.productName.toLowerCase().includes(skuValue.toLowerCase())
      );
      setSkuSearchResults(matchingProducts);
      setShowSkuSuggestions(matchingProducts.length > 0);
    } else {
      setSkuSearchResults([]);
      setShowSkuSuggestions(false);
    }
  };

  const handleSkuSelect = (selectedProduct) => {
    setCurrentProduct({
      sku: `${selectedProduct.sku} - ${selectedProduct.productName}`,
      productName: selectedProduct.productName,
      externalSku: '',
      quantity: 1
    });
    setShowSkuSuggestions(false);
    setSkuSearchResults([]);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.sku-suggestions-container')) {
      setShowSkuSuggestions(false);
    }
    if (!e.target.closest('.customer-suggestions-container')) {
      setShowCustomerSuggestions(false);
    }
  };

  const handleCustomerSearch = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    // Clear form data when user types (forces selection from dropdown)
    setFormData(prev => ({ ...prev, customer: '', partyName: '' }));
    setSelectedCustomer(null);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm(`${customer.code} - ${customer.name}`);
    setFormData(prev => ({ 
      ...prev, 
      customer: customer._id || customer.id,
      partyName: customer.name 
    }));
    setShowCustomerSuggestions(false);
  };

  /** Add product either to modal's newBox (when modal open) or to editingBox (inline edit) */
  const addProductToBox = () => {
    if (!currentProduct.sku || !currentProduct.quantity) return;

    // Extract just the SKU part (before the " - ") for product lookup
    const skuOnly = currentProduct.sku.split(' - ')[0];
    const product = products.find(p => p.sku === skuOnly);
    if (!product) return;

    const item = {
      id: Date.now().toString(),
      sku: skuOnly, // Store just the SKU, not the full format
      productName: product.productName,
      externalSku: currentProduct.externalSku || '',
      quantity: parseInt(currentProduct.quantity) || 1,
      product: product._id || product.id // Add the required 'product' field (Product ObjectId)
    };

    if (showBoxModal) {
      setNewBox(prev => ({ ...prev, products: [...prev.products, item] }));
    } else if (editingBox) {
      setEditingBox(prev => ({ ...prev, products: [...prev.products, item] }));
    } else {
      // Not adding anywhere (no context)
      return;
    }
    setCurrentProduct({ sku: '', productName: '', externalSku: '', quantity: 1 });
  };



  const removeProductFromExistingBox = (boxId, productId) => {
    setBoxes(prev =>
      prev.map(box => (box.id === boxId ? { ...box, products: box.products.filter(p => p.id !== productId) } : box))
    );
  };


  /** Open modal to edit an existing box */
  const editBox = (box) => {
    setModalMode('edit');
    setNewBox({ ...box });        // edit inside modal
    setEditingBox({ ...box });    // also track inline state (used by inline editor section, if you want)
    setShowBoxModal(true);
  };

  const closeBoxModal = () => {
    setShowBoxModal(false);
    setNewBox({
      id: undefined,
      boxNo: '',
      isShortBox: false,
      products: [],
      weight: 0,
      length: 0,
      height: 0,
      width: 0,
      volume: 0,
      volumeWeight: 0,
      finalWeight: 0
    });
    setCurrentProduct({ sku: '', productName: '', externalSku: '', quantity: 1 });
  };

  /** Add a new box (modalMode = 'add') */
  const addNewBox = () => {
    if (!newBox.length || !newBox.height || !newBox.width || !newBox.weight) return;
    if (newBox.products.length === 0) return;

    const volume = calculateVolume(newBox.length, newBox.height, newBox.width);
    const volumeWeight = calculateVolumeWeight(newBox.length, newBox.height, newBox.width);
    const finalWeight = calculateFinalWeight(newBox.weight, volumeWeight);

    const boxToAdd = {
      ...newBox,
      id: Date.now().toString(),
      volume: parseFloat(volume),
      volumeWeight: parseFloat(volumeWeight),
      finalWeight: parseFloat(finalWeight)
    };

    setBoxes(prev => [...prev, boxToAdd]);
    closeBoxModal();
  };

  /** Save changes to an existing box (modalMode = 'edit') */
  const updateExistingBox = () => {
    if (!newBox.boxNo || newBox.products.length === 0) return;

    const volume = calculateVolume(newBox.length, newBox.height, newBox.width);
    const volumeWeight = calculateVolumeWeight(newBox.length, newBox.height, newBox.width);
    const finalWeight = calculateFinalWeight(newBox.weight, volumeWeight);

    const updated = {
      ...newBox,
      volume: parseFloat(volume),
      volumeWeight: parseFloat(volumeWeight),
      finalWeight: parseFloat(finalWeight)
    };

    setBoxes(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    setEditingBox(null);
    closeBoxModal();
  };

  const removeBox = (boxIdentifier) => {
        if (isRemoving) {
      return;
    }
    
    // If boxIdentifier is undefined, we can't remove
    if (!boxIdentifier) {
      setIsRemoving(false);
      return;
    }
    
    setIsRemoving(true);
    
    // Use functional state update to ensure we're working with the latest state
    setBoxes(prevBoxes => {
      // Try to remove by ID first, then by boxNo as fallback
      let updatedBoxes;
      if (prevBoxes.some(box => box.id === boxIdentifier)) {
        // Remove by ID
        updatedBoxes = prevBoxes.filter(box => box.id !== boxIdentifier);
      } else if (prevBoxes.some(box => box.boxNo === boxIdentifier)) {
        // Remove by boxNo
        updatedBoxes = prevBoxes.filter(box => box.boxNo !== boxIdentifier);
      } else {
        setIsRemoving(false);
        return prevBoxes;
      }
      
      const renumberedBoxes = updatedBoxes.map((box, index) => ({
        ...box,
        boxNo: (index + 1).toString()
      }));
      
      // Reset the removing flag after a short delay
      setTimeout(() => {
        setIsRemoving(false);
      }, 100);
      
      return renumberedBoxes;
    });
  };

  /** Inline editing save/cancel (the compact editor block) */
  const saveBoxEdit = () => {
    if (!editingBox?.boxNo || editingBox.products.length === 0) return;

    const volume = calculateVolume(editingBox.length, editingBox.height, editingBox.width);
    const volumeWeight = calculateVolumeWeight(editingBox.length, editingBox.height, editingBox.width);
    const finalWeight = calculateFinalWeight(editingBox.weight, volumeWeight);

    const updated = {
      ...editingBox,
      volume: parseFloat(volume),
      volumeWeight: parseFloat(volumeWeight),
      finalWeight: parseFloat(finalWeight)
    };

    setBoxes(prev => {
      const updatedBoxes = prev.map(b => (b.id === updated.id ? updated : b));
      return updatedBoxes;
    });
    setEditingBox(null);
  };

  const cancelBoxEdit = () => setEditingBox(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate that a customer was selected
    if (!selectedCustomer) {
      alert('Please select a customer from the dropdown list.');
      return;
    }
    
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



    const updatedShipment = {
      ...shipment,
      ...formData,
      date: formData.date,
      boxes: processedBoxes
    };
    
    
    onSave(updatedShipment);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Shipment Information - Compact */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '4px',
        padding: '8px',
        marginBottom: '8px',
        border: '1px solid #dee2e6'
      }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 0.8fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Date</label>
            <input
              type="date"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Invoice</label>
            <input
              type="text"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
              value={formData.invoiceNo}
              onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
              required
            />
          </div>

          <div className="customer-suggestions-container" style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Customer</label>
            <input
              type="text"
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                border: selectedCustomer ? '2px solid #28a745' : '1px solid #ced4da', 
                borderRadius: '4px', 
                fontSize: '13px',
                backgroundColor: selectedCustomer ? '#f8fff9' : 'white'
              }}
              value={customerSearchTerm}
              onChange={handleCustomerSearch}
              required
              placeholder="Search customer by code or name..."
              autoComplete="off"
            />
            {showCustomerSuggestions && filteredCustomers.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {filteredCustomers.map(customer => (
                  <div
                    key={customer._id || customer.id}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8f9fa',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div style={{ fontWeight: 'bold', color: '#495057' }}>
                      {customer.code}
                    </div>
                    <div style={{ color: '#6c757d', fontSize: '12px' }}>
                      {customer.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Quantity</label>
            <input
              type="number"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
              value={formData.requiredQty || ''}
              onChange={(e) => setFormData({ ...formData, requiredQty: e.target.value })}
              required
              placeholder="Qty"
              min="1"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Start</label>
            <input
              type="text"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', backgroundColor: '#f8f9fa', color: '#495057' }}
              value={formData.startTime}
              readOnly
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>End</label>
            <input
              type="text"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', backgroundColor: '#f8f9fa', color: '#495057' }}
              value={formData.endTime}
              readOnly
            />
          </div>
        </div>
      </div>
       {/* Weight Summary */}
      {boxes.length > 0 && (
        <div style={{
          backgroundColor: '#e8f4fd',
          borderRadius: '4px',
          border: '2px solid #b3d9ff',
          padding: '8px',
          marginBottom: '8px'
        }}>
          <h5 style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#2c3e50' }}>📊 Current Weight Summary</h5>
          {(() => {
            const weights = calculateShipmentWeights(boxes);
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '15px',
                fontSize: '13px'
              }}>
                <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                  <strong style={{ color: '#2c3e50' }}>Total Weight:</strong>
                  <br />
                  <span style={{ color: '#6c757d' }}>{weights.totalWeight} kg</span>
                </div>
                <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                  <strong style={{ color: '#2c3e50' }}>Volume Weight:</strong>
                  <br />
                  <span style={{ color: '#6c757d' }}>{weights.totalVolumeWeight} kg</span>
                </div>
                <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                  <strong style={{ color: '#2c3e50' }}>Charged Weight:</strong>
                  <br />
                  <span style={{ color: '#6c757d' }}>{weights.chargedWeight} kg</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}




      {/* Current Boxes */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '15px', marginBottom: '15px', border: '1px solid #dee2e6' }}>
        <h4 style={{ fontSize: '16px', margin: '0 0 12px 0', color: '#2c3e50' }}>Current Boxes ({boxes.length})</h4>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>Box #</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>Type</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>Products</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>Weight</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>Dimensions</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #dee2e6', fontSize: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {boxes.map(box => (
                <tr key={box.id} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: box.isShortBox ? '#ffe6e6' : 'transparent' }}>
                  <td style={{ padding: '8px', fontWeight: '600', color: '#2c3e50' }}>Box #{box.boxNo}</td>
                  <td style={{ padding: '8px', fontSize: '12px', textAlign: 'center' }}>
                    {box.isShortBox ? (
                      <span style={{ backgroundColor: '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        SHORT
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#28a745', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        NORMAL
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px', maxWidth: '250px' }}>
                    {box.products.map(product => (
                      <div key={product.id} style={{ padding: '4px 6px', margin: '1px 0', backgroundColor: '#f8f9fa', borderRadius: '3px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500' }}>{product.sku}</span>
                        <span style={{ backgroundColor: '#28a745', color: 'white', padding: '1px 4px', borderRadius: '2px', fontSize: '9px' }}>
                          {product.quantity}
                        </span>
                        <button
                          type="button"
                          style={{ padding: '1px 4px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '2px', fontSize: '9px', cursor: 'pointer' }}
                          onClick={() => removeProductFromExistingBox(box.id, product.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '8px', fontSize: '11px' }}>
                    <div><strong>Box:</strong> {box.weight}</div>
                    <div><strong>Final:</strong> {box.finalWeight}</div>
                  </td>
                  <td style={{ padding: '8px', fontSize: '11px' }}>
                    {box.length} × {box.height} × {box.width}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button
                      type="button"
                      style={{ padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', marginRight: '3px' }}
                      onClick={() => editBox(box)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={{ padding: '4px 8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', marginRight: '3px' }}
                      onClick={() => {
                        // Copy the box
                        const copiedBox = {
                          ...box,
                          id: `box_${Date.now()}`,
                          boxNo: (boxes.length + 1).toString(),
                          products: (box.products || []).map(product => ({
                            ...product,
                            id: Date.now().toString() + Math.random().toString(36).slice(2, 11)
                          }))
                        };
                        setBoxes(prev => [...prev, copiedBox]);
                      }}
                      title="Copy this box"
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
                        
                        // If box has no ID, we'll use the boxNo as a fallback
                        const boxIdentifier = box.id || box.boxNo;
                        if (!boxIdentifier) {
                          return;
                        }
                        
                        if (window.confirm(`Are you sure you want to remove Box #${box.boxNo}?`)) {
                          removeBox(boxIdentifier);
                        }
                      }}
                    >
                      {isRemoving ? 'Removing...' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Inline compact editor (this was the "some bracket" culprit) */}
      {editingBox && (
        <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 12, marginBottom: 15 }}>
          <h5 style={{ marginTop: 0 }}>Quick Edit: Box #{editingBox.boxNo}</h5>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#34495e', fontSize: '11px' }}>Box No</label>
              <input
                type="text"
                style={{ width: '100%', padding: '5px 6px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '12px' }}
                value={editingBox.boxNo}
                onChange={(e) => setEditingBox(prev => ({ ...prev, boxNo: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#34495e', fontSize: '11px' }}>Weight</label>
              <input
                type="number"
                style={{ width: '100%', padding: '5px 6px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '12px' }}
                value={editingBox.weight}
                onChange={(e) => setEditingBox(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#34495e', fontSize: '11px' }}>Length</label>
              <input
                type="number"
                style={{ width: '100%', padding: '5px 6px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '12px' }}
                value={editingBox.length}
                onChange={(e) => setEditingBox(prev => ({ ...prev, length: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#34495e', fontSize: '11px' }}>Height</label>
              <input
                type="number"
                style={{ width: '100%', padding: '5px 6px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '12px' }}
                value={editingBox.height}
                onChange={(e) => setEditingBox(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#34495e', fontSize: '11px' }}>Width</label>
              <input
                type="number"
                style={{ width: '100%', padding: '5px 6px', border: '1px solid #ced4da', borderRadius: '3px', fontSize: '12px' }}
                value={editingBox.width}
                onChange={(e) => setEditingBox(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}
              onClick={saveBoxEdit}
            >
              Save Changes
            </button>
            <button
              type="button"
              style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px', cursor: 'pointer', marginLeft: '8px' }}
              onClick={cancelBoxEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}



      {/* Box Modal (Add/Edit) */}
      {showBoxModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: 'white', borderRadius: '12px', padding: '30px',
              maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', margin: 0, color: '#2c3e50' }}>
                {modalMode === 'edit' ? 'Edit' : 'Add'} {newBox.isShortBox ? 'Short ' : ''}Box #{newBox.boxNo}
              </h2>
              <button
                type="button"
                onClick={closeBoxModal}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6c757d' }}
              >
                ×
              </button>
            </div>

            {/* Box Dimensions */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', margin: '0 0 15px 0', color: '#34495e' }}>Box Dimensions</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e' }}>Length (CM)</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '12px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '14px' }}
                    value={newBox.length}
                    onChange={(e) => setNewBox(prev => ({ ...prev, length: parseFloat(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e' }}>Height (CM)</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '12px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '14px' }}
                    value={newBox.height}
                    onChange={(e) => setNewBox(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e' }}>Width (CM)</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '12px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '14px' }}
                    value={newBox.width}
                    onChange={(e) => setNewBox(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e' }}>Weight (KG)</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '12px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '14px' }}
                    value={newBox.weight}
                    onChange={(e) => setNewBox(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Add Products (inside modal) */}
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', margin: '0 0 15px 0', color: '#34495e' }}>
                Add Products to Box
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.5fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="sku-suggestions-container" style={{ position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e', fontSize: '13px' }}>SKU</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                    value={currentProduct.sku}
                    onChange={handleSkuChange}
                    placeholder="Type SKU or product name to search..."
                    autoComplete="off"
                  />
                  {showSkuSuggestions && skuSearchResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderTop: 'none',
                      borderRadius: '0 0 6px 6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {skuSearchResults.map(product => (
                        <div
                          key={product._id}
                          style={{
                            padding: '10px 15px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee',
                            fontSize: '12px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                          onClick={() => handleSkuSelect(product)}
                        >
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '2px' }}>
                            {product.sku} - {product.productName}
                          </div>
                          <div style={{ fontSize: '10px', color: '#999' }}>
                            {product.categoryId?.name} ({product.categoryId?.superCategoryId?.name})
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e', fontSize: '13px' }}>External SKU</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                    value={currentProduct.externalSku}
                    onChange={(e) => handleProductChange('externalSku', e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e', fontSize: '13px' }}>Quantity</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '10px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                    value={currentProduct.quantity}
                    onChange={(e) => handleProductChange('quantity', parseInt(e.target.value) || 1)}
                    min="1"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    style={{ padding: '10px 20px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', width: '100%' }}
                    onClick={addProductToBox}
                  >
                    Add Product
                  </button>
                </div>
              </div>
            </div>

            {/* Current Products in Modal */}
            {newBox.products.length > 0 && (
              <div style={{ padding: '20px', backgroundColor: '#e8f4fd', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', margin: '0 0 15px 0', color: '#34495e' }}>Current Products in Box</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {newBox.products.map(product => (
                    <div key={product.id} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '12px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{product.sku}</div>
                      <div style={{ color: '#6c757d', marginBottom: '4px' }}>{product.productName}</div>
                      {product.externalSku && (
                        <div style={{ color: '#17a2b8', fontSize: '11px', fontStyle: 'italic', marginBottom: '4px' }}>
                          Ext: {product.externalSku}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ backgroundColor: '#28a745', color: 'white', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                          Qty: {product.quantity}
                        </span>
                        <button
                          type="button"
                          style={{ padding: '2px 6px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}
                          onClick={() => setNewBox(prev => ({ ...prev, products: prev.products.filter(p => p.id !== product.id) }))}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', borderTop: '1px solid #dee2e6', paddingTop: '20px' }}>
              <button
                type="button"
                style={{ padding: '12px 30px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}
                onClick={modalMode === 'edit' ? updateExistingBox : addNewBox}
              >
                {modalMode === 'edit' ? 'Save Changes' : 'Add Box'}
              </button>
              <button
                type="button"
                style={{ padding: '12px 30px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}
                onClick={closeBoxModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '12px 0', flexWrap: 'wrap' }}>
        <button
          type="button"
          style={{
            padding: '6px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            minWidth: '100px'
          }}
          onClick={() => {
            const newBox = {
              id: `box_${Date.now()}`,
              boxNo: (boxes.length + 1).toString(),
              isShortBox: false,
              products: [],
              weight: 0,
              length: 0,
              height: 0,
              width: 0,
              volume: 0,
              volumeWeight: 0,
              finalWeight: 0
            };
            setNewBox(newBox);
            setModalMode('add');
            setShowBoxModal(true);
          }}
        >
          Add Box
        </button>
        
        <button
          type="button"
          style={{
            padding: '6px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            minWidth: '100px'
          }}
          onClick={() => {
            const newBox = {
              id: `box_${Date.now()}`,
              boxNo: (boxes.length + 1).toString(),
              isShortBox: true,
              products: [],
              weight: 0,
              length: 0,
              height: 0,
              width: 0,
              volume: 0,
              volumeWeight: 0,
              finalWeight: 0
            };
            setNewBox(newBox);
            setModalMode('add');
            setShowBoxModal(true);
          }}
        >
          Add Short Box
        </button>



        <button
          type="submit"
          style={{
            padding: '6px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            minWidth: '100px'
          }}
        >
          Save Changes
        </button>

        <button
          type="button"
          style={{
            padding: '6px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            minWidth: '100px'
          }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

/** =============================
 *  Shipments (list + actions)
 *  ============================= */
const Shipments = ({ shipments, totalShipments, products, onUpdate, onDelete }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const [editingShipment, setEditingShipment] = useState(null);

  // Runtime weight calculation function
  const calculateShipmentWeights = (boxes) => {
    if (!boxes || boxes.length === 0) {
      return { totalWeight: 0, chargedWeight: 0 };
    }
    
    let totalWeight = 0;
    let totalVolumeWeight = 0;
    
    boxes.forEach(box => {
      totalWeight += parseFloat(box.finalWeight || 0);
      totalVolumeWeight += parseFloat(box.volumeWeight || 0);
    });
    
    const chargedWeight = Math.max(totalWeight, totalVolumeWeight);
    
    return {
      totalWeight: totalWeight.toFixed(2),
      chargedWeight: chargedWeight.toFixed(2)
    };
  };
  const [showEditModal, setShowEditModal] = useState(false);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showEditModal) {
        setShowEditModal(false);
      }
    };

    if (showEditModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showEditModal]);

  const filteredShipments = shipments.filter(shipment => {
    const q = searchTerm.toLowerCase();
    return shipment.invoiceNo.toLowerCase().includes(q) || shipment.partyName.toLowerCase().includes(q);
  });

  const handleEdit = (shipment) => {
    setEditingShipment(shipment);
    setShowEditModal(true);
  };

  const handleSaveEdit = (updatedShipment) => {
    onUpdate(updatedShipment);
    setShowEditModal(false);
    setEditingShipment(null);
  };

  const handleDelete = (shipmentId) => {
    if (window.confirm('Are you sure you want to delete this shipment?')) {
      onDelete(shipmentId);
    }
  };


  const viewDetails = (shipment) => {
    // if you want modal: setSelectedShipment(shipment); setShowDetailsModal(true);
    navigate(`/shipments/${shipment.id}`);
  };



  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="count-badge">
            {searchTerm ? `Showing: ${filteredShipments.length} of ${totalShipments}` : `Total Shipments: ${totalShipments}`}
          </div>
        </div>

        <div className="search-bar">
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search by invoice number or party name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice No</th>
              <th>Party Name</th>
              <th>Boxes</th>
              <th>Total Weight</th>
              <th>Charged Weight</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map(shipment => {
              const weights = calculateShipmentWeights(shipment.boxes);
              return (
              <tr key={shipment.id}>
                <td>{format(new Date(shipment.date), 'MMM dd, yyyy')}</td>
                <td>{shipment.invoiceNo}</td>
                <td>{shipment.partyName}</td>
                <td>{shipment.boxes.length}</td>
                <td>{weights.totalWeight} kg</td>
                <td>{weights.chargedWeight} kg</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => viewDetails(shipment)}>
                    Details
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleEdit(shipment)} style={{ marginLeft: '0.5rem' }}>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(shipment.id)} style={{ marginLeft: '0.5rem' }}>
                    Delete
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {filteredShipments.length === 0 && (
          <p className="text-center text-muted">
            {searchTerm ? 'No shipments found matching your criteria.' : 'No shipments yet. Create your first shipment!'}
          </p>
        )}
      </div>



      {/* Edit Shipment Modal */}
      {showEditModal && editingShipment && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Shipment - {editingShipment.invoiceNo}</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>

            <div className="modal-body">
            <EditShipmentForm
                key={editingShipment.id}
              shipment={editingShipment}
              products={products}
              onSave={handleSaveEdit}
              onCancel={() => setShowEditModal(false)}
            />
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Shipments;
