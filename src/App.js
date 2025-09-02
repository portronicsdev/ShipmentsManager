import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

import Shipments from './components/Shipments';
import Products from './components/Products';
import CreateShipment from './components/CreateShipment';
import ShipmentDetail from './components/ShipmentDetail';
import Auth from './components/Auth';
import api from './utils/api';
import './App.css';

function AppContent() {
  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showOperationSuccess, setShowOperationSuccess] = useState('');
  const navigate = useNavigate();

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = api.getAuthToken();
        if (token) {
          // Try to get current user profile to validate token
          const response = await api.getCurrentUser();
          if (response.success) {
            // Token is valid, user is authenticated
            setUser(response.data.user);
          } else {
            api.removeAuthToken();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        api.removeAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Load shipments and products when user is authenticated
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          // Load shipments and products in parallel
          const [shipmentsResponse, productsResponse] = await Promise.all([
            api.getShipments(),
            api.getProducts()
          ]);

          if (shipmentsResponse.success) {
            setShipments(shipmentsResponse.data.shipments);
          }
          if (productsResponse.success) {
            setProducts(productsResponse.data.products);
          }
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };

    loadData();
  }, [user]);

  /*// Function to refresh data
  const refreshData = async () => {
    if (user) {
      try {
        const [shipmentsResponse, productsResponse] = await Promise.all([
          api.getShipments(),
          api.getProducts()
        ]);

        if (shipmentsResponse.success) {
          setShipments(shipmentsResponse.data.shipments);
        }
        if (productsResponse.success) {
          setProducts(productsResponse.data.products);
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }
  };*/

  // Helper function to show operation success messages
  const showSuccess = (message) => {
    setShowOperationSuccess(message);
    setTimeout(() => setShowOperationSuccess(''), 3000);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    // Show success message
    setShowSuccessMessage(true);
    // Navigate to shipments page after successful authentication
    navigate('/shipments');
    // Hide success message after 3 seconds
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setProducts([]);
    setShipments([]);
    // Navigate back to login page after logout
    navigate('/');
  };

  const addShipment = async (newShipment) => {
    try {
      console.log('Adding new shipment:', newShipment);
      const response = await api.createShipment(newShipment);
      if (response.success) {
        setShipments(prev => [...prev, response.data.shipment]);
        console.log('Shipment added successfully:', response.data.shipment);
        showSuccess('Shipment created successfully!');
      } else {
        console.error('Failed to add shipment:', response.message);
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error adding shipment:', error);
      throw error;
    }
  };

  const updateShipment = async (updatedShipment) => {
    try {
      console.log('Updating shipment:', updatedShipment);
      const response = await api.updateShipment(updatedShipment.id, updatedShipment);
      if (response.success) {
        setShipments(prev => prev.map(s => s.id === updatedShipment.id ? response.data.shipment : s));
        console.log('Shipment updated successfully:', response.data.shipment);
        showSuccess('Shipment updated successfully!');
      } else {
        console.error('Failed to update shipment:', response.message);
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error updating shipment:', error);
      throw error;
    }
  };

  const deleteShipment = async (shipmentId) => {
    try {
      console.log('Deleting shipment:', shipmentId);
      const response = await api.deleteShipment(shipmentId);
      if (response.success) {
        setShipments(prev => prev.filter(s => s.id !== shipmentId));
        console.log('Shipment deleted successfully');
        showSuccess('Shipment deleted successfully!');
      } else {
        console.error('Failed to delete shipment:', response.message);
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error deleting shipment:', error);
      throw error;
    }
  };

  const addProduct = async (newProduct) => {
    try {
      console.log('Adding new product:', newProduct);
      const response = await api.createProduct(newProduct);
      if (response.success) {
        setProducts(prev => [...prev, response.data.product]);
        console.log('Product added successfully:', response.data.product);
        showSuccess('Product created successfully!');
      } else {
        console.error('Failed to add product:', response.message);
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (updatedProduct) => {
    try {
      console.log('Updating product:', updatedProduct);
      const response = await api.updateProduct(updatedProduct.id, updatedProduct);
      if (response.success) {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? response.data.product : p));
        console.log('Product updated successfully:', response.data.product);
        showSuccess('Product updated successfully!');
      } else {
        console.error('Failed to update product:', response.message);
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (productId) => {
    try {
      console.log('Deleting product:', productId);
      const response = await api.deleteProduct(productId);
      if (response.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        console.log('Product deleted successfully');
        showSuccess('Product deleted successfully!');
      } else {
        console.error('Failed to delete product:', response.message);
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

    return (
    <div className="App">
      <nav className="navbar">
        <div className="container">
          <div className="navbar-brand">
            <h1>🚢 Shipments Manager</h1>
          </div>
          <ul className="navbar-nav">
            <li className="nav-item">
              <Link to="/" className="nav-link">Shipments</Link>
            </li>
            <li className="nav-item">
              <Link to="/products" className="nav-link">Products</Link>
            </li>
            <li className="nav-item">
              <Link to="/create-shipment" className="nav-link">Create Shipment</Link>
            </li>
          </ul>
          {user && (
            <div className="user-info">
              <span>Welcome, {user.name}!</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

              <main className="main-content">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : !user ? (
            <Auth onAuthSuccess={handleAuthSuccess} />
          ) : (
            <>
              {showSuccessMessage && (
                <div className="success-message">
                  <div className="success-content">
                    <span className="success-icon">✅</span>
                    <span>Successfully logged in! Welcome to Shipments Manager.</span>
                  </div>
                </div>
              )}
              
              {showOperationSuccess && (
                <div className="success-message">
                  <div className="success-content">
                    <span className="success-icon">✅</span>
                    <span>{showOperationSuccess}</span>
                  </div>
                </div>
              )}
              

            <Routes>
              <Route 
                path="/" 
                element={
                  <Shipments 
                    shipments={shipments} 
                    products={products}
                    onUpdate={updateShipment}
                    onDelete={deleteShipment}
                  />
                } 
              />
              <Route 
                path="/shipments" 
                element={
                  <Shipments 
                    shipments={shipments} 
                    products={products}
                    onUpdate={updateShipment}
                    onDelete={deleteShipment}
                  />
                } 
              />
              <Route 
                path="/shipments/:id" 
                element={
                  <ShipmentDetail 
                    shipments={shipments} 
                    products={products}
                    onUpdate={updateShipment}
                    onDelete={deleteShipment}
                  />
                } 
              />
              <Route 
                path="/shipments/:id/edit" 
                element={
                  <CreateShipment 
                    products={products}
                    onAdd={updateShipment}
                    isEditing={true}
                  />
                } 
              />
              <Route 
                path="/products" 
                element={
                  <Products 
                    onAdd={addProduct}
                    onUpdate={updateProduct}
                    onDelete={deleteProduct}
                    user={user}
                  />
                } 
              />
              <Route 
                path="/create-shipment"
                element={
                  <CreateShipment 
                    products={products}
                    onAdd={addShipment}
                  />
                } 
              />
            </Routes>
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
