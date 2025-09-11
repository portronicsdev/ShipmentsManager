import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { v4 as uuidv4 } from 'uuid';
import localDB from '../utils/localStorage';
import api from '../utils/api';
import BoxLabel, { LabelCanvas } from './BoxLabel';

const CreateShipment = ({ products = [], onAdd }) => {
  const navigate = useNavigate();

  // Initialize form data from localStorage if available
  const getInitialFormData = () => {
    const savedFormData = localDB.get('tempShipmentForm') || {};
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return {
      date: savedFormData.date || today,
      invoiceNo: savedFormData.invoiceNo || '',
      quantityToBePacked: savedFormData.quantityToBePacked || '',
      customer: savedFormData.customer || '',
      startTime: savedFormData.startTime || currentTime,
      endTime: savedFormData.endTime || ''
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

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
  const [skuSearchResults, setSkuSearchResults] = useState([]);
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);
  const [skuHighlightedIndex, setSkuHighlightedIndex] = useState(-1);
  
  // Customer dropdown states
  const [customers, setCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState(-1);

  const [editingBox, setEditingBox] = useState(null);
  const [errors, setErrors] = useState({});
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [isRemoving, setIsRemoving] = useState(false);

  // Print functionality
  const [showBoxLabel, setShowBoxLabel] = useState(false);
  const [selectedBox, setSelectedBox] = useState(null);
  
  const printBox = (box) => {
    setSelectedBox(box);
    setShowBoxLabel(true);
  };
  
  const closeBoxLabel = () => {
    setShowBoxLabel(false);
    setSelectedBox(null);
  };

  // ======= BULK PRINT =======
  const bulkRef = useRef(null);
  const bulkPageStyle = `
    @page { size: 6in 4in; margin: 0; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `;
  const handleBulkPrint = useReactToPrint({
    contentRef: bulkRef,            // v3
    content: () => bulkRef.current, // v2 fallback
    pageStyle: bulkPageStyle,
    removeAfterPrint: false,
    documentTitle: `Shipment_${formData.invoiceNo || 'labels'}`,
  });
  // ===========================

  // Load customers and saved boxes
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await api.getCustomers();
        if (response?.success) {
          setCustomers(response.data.customers);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };

    loadCustomers();

    const savedBoxes = localDB.get('tempBoxes') || [];
    if (savedBoxes.length > 0) {
      setBoxes(savedBoxes);
      setCurrentBox(prev => ({ ...prev, boxNo: (savedBoxes.length + 1).toString() }));
    }
  }, [products]);

  // Restore customer selection if stored
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomer) {
      const customerId = formData.customer;
      if (customerId) {
        const foundCustomer = customers.find(c => (c._id || c.id) === customerId);
        if (foundCustomer) {
          setSelectedCustomer(foundCustomer);
          setCustomerSearchTerm(`${foundCustomer.code} - ${foundCustomer.name}`);
        }
      }
    }
  }, [customers, formData.customer, selectedCustomer]);

  // Persist form
  useEffect(() => {
    localDB.set('tempShipmentForm', formData);
  }, [formData]);

  // Filter customers
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

  // Outside click dismiss for suggestions
  useEffect(() => {
    if (!showSkuSuggestions && !showCustomerSuggestions) return;
    const onClick = (e) => {
      if (!e.target.closest('.sku-suggestions-container')) {
        setShowSkuSuggestions(false);
      }
      if (!e.target.closest('.customer-suggestions-container')) {
        setShowCustomerSuggestions(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [showSkuSuggestions, showCustomerSuggestions]);

  // Escape key to close things
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key !== 'Escape') return;
      if (showBoxModal) {
        setShowBoxModal(false);
        setEditingBox(null);
        setModalMode('add');
      } else if (showBoxLabel) {
        setShowBoxLabel(false);
        setSelectedBox(null);
      } else if (showCustomerSuggestions) {
        setShowCustomerSuggestions(false);
        setCustomerHighlightedIndex(-1);
      } else if (showSkuSuggestions) {
        setShowSkuSuggestions(false);
        setSkuHighlightedIndex(-1);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showBoxModal, showBoxLabel, showCustomerSuggestions, showSkuSuggestions]);

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
        productName: product ? product.productName : ''
      }));
    }
  };

  const handleSkuChange = (e) => {
    const skuValue = e.target.value.toUpperCase();
    setCurrentProduct(prev => ({ ...prev, sku: skuValue }));
    setSkuHighlightedIndex(-1);

    if (skuValue.length >= 2) {
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

  const handleSkuKeyDown = (e) => {
    if (!showSkuSuggestions || skuSearchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSkuHighlightedIndex(prev => {
          const newIndex = prev < skuSearchResults.length - 1 ? prev + 1 : 0;
          setTimeout(() => {
            const dropdown = document.querySelector('.sku-dropdown');
            const highlightedItem = dropdown?.querySelector(`[data-index="${newIndex}"]`);
            highlightedItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }, 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSkuHighlightedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : skuSearchResults.length - 1;
          setTimeout(() => {
            const dropdown = document.querySelector('.sku-dropdown');
            const highlightedItem = dropdown?.querySelector(`[data-index="${newIndex}"]`);
            highlightedItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }, 0);
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (skuHighlightedIndex >= 0 && skuHighlightedIndex < skuSearchResults.length) {
          handleSkuSelect(skuSearchResults[skuHighlightedIndex]);
        }
        break;
      default:
        break;
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
    setFormData(prev => ({ ...prev, customer: '' }));
    setSelectedCustomer(null);
    setCustomerHighlightedIndex(-1);
  };

  const handleCustomerKeyDown = (e) => {
    if (!showCustomerSuggestions || filteredCustomers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCustomerHighlightedIndex(prev => {
          const newIndex = prev < filteredCustomers.length - 1 ? prev + 1 : 0;
          setTimeout(() => {
            const dropdown = document.querySelector('.customer-dropdown');
            const highlightedItem = dropdown?.querySelector(`[data-index="${newIndex}"]`);
            highlightedItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }, 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCustomerHighlightedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : filteredCustomers.length - 1;
          setTimeout(() => {
            const dropdown = document.querySelector('.customer-dropdown');
            const highlightedItem = dropdown?.querySelector(`[data-index="${newIndex}"]`);
            highlightedItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }, 0);
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (customerHighlightedIndex >= 0 && customerHighlightedIndex < filteredCustomers.length) {
          handleCustomerSelect(filteredCustomers[customerHighlightedIndex]);
        }
        break;
      default:
        break;
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm(`${customer.code} - ${customer.name}`);
    setFormData(prev => ({ 
      ...prev, 
      customer: customer._id || customer.id
    }));
    setShowCustomerSuggestions(false);
  };

  const addProductToBoxImpl = (targetBoxSetter, targetBox) => {
    if (!currentProduct.sku || !currentProduct.quantity) {
      setErrors({ message: 'Please fill in SKU and quantity for the product.' });
      return;
    }

    const skuOnly = currentProduct.sku.split(' - ')[0];
    const product = products.find(p => p.sku === skuOnly);
    if (!product) {
      setErrors({ message: `Product with SKU ${skuOnly} not found.` });
      return;
    }

    const newProduct = {
      id: Date.now().toString(),
      sku: skuOnly,
      productName: product.productName,
      externalSku: currentProduct.externalSku || '',
      quantity: parseInt(currentProduct.quantity) || 1,
      product: product._id || product.id
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
    if (!currentBox.isShortBox) {
      if (!currentBox.length || !currentBox.height || !currentBox.width || !currentBox.weight) {
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
    if (isRemoving) return;

    setIsRemoving(true);

    setBoxes(prevBoxes => {
      const updatedBoxes = prevBoxes.filter(box => box.id !== boxId);
      const renumberedBoxes = updatedBoxes.map((box, index) => ({
        ...box,
        boxNo: (index + 1).toString()
      }));
      localDB.set('tempBoxes', renumberedBoxes);

      setTimeout(() => setIsRemoving(false), 100);
      setCurrentBox(prev => ({ ...prev, boxNo: (renumberedBoxes.length + 1).toString() }));

      return renumberedBoxes;
    });
  };

  const openAddBoxModal = (isShortBox = false) => {
    if (isShortBox) {
      const existingShortBox = boxes.find(box => box.isShortBox);
      if (existingShortBox) {
        setErrors({ message: 'Only one Short Box is allowed per shipment.' });
        return;
      }
    }
    
    setModalMode('add');

    const shortBoxDimensions = {
      length: 0,
      height: 0,
      width: 0,
      weight: 0
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer) {
      setErrors({ message: 'Please select a valid Customer.' });
      return;
    }
    if (!formData.invoiceNo || !formData.customer || !formData.quantityToBePacked || boxes.length === 0) {
      setErrors({ message: 'Please fill in all required fields and add at least one box.' });
      return;
    }

    if (!selectedCustomer) {
      setErrors({ message: 'Please select a customer from the dropdown list.' });
      return;
    }

    const totalInvoiceQty = boxes.reduce(
      (sum, box) => sum + box.products.reduce((boxSum, product) => boxSum + (parseInt(product.quantity) || 0), 0),
      0
    );
    
    const requiredQty = parseInt(formData.quantityToBePacked) || 0;
    
    if (totalInvoiceQty !== requiredQty) {
      setErrors({ 
        message: `Packed Quantity (${totalInvoiceQty}) must equal Total Quantity (${requiredQty}). Please adjust your boxes or total quantity.` 
      });
      return;
    }

    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const processedBoxes = boxes.map(box => ({
      ...box,
      products: box.products.map(product => {
        const foundProduct = products.find(p => p.sku === product.sku);
        if (!foundProduct) return product;
        return { ...product, product: foundProduct._id || foundProduct.id };
      })
    }));

    const shipment = {
      id: uuidv4(),
      date: formData.date,
      invoiceNo: formData.invoiceNo,
      customer: formData.customer,
      requiredQty: parseInt(formData.quantityToBePacked),
      startTime: formData.startTime,
      endTime,
      boxes: processedBoxes
    };

    try {
      const result = await onAdd?.(shipment);
      if (result && result.success) {
        localDB.remove('tempBoxes');
        localDB.remove('tempShipmentForm');
        navigate('/shipments');
      } else if (result && result.error) {
        setErrors({ message: result.error });
      }
    } catch (error) {
      console.error('Error submitting shipment:', error);
      setErrors({ message: 'Failed to create shipment. Please try again.' });
    }
  };

  const handleTempSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer) {
      setErrors({ message: 'Please select a valid Customer.' });
      return;
    }
    if (!formData.invoiceNo || !formData.customer || boxes.length === 0) {
      setErrors({ message: 'Please fill in all required fields and add at least one box.' });
      return;
    }

    if (!selectedCustomer) {
      setErrors({ message: 'Please select a customer from the dropdown list.' });
      return;
    }

    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const processedBoxes = boxes.map(box => ({
      ...box,
      products: box.products.map(product => {
        const foundProduct = products.find(p => p.sku === product.sku);
        if (!foundProduct) return product;
        return { ...product, product: foundProduct._id || foundProduct.id };
      })
    }));

    const shipment = {
      id: uuidv4(),
      date: formData.date,
      invoiceNo: formData.invoiceNo,
      customer: formData.customer,
      requiredQty: parseInt(formData.quantityToBePacked) || 0,
      startTime: formData.startTime,
      endTime,
      boxes: processedBoxes,
      isTempShipment: true
    };

    try {
      const result = await onAdd?.(shipment);
      if (result && result.success) {
        localDB.remove('tempBoxes');
        localDB.remove('tempShipmentForm');
        navigate('/shipments');
      } else if (result && result.error) {
        setErrors({ message: result.error });
      }
    } catch (error) {
      console.error('Error submitting temp shipment:', error);
      setErrors({ message: 'Failed to create temporary shipment. Please try again.' });
    }
  };

  const totalInvoiceQty = boxes.reduce(
    (sum, box) => sum + box.products.reduce((boxSum, product) => boxSum + (parseInt(product.quantity) || 0), 0),
    0
  );

  const sumFinalWeight = boxes.reduce((sum, box) => sum + (box.finalWeight || 0), 0).toFixed(2);
  const sumVolWeight = boxes.reduce((sum, box) => sum + (box.volumeWeight || 0), 0).toFixed(2);
  const sumVolume = boxes.reduce((sum, box) => sum + (box.volume || 0), 0).toFixed(2);
  
  const actualWeight = boxes.reduce((sum, box) => sum + (box.weight || 0), 0).toFixed(2);
  const chargedWeight = boxes.reduce((sum, box) => sum + (box.finalWeight || 0), 0).toFixed(2);

  const requiredQty = parseInt(formData.quantityToBePacked) || 0;
  const isQuantityMatch = totalInvoiceQty === requiredQty;
  const isQuantityValid = requiredQty > 0;

  return (
    <div style={{ padding: '5px', maxWidth: '1200px', margin: '0 auto' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr 2.5fr 0.7fr 0.7fr', gap: '8px', alignItems: 'end' }}>
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

              <div className="customer-suggestions-container" style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '2px', fontWeight: '700', color: '#34495e', fontSize: '10px' }}>
                  Customer <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '4px',
                    border: selectedCustomer ? '2px solid #28a745' : '1px solid #e9ecef',
                    borderRadius: '3px',
                    fontSize: '15px',
                    backgroundColor: selectedCustomer ? '#f8fff9' : 'white'
                  }}
                  value={customerSearchTerm}
                  onChange={handleCustomerSearch}
                  onKeyDown={handleCustomerKeyDown}
                  required
                  placeholder="Search customer by code or name..."
                  autoComplete="off"
                />
                {showCustomerSuggestions && filteredCustomers.length > 0 && (
                  <div 
                    className="customer-dropdown"
                    style={{
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
                    {filteredCustomers.map((customer, index) => (
                      <div
                        key={customer._id || customer.id}
                        data-index={index}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f8f9fa',
                          fontSize: '14px',
                          backgroundColor: index === customerHighlightedIndex ? '#e3f2fd' : 'white'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e3f2fd';
                          setCustomerHighlightedIndex(index);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index === customerHighlightedIndex ? '#e3f2fd' : 'white';
                        }}
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
                      <div style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '12px', color: isQuantityMatch ? '#28a745' : '#dc3545' }}>
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
                    <span style={{ color: '#6c757d', fontSize: '17px', fontWeight: '600' }}>{actualWeight} kg</span>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                    <strong style={{ color: '#2c3e50', fontSize: '11px', display: 'block' }}>Volume Weight</strong>
                    <span style={{ color: '#6c757d', fontSize: '17px', fontWeight: '600' }}>{sumVolWeight} kg</span>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                    <strong style={{ color: '#2c3e50', fontSize: '11px', display: 'block' }}>Charged Weight</strong>
                    <span style={{ color: '#6c757d', fontSize: '17px', fontWeight: '600' }}>{chargedWeight} kg</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== Bulk Print toolbar — above the boxes table ===== */}
          {boxes.length > 0 && (
            <div
              style={{
                width: '98%',
                margin: '8px auto 10px auto',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px'
              }}
            >
              <button
                type="button"
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2d6cdf',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minWidth: '160px',
                }}
                onClick={handleBulkPrint}
              >
                🖨️ Bulk Print ({boxes.length})
              </button>
            </div>
          )}

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
                          <div style={{ 
                            display: 'flex', 
                            gap: '6px', 
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {/* Edit Icon */}
                            <button
                              type="button"
                              title="Edit Box"
                              style={{
                                padding: '6px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#0056b3';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#007bff';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              onClick={() => editBox(box)}
                            >
                              ✏️
                            </button>
                            
                            {/* Copy Icon */}
                            <button
                              type="button"
                              title="Copy Box"
                              style={{
                                padding: '6px',
                                backgroundColor: '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#138496';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#17a2b8';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              onClick={() => copyBox(box)}
                            >
                              📋
                            </button>
                            
                            {/* Print Icon */}
                            <button
                              type="button"
                              title="Print Box Label"
                              style={{
                                padding: '6px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#c82333';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc3545';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              onClick={() => printBox(box)}
                            >
                              🖨️
                            </button>
                            
                            {/* Remove Icon */}
                            <button
                              type="button"
                              title="Remove Box"
                              style={{
                                padding: '6px',
                                backgroundColor: isRemoving ? '#6c757d' : '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isRemoving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              disabled={isRemoving}
                              onMouseEnter={(e) => {
                                if (!isRemoving) {
                                  e.currentTarget.style.backgroundColor = '#c82333';
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isRemoving) {
                                  e.currentTarget.style.backgroundColor = '#dc3545';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to remove Box #${box.boxNo}?`)) {
                                  removeBox(box.id);
                                }
                              }}
                            >
                              {isRemoving ? '⏳' : '🗑️'}
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
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#048923',
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
                Add Box
              </button>
              
              <button
                type="button"
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#9f1321ff',
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
                  backgroundColor: '#121c88',
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
                  backgroundColor: '#e6c14aff',
                  color: 'black',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minWidth: '140px'
                }}
                onClick={handleTempSubmit}
              >
                📝 Save Temp Shipment
              </button>
              
              <button
                type="button"
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#7a8793ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minWidth: '140px'
                }}
                onClick={() => {
                  localDB.remove('tempBoxes');
                  localDB.remove('tempShipmentForm');
                  navigate('/shipments');
                }}
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
            onClick={handleClickOutside}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '15px',
                maxWidth: '800px',
                width: '90%',
                maxHeight: '95vh',
                overflowY: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
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

              {/* Short Box Info */}
              {currentBox.isShortBox && modalMode !== 'edit' && (
                <div style={{ 
                  marginBottom: '10px', 
                  padding: '10px', 
                  backgroundColor: '#fff3cd', 
                  border: '1px solid #ffeaa7', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ fontSize: '14px', margin: '0 0 5px 0', color: '#856404' }}>
                    📦 Short Box - No Dimensions Required
                  </h3>
                  <p style={{ fontSize: '12px', margin: '0', color: '#856404' }}>
                    Short boxes have no physical dimensions and weight. Only products need to be added.
                  </p>
                </div>
              )}

              {/* Add Products */}
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}
              >
                <h4 style={{ fontSize: '12px', margin: '0 0 4px 0', color: '#34495e' }}>
                  {modalMode === 'edit' ? 'Edit Products in Box' : 'Add Products to Box'}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr', gap: '5px', marginBottom: '4px' }}>
                  <div className="sku-suggestions-container" style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>
                      SKU <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="text"
                      style={{ width: '100%', padding: '6px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: '12px' }}
                      value={currentProduct.sku}
                      onChange={handleSkuChange}
                      onKeyDown={handleSkuKeyDown}
                      placeholder="Type SKU or product name to search..."
                      autoComplete="off"
                    />
                    {showSkuSuggestions && skuSearchResults.length > 0 && (
                      <div 
                        className="sku-dropdown"
                        style={{
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
                        {skuSearchResults.map((product, index) => (
                          <div
                            key={product._id || product.id || product.sku}
                            data-index={index}
                            style={{
                              padding: '10px 15px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #eee',
                              fontSize: '12px',
                              backgroundColor: index === skuHighlightedIndex ? '#e3f2fd' : 'white'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e3f2fd';
                              setSkuHighlightedIndex(index);
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = index === skuHighlightedIndex ? '#e3f2fd' : 'white';
                            }}
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
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>
                      Quantity <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="number"
                      style={{ width: '100%', padding: '6px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: '12px' }}
                      value={currentProduct.quantity}
                      onChange={(e) => handleProductChange('quantity', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '3px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>
                      External SKU
                    </label>
                    <input
                      type="text"
                      style={{ width: '100%', padding: '6px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: '12px' }}
                      value={currentProduct.externalSku}
                      onChange={(e) => handleProductChange('externalSku', e.target.value)}
                      placeholder="Optional"
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

              {/* Box Dimensions - Only for Normal Boxes */}
              {!currentBox.isShortBox && modalMode !== 'edit' && (
                <div style={{ marginBottom: '5px' }}>
                  <h3 style={{ fontSize: '14px', margin: '0 0 5px 0', color: '#34495e' }}>Box Dimensions</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>
                        Height (CM) <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                        value={currentBox.height}
                        onChange={(e) => handleBoxChange('height', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>
                        Width (CM) <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                        value={currentBox.width}
                        onChange={(e) => handleBoxChange('width', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>
                        Length (CM) <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                        value={currentBox.length}
                        onChange={(e) => handleBoxChange('length', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>
                        Weight (KG) <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="number"
                        style={{ width: '100%', padding: '8px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                        value={currentBox.weight}
                        onChange={(e) => handleBoxChange('weight', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Current Products in Box */}
              {(modalMode === 'edit' ? (editingBox?.products?.length > 0) : (currentBox.products.length > 0)) && (
                <div
                  style={{
                    padding: '10px',
                    backgroundColor: '#e8f4fd',
                    borderRadius: '6px',
                    marginBottom: '10px'
                  }}
                >
                  <h5 style={{ fontSize: '12px', margin: '0 0 8px 0', color: '#2c3e50' }}>
                    Products in Box #{modalMode === 'edit' ? editingBox?.boxNo : currentBox.boxNo}:
                  </h5>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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

        {/* Box Label Modal */}
        {showBoxLabel && selectedBox && (
          <BoxLabel
            shipment={{
              invoiceNo: formData.invoiceNo,
              date: formData.date,
              startTime: formData.startTime,
              endTime: formData.endTime,
              customer: selectedCustomer,
              createdBy: { name: 'Current User' }
            }}
            box={selectedBox}
            onClose={closeBoxLabel}
          />
        )}
      </div>

      {/* ===== Hidden bulk print stack (one page per label) ===== */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={bulkRef}>
          {boxes.map((b, idx) => (
            <div key={b.id || idx} className="bulk-label">
              <LabelCanvas
                shipment={{
                  invoiceNo: formData.invoiceNo,
                  date: formData.date,
                  customer: selectedCustomer,
                }}
                box={b}
              />
              {idx < boxes.length - 1 && <div className="page-break" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreateShipment;
