import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const Customers = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    group: '',
    city: '',
    state: '',
    region: '',
    stateCode: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Check if user has permission to manage customers
  const canManageCustomers = user && (user.role === 'admin' || user.role === 'manager');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    try {
      if (editingCustomer) {
        // Extract the correct ID - handle both string and object cases
        let customerId;
        if (typeof editingCustomer._id === 'string') {
          customerId = editingCustomer._id;
        } else if (typeof editingCustomer.id === 'string') {
          customerId = editingCustomer.id;
        } else if (editingCustomer._id && typeof editingCustomer._id === 'object' && editingCustomer._id.toString) {
          customerId = editingCustomer._id.toString();
        } else if (editingCustomer.id && typeof editingCustomer.id === 'object' && editingCustomer.id.toString) {
          customerId = editingCustomer.id.toString();
        } else {
          console.error('Invalid customer ID for update:', editingCustomer);
          alert('Invalid customer data');
          return;
        }
        
        // Final validation - ensure we have a valid ID
        if (!customerId || customerId === 'undefined' || customerId === 'null') {
          console.error('Customer ID is invalid:', customerId);
          alert('Invalid customer ID. Cannot update customer.');
          return;
        }
        
        // Create clean form data without _id field
        const cleanFormData = {
          code: formData.code,
          name: formData.name,
          group: formData.group,
          city: formData.city,
          state: formData.state,
          region: formData.region,
          stateCode: formData.stateCode
        };
        
        const response = await api.updateCustomer(customerId, cleanFormData);
        if (response.success) {
          setCustomers(prev => prev.map(c => {
            const cId = c._id || c.id;
            const cIdStr = typeof cId === 'string' ? cId : cId.toString();
            return cIdStr === customerId ? response.data.customer : c;
          }));
          alert(response.message || 'Customer updated successfully');
        } else {
          alert(`Error: ${response.message || 'Failed to update customer'}`);
        }
      } else {
        const response = await api.createCustomer(formData);
        if (response.success) {
          setCustomers(prev => [...prev, response.data.customer]);
          alert(response.message || 'Customer created successfully');
        } else {
          alert(`Error: ${response.message || 'Failed to create customer'}`);
        }
      }
      
      setFormData({ code: '', name: '', group: '', city: '', state: '', region: '', stateCode: '' });
      setEditingCustomer(null);
      setShowModal(false);
    } catch (error) {
      console.error('Customer operation error:', error);
      alert(error.message || 'An error occurred');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      code: customer.code || '',
      name: customer.name || '',
      group: customer.group || '',
      city: customer.city || '',
      state: customer.state || '',
      region: customer.region || '',
      stateCode: customer.stateCode || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (customer) => {
    if (!canManageCustomers) {
      alert('You do not have permission to delete customers');
      return;
    }

    // Extract the correct ID - handle both string and object cases
    let customerId;
    if (typeof customer._id === 'string') {
      customerId = customer._id;
    } else if (typeof customer.id === 'string') {
      customerId = customer.id;
    } else if (customer._id && typeof customer._id === 'object') {
      // Handle nested _id object
      if (customer._id._id) {
        customerId = customer._id._id.toString();
      } else if (customer._id.id) {
        customerId = customer._id.id.toString();
      } else {
        customerId = customer._id.toString();
      }
    } else if (customer.id && typeof customer.id === 'object') {
      // Handle nested id object
      if (customer.id._id) {
        customerId = customer.id._id.toString();
      } else if (customer.id.id) {
        customerId = customer.id.id.toString();
      } else {
        customerId = customer.id.toString();
      }
    } else {
      console.error('Invalid customer ID structure:', customer);
      alert('Invalid customer data - cannot extract ID');
      return;
    }

    const confirmMessage = `Are you sure you want to permanently delete customer "${customer.name}"?\n\nThis action cannot be undone and will remove the customer from the database completely.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        const response = await api.deleteCustomer(customerId);
        console.log(response)
        if (response.success) {
          setCustomers(prev => prev.filter(c => {
            const cId = c._id || c.id;
            return (typeof cId === 'string' ? cId : cId.toString()) !== customerId;
          }));
          alert(response.message || 'Customer permanently deleted');
        } else {
          // Show backend error message
          alert(`Error: ${response.message || 'Failed to delete customer'}`);
        }
      } catch (error) {
        console.error('Delete customer error:', error);
        // Show the actual error message from the backend
        const errorMessage = error.message || 'Failed to delete customer';
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({ code: '', name: '', group: '', city: '', state: '', region: '', stateCode: '' });
    setEditingCustomer(null);
    setShowModal(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(fileExtension)) {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
      
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    try {
      setImporting(true);
      const response = await api.importCustomers(importFile);
      
      if (response.success) {
        alert(`Import successful! ${response.data.importedCount} customers imported.`);
        setShowImportModal(false);
        setImportFile(null);
        fetchCustomers(); // Refresh the customer list
      } else {
        alert(`Import failed: ${response.message}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await api.getCustomers(params);
      if (response.success) {
        setCustomers(response.data.customers);
        // Get total count from backend response
        setTotalCustomers(response.data.totalCount || response.data.customers.length);
      }
    } catch (error) {
      console.error('Fetch customers error:', error);
      alert('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.code?.toLowerCase().includes(searchLower) ||
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.city?.toLowerCase().includes(searchLower) ||
      customer.state?.toLowerCase().includes(searchLower) ||
      customer.group?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container customers-page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Customers Management</h2>
          <div className="count-badge">
            {searchTerm ? `Showing: ${filteredCustomers.length} of ${totalCustomers}` : `Total Customers: ${totalCustomers}`}
          </div>
        </div>

        <div className="action-buttons">
          {canManageCustomers ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
            >
              Add New Customer
            </button>
            <button 
              className="btn btn-success"
              onClick={() => setShowImportModal(true)}
            >
              Import Customers
            </button>
          </div>
          ) : (
            <div className="permission-notice">
              <span className="text-muted">
                Only Admin and Manager users can create/edit customers
              </span>
            </div>
          )}
        </div>

        <div className="search-bar">
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search customers by code, name, city, state, or group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">Loading customers...</div>
        ) : (
          <table className="table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Code</th>
                <th style={{ width: '20%' }}>Name</th>
                <th style={{ width: '15%' }}>Group</th>
                <th style={{ width: '15%' }}>City</th>
                <th style={{ width: '15%' }}>State</th>
                <th style={{ width: '10%' }}>Region</th>
                <th style={{ width: '8%' }}>State Code</th>
                <th style={{ width: '10%', minWidth: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer._id || customer.id}>
                  <td>{customer.code}</td>
                  <td>{customer.name}</td>
                  <td>{customer.group || '-'}</td>
                  <td>{customer.city || '-'}</td>
                  <td>{customer.state || '-'}</td>
                  <td>{customer.region || '-'}</td>
                  <td>{customer.stateCode || '-'}</td>
                  <td style={{ padding: '4px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {canManageCustomers ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEdit(customer)}
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '0.8rem',
                            minWidth: '50px',
                            flexShrink: 0
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(customer)}
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '0.8rem',
                            minWidth: '60px',
                            flexShrink: 0
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted">No permissions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px', width: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h3>
              <button className="btn-close" onClick={resetForm}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="code">Customer Code *</label>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter customer code (uppercase letters and numbers only)"
                    maxLength="20"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="name">Customer Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter customer name"
                    maxLength="150"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="group">Group</label>
                  <input
                    type="text"
                    id="group"
                    name="group"
                    value={formData.group}
                    onChange={handleInputChange}
                    placeholder="Enter group"
                    maxLength="100"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    maxLength="100"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="Enter state"
                    maxLength="100"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="region">Region</label>
                  <input
                    type="text"
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    placeholder="Enter region"
                    maxLength="100"
                  />
                </div>

                <div className="form-group form-group-full">
                  <label htmlFor="stateCode">State Code</label>
                  <input
                    type="text"
                    id="stateCode"
                    name="stateCode"
                    value={formData.stateCode}
                    onChange={handleInputChange}
                    placeholder="Enter state code"
                    maxLength="10"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Customers Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Import Customers</h3>
              <button 
                className="btn-close" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="importFile">Select Excel File</label>
                <input
                  type="file"
                  id="importFile"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="form-control"
                />
                {importFile && (
                  <div className="file-info">
                    <p><strong>Selected file:</strong> {importFile.name}</p>
                    <p><strong>Size:</strong> {(importFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
              </div>

              <div className="import-instructions">
                <h4>Excel Format Requirements:</h4>
                <ul>
                  <li><strong>Code:</strong> Customer code (required, unique)</li>
                  <li><strong>Name:</strong> Customer name (required)</li>
                  <li><strong>Group:</strong> Customer group (optional)</li>
                  <li><strong>City:</strong> City (optional)</li>
                  <li><strong>State:</strong> State (optional)</li>
                  <li><strong>Region:</strong> Region (optional)</li>
                  <li><strong>State Code:</strong> State code (optional)</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!importFile || importing}
              >
                {importing ? 'Importing...' : 'Import Customers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
