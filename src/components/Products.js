import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const Products = ({ onAdd, onUpdate, onDelete, user }) => {
  const [products, setProducts] = useState([]);
  const [superCategories, setSuperCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    productName: '',
    origin: '',
    categoryId: '',
    superCategoryId: ''
  });
  const [skuSearchResults, setSkuSearchResults] = useState([]);
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Inline creation states
  const [showCreateSuperCategory, setShowCreateSuperCategory] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newSuperCategoryName, setNewSuperCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Check if user has permission to manage products
  const canManageProducts = user && (user.role === 'admin' || user.role === 'manager');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      if (editingProduct) {
        // Extract the correct ID - handle both _id and id cases
        let productId;
        if (typeof editingProduct._id === 'string') {
          productId = editingProduct._id;
        } else if (typeof editingProduct.id === 'string') {
          productId = editingProduct.id;
        } else if (editingProduct._id && typeof editingProduct._id === 'object' && editingProduct._id.toString) {
          productId = editingProduct._id.toString();
        } else if (editingProduct.id && typeof editingProduct.id === 'object' && editingProduct.id.toString) {
          productId = editingProduct.id.toString();
        } else {
          console.error('Invalid product ID for update:', editingProduct);
          alert('Invalid product data');
          return;
        }
        
        // Final validation - ensure we have a valid ID
        if (!productId || productId === 'undefined' || productId === 'null') {
          console.error('Product ID is invalid:', productId);
          alert('Invalid product ID. Cannot update product.');
          return;
        }
        
        // Create clean form data with only the required fields
        const cleanFormData = {
          sku: formData.sku,
          productName: formData.productName,
          origin: formData.origin,
          categoryId: formData.categoryId // Ensure this is just the ID string, not an object
        };
        
        const response = await api.updateProduct(productId, cleanFormData);
        if (response.success) {
          setProducts(prev => prev.map(p => (p._id === productId || p.id === productId ? response.data.product : p)));
          alert(response.message || 'Product updated successfully');
        } else {
          alert(`Error: ${response.message || 'Failed to update product'}`);
        }
      } else {
        const response = await api.createProduct(formData);
        if (response.success) {
          setProducts(prev => [...prev, response.data.product]);
          alert(response.message || 'Product created successfully');
        } else {
          alert(`Error: ${response.message || 'Failed to create product'}`);
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      if (error.message.includes('Unauthorized')) {
        alert('Your session has expired. Please login again.');
        window.location.reload();
      } else {
        alert('Error saving product: ' + error.message);
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      productName: product.productName,
      origin: product.origin || '',
      categoryId: product.categoryId?._id || '',
      superCategoryId: product.categoryId?.superCategoryId?._id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?\n\nThis will hide the product from the list but keep it in the database for reference.')) {
      try {
        const response = await api.deleteProduct(productId);
        if (response.success) {
          setProducts(prev => prev.filter(p => (p._id || p.id) !== productId));
          onDelete && onDelete(productId);
          alert(response.message || 'Product deleted successfully');
        } else {
          alert(`Error: ${response.message || 'Failed to delete product'}`);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        if (error.message.includes('Unauthorized')) {
          alert('Your session has expired. Please login again.');
          window.location.reload();
        } else {
          alert('Error deleting product: ' + error.message);
        }
      }
    }
  };

  const handleSkuChange = (e) => {
    const skuValue = e.target.value.toUpperCase();
    setFormData({ ...formData, sku: skuValue });

    if (skuValue.length >= 2) {
      // Search for products with matching SKU
      const matchingProducts = products.filter(product => 
        product.sku.toLowerCase().includes(skuValue.toLowerCase())
      );
      setSkuSearchResults(matchingProducts);
      setShowSkuSuggestions(matchingProducts.length > 0);
    } else {
      setSkuSearchResults([]);
      setShowSkuSuggestions(false);
    }
  };

  const handleSkuSelect = (selectedProduct) => {
    setFormData({
      sku: selectedProduct.sku,
      productName: selectedProduct.productName,
      origin: selectedProduct.origin || '',
      categoryId: selectedProduct.categoryId?._id || '',
      superCategoryId: selectedProduct.categoryId?.superCategoryId?._id || ''
    });
    setShowSkuSuggestions(false);
    setSkuSearchResults([]);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.sku-suggestions-container')) {
      setShowSkuSuggestions(false);
    }
  };

  const resetForm = () => {
    setFormData({ sku: '', productName: '', origin: '', categoryId: '', superCategoryId: '' });
    setSkuSearchResults([]);
    setShowSkuSuggestions(false);
    setEditingProduct(null);
    setShowModal(false);
    setShowCreateSuperCategory(false);
    setShowCreateCategory(false);
    setNewSuperCategoryName('');
    setNewCategoryName('');
  };

  // Create new Super Category
  const createSuperCategory = async () => {
    if (!newSuperCategoryName.trim()) {
      alert('Please enter a super category name');
      return;
    }

    try {
      const response = await api.createSuperCategory({ name: newSuperCategoryName.trim() });
      if (response.success) {
        setSuperCategories(prev => [...prev, response.data.superCategory]);
        setFormData(prev => ({ ...prev, superCategoryId: response.data.superCategory._id }));
        setNewSuperCategoryName('');
        setShowCreateSuperCategory(false);
        alert('Super Category created successfully!');
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error creating super category:', error);
      alert('Failed to create super category');
    }
  };

  // Create new Category
  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    if (!formData.superCategoryId) {
      alert('Please select a super category first');
      return;
    }

    try {
      const response = await api.createCategory({ 
        name: newCategoryName.trim(),
        superCategoryId: formData.superCategoryId
      });
      if (response.success) {
        setCategories(prev => [...prev, response.data.category]);
        setFormData(prev => ({ ...prev, categoryId: response.data.category._id }));
        setNewCategoryName('');
        setShowCreateCategory(false);
        alert('Category created successfully!');
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['.xlsx', '.xls'];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (allowedTypes.includes(ext)) {
        setImportFile(file);
      } else {
        alert('Please select an Excel file (.xlsx or .xls)');
        e.target.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    setImporting(true);
    try {
      const response = await api.importProducts(importFile);
      if (response.success) {
        const { totalProcessed, successCount, errorCount, errors } = response.data;
        
        let message = `Import completed!\n\nTotal processed: ${totalProcessed}\nSuccessfully imported: ${successCount}\nErrors: ${errorCount}`;
        
        if (errorCount > 0 && errors.length > 0) {
          message += '\n\nFailed records:';
          errors.slice(0, 10).forEach((error, index) => {
            const productInfo = error.productName ? `${error.sku} (${error.productName})` : error.sku;
            message += `\n${index + 1}. ${productInfo} - ${error.error}`;
          });
          
          if (errors.length > 10) {
            message += `\n... and ${errors.length - 10} more errors`;
          }
        }
        
        alert(message);
        
        // Refresh products list
        const productsResponse = await api.getProducts();
        if (productsResponse.success) {
          setProducts(productsResponse.data.products);
        }
        
        setShowImportModal(false);
        setImportFile(null);
      } else {
        alert(`Error: ${response.message || 'Failed to import products'}`);
      }
    } catch (error) {
      console.error('Error importing products:', error);
      if (error.message.includes('Unauthorized')) {
        alert('Your session has expired. Please login again.');
        window.location.reload();
      } else {
        alert('Error importing products: ' + error.message);
      }
    } finally {
      setImporting(false);
    }
  };

  // Load products, categories, and super categories from API on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsResponse, superCategoriesResponse, categoriesResponse] = await Promise.all([
          api.getProducts(),
          api.getSuperCategories(),
          api.getCategories()
        ]);
        
        if (productsResponse.success) {
          setProducts(productsResponse.data.products);
        }
        
        if (superCategoriesResponse.success) {
          setSuperCategories(superCategoriesResponse.data.superCategories);
        }
        
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data.categories);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error details:', error.message);
        // If it's an authentication error, the API utility will handle it
        if (error.message.includes('Unauthorized')) {
          // User needs to login again
          alert('Your session has expired. Please login again.');
          window.location.reload();
        }
      }
    };

    loadData();
  }, []);

  // Handle clicking outside SKU suggestions
  useEffect(() => {
    if (showSkuSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSkuSuggestions]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showModal) {
          resetForm();
        } else if (showImportModal) {
          setShowImportModal(false);
          setImportFile(null);
        }
      }
    };

    if (showModal || showImportModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showModal, showImportModal]);

  

  const filteredProducts = (products || []).filter(product => {

    const sku = (product?.sku || "").toLowerCase();
    const productName = (product?.productName || "").toLowerCase();

    // must RETURN a boolean here
    return sku.includes(searchTerm.toLowerCase()) ||
          productName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="container products-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Products Management</h2>
          <div className="count-badge">
            {searchTerm ? `Showing: ${filteredProducts.length} of ${products.length}` : `Total Products: ${products.length}`}
          </div>
        </div>

        <div className="action-buttons">
          {canManageProducts ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
            >
              Add New Product
            </button>
            <button 
              className="btn btn-success"
              onClick={() => setShowImportModal(true)}
            >
              Import Products
            </button>
          </div>
          ) : (
            <div className="permission-notice">
              <span className="text-muted">
                Only Admin and Manager users can create/edit products
              </span>
            </div>
          )}
        </div>

        <div className="search-bar">
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search products by SKU or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="table" style={{ fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ width: '12%' }}>SKU</th>
              <th style={{ width: '30%' }}>Product Name</th>
              <th style={{ width: '12%' }}>Origin</th>
              <th style={{ width: '18%' }}>Category</th>
              <th style={{ width: '18%' }}>Super Category</th>
              <th style={{ width: '15%', minWidth: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product._id || product.id}>
                <td>{product.sku}</td>
                <td>{product.productName}</td>
                <td>{product.origin || '-'}</td>
                <td>{product.categoryId?.name || '-'}</td>
                <td>{product.categoryId?.superCategoryId?.name || '-'}</td>
                <td style={{ padding: '6px', whiteSpace: 'nowrap', overflow: 'visible', minWidth: '180px' }}>
                  {canManageProducts ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEdit(product)}
                        style={{ 
                          padding: '6px 10px', 
                          fontSize: '0.8rem',
                          minWidth: '60px',
                          flexShrink: 0
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(product._id || product.id)}
                        style={{ 
                          padding: '6px 10px', 
                          fontSize: '0.8rem',
                          minWidth: '60px',
                          flexShrink: 0
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>View only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <p className="text-center text-muted">
            {searchTerm ? 'No products found matching your search.' : 'No products yet. Add your first product!'}
          </p>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleClickOutside}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button 
                className="btn-close" 
                onClick={resetForm}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group sku-suggestions-container" style={{ position: 'relative' }}>
                <label className="form-label">SKU <span style={{ color: '#dc3545' }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.sku}
                  onChange={handleSkuChange}
                  required
                  placeholder="Type SKU to search products..."
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
                    borderRadius: '0 0 4px 4px',
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
                          fontSize: '0.9rem'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        onClick={() => handleSkuSelect(product)}
                      >
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '2px' }}>
                          {product.sku} - {product.productName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#999' }}>
                          {product.categoryId?.name} ({product.categoryId?.superCategoryId?.name})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Product Name <span style={{ color: '#dc3545' }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  required
                  placeholder="Enter product name"
                />
              </div>
              

              <div className="form-group">
                <label className="form-label">Origin</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  placeholder="Enter origin"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Super Category <span style={{ color: '#dc3545' }}>*</span></label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="form-control"
                    value={formData.superCategoryId}
                    onChange={(e) => {
                      const superCategoryId = e.target.value;
                      setFormData({ ...formData, superCategoryId, categoryId: '' }); // Reset category when super category changes
                    }}
                    required
                    style={{ flex: 1 }}
                  >
                    <option value="">Select a super category</option>
                    {superCategories.map(superCategory => (
                      <option key={superCategory._id} value={superCategory._id}>
                        {superCategory.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateSuperCategory(!showCreateSuperCategory)}
                    style={{
                      padding: '6px 8px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + New
                  </button>
                </div>
                {showCreateSuperCategory && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={newSuperCategoryName}
                      onChange={(e) => setNewSuperCategoryName(e.target.value)}
                      placeholder="Enter super category name"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={createSuperCategory}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateSuperCategory(false);
                        setNewSuperCategoryName('');
                      }}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Category <span style={{ color: '#dc3545' }}>*</span></label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="form-control"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    disabled={!formData.superCategoryId}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select a category</option>
                    {categories
                      .filter(category => category.superCategoryId?._id === formData.superCategoryId)
                      .map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateCategory(!showCreateCategory)}
                    disabled={!formData.superCategoryId}
                    style={{
                      padding: '6px 8px',
                      backgroundColor: formData.superCategoryId ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '0.8rem',
                      cursor: formData.superCategoryId ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + New
                  </button>
                </div>
                {showCreateCategory && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={createCategory}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateCategory(false);
                        setNewCategoryName('');
                      }}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                </button>
                  </div>
                )}
              </div>
              
              </form>
            </div>
            <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Import Products from Excel</h3>
              <button 
                className="btn-close" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Excel File</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                />
                <small className="form-text text-muted">
                  Excel file should contain columns: SKU, Product, Category, Super Category, Origin
                </small>
              </div>
              
              {importFile && (
                <div className="file-info">
                  <p><strong>Selected file:</strong> {importFile.name}</p>
                  <p><strong>Size:</strong> {(importFile.size / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                disabled={importing}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={handleImport}
                disabled={!importFile || importing}
              >
                {importing ? 'Importing...' : 'Import Products'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
