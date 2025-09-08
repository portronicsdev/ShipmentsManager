import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

import Shipments from './components/Shipments';
import Products from './components/Products';
import Customers from './components/Customers';
import CreateShipment from './components/CreateShipment';
import ShipmentDetail from './components/ShipmentDetail';
import Reports from './components/Reports';
import Auth from './components/Auth';
import api from './utils/api';
import './App.css';

function AppContent() {
  const [shipments, setShipments] = useState([]);
  const [totalShipments, setTotalShipments] = useState(0);
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showOperationSuccess, setShowOperationSuccess] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const navigate = useNavigate();

  // Auto-hide sidebar when not pinned (desktop only)
  useEffect(() => {
    if (!sidebarPinned && window.innerWidth > 768) {
      const timer = setTimeout(() => setSidebarOpen(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [sidebarPinned, sidebarOpen]);

  // Show sidebar on hover when not pinned (desktop only)
  useEffect(() => {
    if (!sidebarPinned && window.innerWidth > 768) {
      const handleMouseEnter = () => setSidebarOpen(true);
      const handleMouseLeave = () => setSidebarOpen(false);
      const sidebar = document.querySelector('.sidebar');

      if (sidebar) {
        sidebar.addEventListener('mouseenter', handleMouseEnter);
        sidebar.addEventListener('mouseleave', handleMouseLeave);
        return () => {
          sidebar.removeEventListener('mouseenter', handleMouseEnter);
          sidebar.removeEventListener('mouseleave', handleMouseLeave);
        };
      }
    }
  }, [sidebarPinned]);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = api.getAuthToken();
        if (token) {
          const response = await api.getCurrentUser();
          if (response.success) {
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
      if (!user) return;
      try {
        const [shipmentsResponse, productsResponse] = await Promise.all([
          api.getShipments(),
          api.getProducts()
        ]);

        if (shipmentsResponse.success) {
          setShipments(shipmentsResponse.data.shipments);
          setTotalShipments(shipmentsResponse.data.totalCount || shipmentsResponse.data.shipments.length);
        }
        if (productsResponse.success) {
          setProducts(productsResponse.data.products);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [user]);

  // Function to refresh data (currently unused)
  // const refreshData = async () => {
  //   if (user) {
  //     try {
  //       const [shipmentsResponse, productsResponse] = await Promise.all([
  //         api.getShipments(),
  //         api.getProducts()
  //       ]);
  //       if (shipmentsResponse.success) setShipments(shipmentsResponse.data.shipments);
  //       if (productsResponse.success) setProducts(productsResponse.data.products);
  //     } catch (error) {
  //       console.error('Error refreshing data:', error);
  //     }
  //   }
  // };

  // Helper: show operation success messages
  const showSuccess = (message) => {
    setShowOperationSuccess(message);
    setTimeout(() => setShowOperationSuccess(''), 3000);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setShowSuccessMessage(true);
    navigate('/shipments');
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setProducts([]);
    setShipments([]);
    navigate('/');
  };

  const addShipment = async (newShipment) => {
    try {
      const response = await api.createShipment(newShipment);
      if (response.success) {
        setShipments(prev => [...prev, response.data.shipment]);
        showSuccess('Shipment created successfully!');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const updateShipment = async (updatedShipment) => {
    try {
      const response = await api.updateShipment(updatedShipment.id, updatedShipment);
      if (response.success) {
        setShipments(prev => prev.map(s => (s.id === updatedShipment.id ? response.data.shipment : s)));
        showSuccess('Shipment updated successfully!');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteShipment = async (shipmentId) => {
    try {
      const response = await api.deleteShipment(shipmentId);
      if (response.success) {
        setShipments(prev => prev.filter(s => s.id !== shipmentId));
        showSuccess('Shipment deleted successfully!');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const addProduct = async (newProduct) => {
    try {
      const response = await api.createProduct(newProduct);
      if (response.success) {
        setProducts(prev => [...prev, response.data.product]);
        showSuccess('Product created successfully!');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const updateProduct = async (updatedProduct) => {
    try {
      // Extract the correct ID - handle both _id and id cases
      let productId;
      if (typeof updatedProduct._id === 'string') {
        productId = updatedProduct._id;
      } else if (typeof updatedProduct.id === 'string') {
        productId = updatedProduct.id;
      } else if (updatedProduct._id && typeof updatedProduct._id === 'object' && updatedProduct._id.toString) {
        productId = updatedProduct._id.toString();
      } else if (updatedProduct.id && typeof updatedProduct.id === 'object' && updatedProduct.id.toString) {
        productId = updatedProduct.id.toString();
      } else {
        console.error('Invalid product ID for update:', updatedProduct);
        throw new Error('Invalid product data');
      }
      
      // Final validation - ensure we have a valid ID
      if (!productId || productId === 'undefined' || productId === 'null') {
        console.error('Product ID is invalid:', productId);
        throw new Error('Invalid product ID. Cannot update product.');
      }
      
      // Create clean form data with only the required fields
      const cleanFormData = {
        sku: updatedProduct.sku,
        productName: updatedProduct.productName,
        origin: updatedProduct.origin,
        categoryId: updatedProduct.categoryId // Ensure this is just the ID string, not an object
      };
      
      const response = await api.updateProduct(productId, cleanFormData);
      if (response.success) {
        setProducts(prev => prev.map(p => (p._id === productId || p.id === productId ? response.data.product : p)));
        showSuccess('Product updated successfully!');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteProduct = async (productId) => {
    try {
      const response = await api.deleteProduct(productId);
      if (response.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        showSuccess('Product deleted successfully!');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="App">
      {user && (
        <>
          {/* Sliding Sidebar */}
          <div
            className={`sidebar ${sidebarOpen ? 'open' : 'closed'} ${sidebarPinned ? 'pinned' : ''}`}
            style={{
              position: 'fixed',
              left: sidebarOpen ? '0' : '-280px',
              top: 0,
              width: '280px',
              height: '100vh',
              background: 'white',
              boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
              transition: 'left 0.3s ease',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Sidebar Header */}
            <div
              style={{
                padding: '20px',
                borderBottom: '2px solid #e9ecef',
                background: 'linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%)',
                color: 'white',
                boxShadow: '0 2px 4px rgba(44, 90, 160, 0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Shipments Manager</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSidebarPinned(!sidebarPinned)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title={sidebarPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
                  >
                    {sidebarPinned ? '📌' : '📍'}
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {user && (
                <div style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.9 }}>
                  Welcome, {user.name}!
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <div style={{ padding: '20px', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link
                  to="/create-shipment"
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(74, 144, 226, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #357abd 0%, #2c5aa0 100%)';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(74, 144, 226, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(74, 144, 226, 0.3)';
                  }}
                >
                  ➕ Create Shipment
                </Link>
                <Link
                  to="/shipments"
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(74, 144, 226, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #357abd 0%, #2c5aa0 100%)';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(74, 144, 226, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(74, 144, 226, 0.3)';
                  }}
                >
                  📦 Shipments
                </Link>

                <Link
                  to="/products"
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(74, 144, 226, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #357abd 0%, #2c5aa0 100%)';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(74, 144, 226, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(74, 144, 226, 0.3)';
                  }}
                >
                  🏷️ Products
                </Link>

                <Link
                  to="/customers"
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(74, 144, 226, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #357abd 0%, #2c5aa0 100%)';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(74, 144, 226, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(74, 144, 226, 0.3)';
                  }}
                >
                  👥 Customers
                </Link>

                <Link
                  to="/reports"
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(74, 144, 226, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #357abd 0%, #2c5aa0 100%)';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(74, 144, 226, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(74, 144, 226, 0.3)';
                  }}
                >
                  📊 Reports
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar Toggle Button */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                position: 'fixed',
                left: '10px',
                top: '10px',
                zIndex: 999,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              ☰
            </button>
          )}

          {/* Hover area for sidebar (desktop only) */}
          {!sidebarOpen && !sidebarPinned && window.innerWidth > 768 && (
            <div
              style={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: '10px',
                height: '100vh',
                zIndex: 998,
                cursor: 'pointer'
              }}
              onMouseEnter={() => setSidebarOpen(true)}
            />
          )}

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div
              onClick={() => !sidebarPinned && setSidebarOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 999,
                display: window.innerWidth <= 768 ? 'block' : 'none'
              }}
            />
          )}
        </>
      )}

      <main
        className="main-content"
        style={{
          marginLeft: user && sidebarOpen ? '280px' : '0',
          transition: 'margin-left 0.3s ease',
          padding: '20px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          minHeight: '100vh'
        }}
      >
        {loading ? (
          <div className="loading">Loading...</div>
        ) : !user ? (
          <Auth onAuthSuccess={handleAuthSuccess} />
        ) : (
          <>
            {/* Minimal Header with Logout */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: '10px',
              paddingBottom: '5px'
            }}>
              <span
                onClick={handleLogout}
                style={{
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 500,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.3s ease',
                  textDecoration: 'none',
                  backgroundColor: 'transparent',
                  border: '1px solid #dee2e6'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.color = '#495057';
                  e.target.style.borderColor = '#adb5bd';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6c757d';
                  e.target.style.borderColor = '#dee2e6';
                  e.target.style.transform = 'translateY(0)';
                }}
                title="Logout"
              >
                🚪 Logout
              </span>
            </div>

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
                    totalShipments={totalShipments}
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
                    totalShipments={totalShipments}
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
                element={<CreateShipment products={products} onAdd={updateShipment} isEditing={true} />}
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
                path="/customers"
                element={
                  <Customers
                    user={user}
                  />
                }
              />
              <Route
                path="/reports"
                element={<Reports shipments={shipments} />}
              />
              <Route
                path="/create-shipment"
                element={<CreateShipment products={products} onAdd={addShipment} />}
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
