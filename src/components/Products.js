import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const Products = ({ onAdd, onUpdate, onDelete, user }) => {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user has permission to manage products
  const canManageProducts = user && (user.role === 'admin' || user.role === 'manager');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        const response = await api.updateProduct(editingProduct.id, formData);
        if (response.success) {
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? response.data.product : p));
          onUpdate && onUpdate(response.data.product);
        }
      } else {
        const response = await api.createProduct(formData);
        if (response.success) {
          setProducts(prev => [...prev, response.data.product]);
          onAdd && onAdd(response.data.product);
        }
      }
      
      setFormData({ sku: '', name: '' });
      setEditingProduct(null);
      setShowModal(false);
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
      name: product.name
    });
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await api.deleteProduct(productId);
        if (response.success) {
          setProducts(prev => prev.filter(p => p.id !== productId));
          onDelete && onDelete(productId);
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

  // Load products from API on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.getProducts();
        console.log('Loaded products:', response);
        if (response.success) {
          setProducts(response.data.products);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        // If it's an authentication error, the API utility will handle it
        if (error.message.includes('Unauthorized')) {
          // User needs to login again
          window.location.reload();
        }
      }
    };

    loadProducts();
  }, []);

  const filteredProducts = (products || []).filter(product =>
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Products Management</h2>
        </div>

        <div className="action-buttons">
          {canManageProducts ? (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
            >
              Add New Product
            </button>
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

        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>
                  {canManageProducts ? (
                    <>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(product.id)}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="text-muted">View only</span>
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
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button 
                className="close" 
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                  setFormData({ sku: '', name: '' });
                }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                  placeholder="Enter product SKU"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter product name"
                />
              </div>
              
              <div className="action-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setFormData({ sku: '', name: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
