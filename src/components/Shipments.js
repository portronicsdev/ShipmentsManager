import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';


/** =============================
 *  EditShipmentForm
 *  ============================= */
const EditShipmentForm = ({ shipment, products, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    date: shipment.date ? new Date(shipment.date).toISOString().split('T')[0] : '',
    invoiceNo: shipment.invoiceNo,
    partyName: shipment.partyName,
    startTime: shipment.startTime || '',
    endTime: shipment.endTime || ''
  });

  const [boxes, setBoxes] = useState(shipment.boxes || []);
  const [editingBox, setEditingBox] = useState(null);

  const [currentProduct, setCurrentProduct] = useState({
    sku: '',
    productName: '',
    quantity: 1
  });

  // Modal state for adding/editing boxes
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
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

  const handleProductChange = (field, value) => {
    setCurrentProduct(prev => ({ ...prev, [field]: value }));
    if (field === 'sku') {
      const product = products.find(p => p.sku === value);
      if (product) setCurrentProduct(prev => ({ ...prev, productName: product.name }));
      else setCurrentProduct(prev => ({ ...prev, productName: '' }));
    }
  };

  /** Add product either to modal's newBox (when modal open) or to editingBox (inline edit) */
  const addProductToBox = () => {
    if (!currentProduct.sku || !currentProduct.quantity) return;

    const product = products.find(p => p.sku === currentProduct.sku);
    if (!product) return;

    const item = {
      id: Date.now().toString(),
      sku: currentProduct.sku,
      productName: product.name,
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
    setCurrentProduct({ sku: '', productName: '', quantity: 1 });
  };



  const removeProductFromExistingBox = (boxId, productId) => {
    setBoxes(prev =>
      prev.map(box => (box.id === boxId ? { ...box, products: box.products.filter(p => p.id !== productId) } : box))
    );
  };

  /** Open modal to add a brand new box */
  const openAddBoxModal = (isShortBox = false) => {
    setModalMode('add');
    setNewBox({
      id: undefined,
      boxNo: (boxes.length + 1).toString(),
      isShortBox,
      products: [],
      weight: 0,
      length: 0,
      height: 0,
      width: 0,
      volume: 0,
      volumeWeight: 0,
      finalWeight: 0
    });
    setCurrentProduct({ sku: '', productName: '', quantity: 1 });
    setShowBoxModal(true);
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
    setCurrentProduct({ sku: '', productName: '', quantity: 1 });
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

  const removeBox = (boxId) => {
    setBoxes(prev => prev.filter(box => box.id !== boxId));
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

    setBoxes(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    setEditingBox(null);
  };

  const cancelBoxEdit = () => setEditingBox(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Process boxes to ensure each product has the required 'product' field (Product ObjectId)
    const processedBoxes = boxes.map(box => ({
      ...box,
      products: box.products.map(product => {
        // Find the product by SKU to get the ObjectId
        const foundProduct = products.find(p => p.sku === product.sku);
        if (!foundProduct) {
          console.error(`Product with SKU ${product.sku} not found`);
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
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ fontSize: '16px', margin: '0 0 12px 0', color: '#2c3e50' }}>Edit Shipment Information</h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
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

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Party</label>
            <input
              type="text"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
              value={formData.partyName}
              onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Start</label>
            <input
              type="datetime-local"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>End</label>
            <input
              type="datetime-local"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>
        </div>
      </div>

     
      {/* Add Box / Short Box buttons */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', justifyContent: 'center' }}>
        <button
          type="button"
          style={{ padding: '12px 30px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', minWidth: '150px' }}
          onClick={() => openAddBoxModal(false)}
        >
          ➕ Add Box
        </button>

        <button
          type="button"
          style={{ padding: '12px 30px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', minWidth: '150px' }}
          onClick={() => openAddBoxModal(true)}
        >
          ⚠️ Add Short Box
        </button>
      </div>

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
                      onClick={() => {/* (intentionally left) add via modal */}}
                      title="Add new products to this box"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}
                      onClick={() => removeBox(box.id)}
                    >
                      Remove
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

      {/* Action Buttons - Compact */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', padding: '15px 0', borderTop: '1px solid #dee2e6', marginTop: '15px' }}>
        <button
          type="submit"
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}
        >
          Save Changes
        </button>
        <button
          type="button"
          style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e', fontSize: '13px' }}>SKU</label>
                  <select
                    style={{ width: '100%', padding: '10px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px' }}
                    value={currentProduct.sku}
                    onChange={(e) => handleProductChange('sku', e.target.value)}
                  >
                    <option value="">Select SKU</option>
                    {products.map((product) => (
                      <option key={product._id || product.id || product.sku} value={product.sku}>
                        {product.sku} - {product.name}
                      </option>
                    ))}
                  </select>
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

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#34495e', fontSize: '13px' }}>Product Name</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '13px', backgroundColor: '#f8f9fa' }}
                    value={currentProduct.productName}
                    readOnly
                    placeholder="Auto-populated from SKU"
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
    </form>
  );
};

/** =============================
 *  Shipments (list + actions)
 *  ============================= */
const Shipments = ({ shipments, products, onUpdate, onDelete }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const [editingShipment, setEditingShipment] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
          <h2 className="card-title">Shipments Management</h2>
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
            {filteredShipments.map(shipment => (
              <tr key={shipment.id}>
                <td>{format(new Date(shipment.date), 'MMM dd, yyyy')}</td>
                <td>{shipment.invoiceNo}</td>
                <td>{shipment.partyName}</td>
                <td>{shipment.boxes.length}</td>
                <td>{shipment.totalWeight?.toFixed(2) || '0.00'} kg</td>
                <td>{shipment.chargedWeight?.toFixed(2) || '0.00'} kg</td>
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
            ))}
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
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Shipment - {editingShipment.invoiceNo}</h3>
              <button className="close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>

            <EditShipmentForm
              shipment={editingShipment}
              products={products}
              onSave={handleSaveEdit}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}


    </div>
  );
};

export default Shipments;
