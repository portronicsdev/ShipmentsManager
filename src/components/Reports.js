import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = ({ shipments = [] }) => {
  const [selectedReport, setSelectedReport] = useState('summary');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);

  // Calculate duration between start and end time
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      const durationMinutes = endMinutes - startMinutes;
      
      if (durationMinutes < 0) return 'Invalid';
      
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      return 'Invalid';
    }
  };

  // Filter shipments by date range
  const filteredShipments = shipments.filter(shipment => {
    if (!dateRange.startDate && !dateRange.endDate) return true;
    
    const shipmentDate = new Date(shipment.date);
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
    
    if (startDate && shipmentDate < startDate) return false;
    if (endDate && shipmentDate > endDate) return false;
    
    return true;
  });

  // Calculate summary statistics
  const calculateSummary = () => {
    const totalShipments = filteredShipments.length;
    const totalBoxes = filteredShipments.reduce((sum, shipment) => sum + (shipment.boxes?.length || 0), 0);
    const totalWeight = filteredShipments.reduce((sum, shipment) => {
      return sum + (shipment.boxes?.reduce((boxSum, box) => boxSum + parseFloat(box.finalWeight || 0), 0) || 0);
    }, 0);

    // Customer statistics
    const customerStats = {};
    filteredShipments.forEach(shipment => {
      const customerName = shipment.partyName || 'Unknown';
      if (!customerStats[customerName]) {
        customerStats[customerName] = {
          count: 0,
          totalBoxes: 0,
          totalWeight: 0,
          totalDuration: 0
        };
      }
      customerStats[customerName].count++;
      customerStats[customerName].totalBoxes += shipment.boxes?.length || 0;
      customerStats[customerName].totalWeight += shipment.boxes?.reduce((sum, box) => sum + parseFloat(box.finalWeight || 0), 0) || 0;
      
      const duration = calculateDuration(shipment.startTime, shipment.endTime);
      if (duration !== 'N/A' && duration !== 'Invalid') {
        const [hours, minutes] = duration.includes('h') ? 
          duration.split('h ')[0] + ':' + duration.split('h ')[1].replace('m', '') :
          ['0', duration.replace('m', '')];
        customerStats[customerName].totalDuration += parseInt(hours) * 60 + parseInt(minutes);
      }
    });

    // Duration statistics
    const durations = filteredShipments.map(shipment => 
      calculateDuration(shipment.startTime, shipment.endTime)
    ).filter(d => d !== 'N/A' && d !== 'Invalid');

    const avgDurationMinutes = durations.length > 0 ? 
      durations.reduce((sum, d) => {
        const [hours, minutes] = d.includes('h') ? 
          d.split('h ')[0] + ':' + d.split('h ')[1].replace('m', '') :
          ['0', d.replace('m', '')];
        return sum + parseInt(hours) * 60 + parseInt(minutes);
      }, 0) / durations.length : 0;

    const avgDurationHours = Math.floor(avgDurationMinutes / 60);
    const avgDurationMins = Math.round(avgDurationMinutes % 60);

    return {
      totalShipments,
      totalBoxes,
      totalWeight: totalWeight.toFixed(2),
      customerStats,
      avgDuration: avgDurationHours > 0 ? `${avgDurationHours}h ${avgDurationMins}m` : `${avgDurationMins}m`
    };
  };

  const summary = calculateSummary();

  // Handle customer click to show detailed shipments
  const handleCustomerClick = (customerName) => {
    const customerShipments = filteredShipments.filter(shipment => 
      shipment.partyName === customerName
    );
    setSelectedCustomer({
      name: customerName,
      shipments: customerShipments
    });
    setShowCustomerDetails(true);
  };

  // Close customer details modal
  const closeCustomerDetails = () => {
    setShowCustomerDetails(false);
    setSelectedCustomer(null);
  };

  // Handle ESC key to close customer details modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showCustomerDetails) {
        closeCustomerDetails();
      }
    };

    if (showCustomerDetails) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showCustomerDetails]);

  // Export functions

  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, filename);
  };

  const exportSummaryReport = () => {
    const data = Object.entries(summary.customerStats).map(([customer, stats]) => ({
      'Customer': customer,
      'Shipments': stats.count,
      'Total Boxes': stats.totalBoxes,
      'Total Weight (kg)': stats.totalWeight.toFixed(2),
      'Charged Weight (kg)': stats.totalWeight.toFixed(2)
    }));

    const filename = `Summary_Report_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToExcel(data, `${filename}.xlsx`);
  };

  const exportDetailedReport = () => {
    const data = filteredShipments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(shipment => {
        const weights = shipment.boxes?.reduce((sum, box) => ({
          total: sum.total + parseFloat(box.finalWeight || 0),
          charged: sum.charged + parseFloat(box.finalWeight || 0)
        }), { total: 0, charged: 0 }) || { total: 0, charged: 0 };
        
        return {
          'Date': format(new Date(shipment.date), 'MMM dd, yyyy'),
          'Invoice No': shipment.invoiceNo,
          'Customer': shipment.partyName,
          'Start Time': shipment.startTime || '-',
          'End Time': shipment.endTime || '-',
          'Duration': calculateDuration(shipment.startTime, shipment.endTime),
          'Boxes': shipment.boxes?.length || 0,
          'Total Weight (kg)': weights.total.toFixed(2),
          'Charged Weight (kg)': weights.charged.toFixed(2)
        };
      });

    const filename = `Detailed_Report_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToExcel(data, `${filename}.xlsx`);
  };

  const exportAllShipmentsReport = () => {
    const data = [];
    
    filteredShipments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((shipment, shipmentIndex) => {
        const totalProducts = shipment.boxes?.reduce((sum, box) => 
          sum + (box.products?.reduce((prodSum, prod) => prodSum + (prod.quantity || 0), 0) || 0), 0
        ) || 0;
        const totalWeight = shipment.boxes?.reduce((sum, box) => 
          sum + parseFloat(box.finalWeight || 0), 0
        ) || 0;

        // Add shipment header row
        data.push({
          'Shipment #': shipmentIndex + 1,
          'Invoice No': shipment.invoiceNo,
          'Date': format(new Date(shipment.date), 'MMM dd, yyyy'),
          'Customer': shipment.partyName,
          'Start Time': shipment.startTime || 'N/A',
          'End Time': shipment.endTime || 'N/A',
          'Duration': calculateDuration(shipment.startTime, shipment.endTime),
          'Total Boxes': shipment.boxes?.length || 0,
          'Total Products': totalProducts,
          'Total Weight (kg)': totalWeight.toFixed(2),
          'Charged Weight (kg)': totalWeight.toFixed(2),
          'Box #': '',
          'Box Type': '',
          'Box Weight (kg)': '',
          'Box Dimensions': '',
          'Volume Weight (kg)': '',
          'Product SKU': '',
          'Product Name': '',
          'Product Quantity': '',
          'External SKU': ''
        });

        // Add box and product details
        shipment.boxes?.forEach((box, boxIndex) => {
          if (box.products && box.products.length > 0) {
            box.products.forEach((product, productIndex) => {
              data.push({
                'Shipment #': '',
                'Invoice No': '',
                'Date': '',
                'Customer': '',
                'Start Time': '',
                'End Time': '',
                'Duration': '',
                'Total Boxes': '',
                'Total Products': '',
                'Total Weight (kg)': '',
                'Charged Weight (kg)': '',
                'Box #': box.boxNo + (box.isShortBox ? ' (Short)' : ''),
                'Box Type': box.isShortBox ? 'Short Box' : 'Regular Box',
                'Box Weight (kg)': box.finalWeight || 0,
                'Box Dimensions': `${box.length || 0}×${box.height || 0}×${box.width || 0}`,
                'Volume Weight (kg)': ((box.volume || 0) / 4500).toFixed(2),
                'Product SKU': product.sku,
                'Product Name': product.productName,
                'Product Quantity': product.quantity,
                'External SKU': product.externalSku || ''
              });
            });
          } else {
            // Box with no products
            data.push({
              'Shipment #': '',
              'Invoice No': '',
              'Date': '',
              'Customer': '',
              'Start Time': '',
              'End Time': '',
              'Duration': '',
              'Total Boxes': '',
              'Total Products': '',
              'Total Weight (kg)': '',
              'Box #': box.boxNo + (box.isShortBox ? ' (Short)' : ''),
              'Box Type': box.isShortBox ? 'Short Box' : 'Regular Box',
              'Box Weight (kg)': box.finalWeight || 0,
              'Box Dimensions': `${box.length || 0}×${box.height || 0}×${box.width || 0}`,
              'Volume Weight (kg)': ((box.volume || 0) / 4500).toFixed(2),
              'Product SKU': '',
              'Product Name': '',
              'Product Quantity': '',
              'External SKU': ''
            });
          }
        });
      });

    const filename = `All_Shipments_Report_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToExcel(data, `${filename}.xlsx`);
  };

  const exportCustomerDetails = () => {
    if (!selectedCustomer) return;
    
    const data = [];
    
    selectedCustomer.shipments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((shipment, shipmentIndex) => {
        const totalProducts = shipment.boxes?.reduce((sum, box) => 
          sum + (box.products?.reduce((prodSum, prod) => prodSum + (prod.quantity || 0), 0) || 0), 0
        ) || 0;
        const totalWeight = shipment.boxes?.reduce((sum, box) => 
          sum + parseFloat(box.finalWeight || 0), 0
        ) || 0;

        // Add shipment header row
        data.push({
          'Shipment #': shipmentIndex + 1,
          'Invoice No': shipment.invoiceNo,
          'Date': format(new Date(shipment.date), 'MMM dd, yyyy'),
          'Customer': shipment.partyName,
          'Start Time': shipment.startTime || 'N/A',
          'End Time': shipment.endTime || 'N/A',
          'Duration': calculateDuration(shipment.startTime, shipment.endTime),
          'Total Boxes': shipment.boxes?.length || 0,
          'Total Products': totalProducts,
          'Total Weight (kg)': totalWeight.toFixed(2),
          'Charged Weight (kg)': totalWeight.toFixed(2),
          'Box #': '',
          'Box Type': '',
          'Box Weight (kg)': '',
          'Box Dimensions': '',
          'Volume Weight (kg)': '',
          'Product SKU': '',
          'Product Name': '',
          'Product Quantity': '',
          'External SKU': ''
        });

        // Add box and product details
        shipment.boxes?.forEach((box, boxIndex) => {
          if (box.products && box.products.length > 0) {
            box.products.forEach((product, productIndex) => {
              data.push({
                'Shipment #': '',
                'Invoice No': '',
                'Date': '',
                'Customer': '',
                'Start Time': '',
                'End Time': '',
                'Duration': '',
                'Total Boxes': '',
                'Total Products': '',
                'Total Weight (kg)': '',
                'Charged Weight (kg)': '',
                'Box #': box.boxNo + (box.isShortBox ? ' (Short)' : ''),
                'Box Type': box.isShortBox ? 'Short Box' : 'Regular Box',
                'Box Weight (kg)': box.finalWeight || 0,
                'Box Dimensions': `${box.length || 0}×${box.height || 0}×${box.width || 0}`,
                'Volume Weight (kg)': ((box.volume || 0) / 4500).toFixed(2),
                'Product SKU': product.sku,
                'Product Name': product.productName,
                'Product Quantity': product.quantity,
                'External SKU': product.externalSku || ''
              });
            });
          } else {
            // Box with no products
            data.push({
              'Shipment #': '',
              'Invoice No': '',
              'Date': '',
              'Customer': '',
              'Start Time': '',
              'End Time': '',
              'Duration': '',
              'Total Boxes': '',
              'Total Products': '',
              'Total Weight (kg)': '',
              'Charged Weight (kg)': '',
              'Box #': box.boxNo + (box.isShortBox ? ' (Short)' : ''),
              'Box Type': box.isShortBox ? 'Short Box' : 'Regular Box',
              'Box Weight (kg)': box.finalWeight || 0,
              'Box Dimensions': `${box.length || 0}×${box.height || 0}×${box.width || 0}`,
              'Volume Weight (kg)': ((box.volume || 0) / 4500).toFixed(2),
              'Product SKU': '',
              'Product Name': '',
              'Product Quantity': '',
              'External SKU': ''
            });
          }
        });
      });

    const filename = `Customer_Details_${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToExcel(data, `${filename}.xlsx`);
  };

  // PDF Export Functions
  const exportToPDF = (data, filename, title) => {
    const doc = new jsPDF('landscape'); // Use landscape orientation for better readability
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 30);
    
    // Add table
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      const rows = data.map(row => columns.map(col => row[col] || ''));
      
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 40,
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'left'
        },
        headStyles: { 
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didParseCell: function(data) {
          // Style SHIPMENT rows differently
          if (data.row.index > 0 && data.cell.text[0] === 'SHIPMENT') {
            data.cell.styles.fillColor = [220, 248, 198]; // Light green background
            data.cell.styles.fontStyle = 'bold';
          }
          // Style BOX rows differently
          else if (data.row.index > 0 && data.cell.text[0] === 'BOX') {
            data.cell.styles.fillColor = [255, 255, 255]; // White background
            data.cell.styles.fontStyle = 'normal';
          }
          // Style PRODUCT rows differently
          else if (data.row.index > 0 && data.cell.text[0] === 'PRODUCT') {
            data.cell.styles.fillColor = [248, 249, 250]; // Light gray background
            data.cell.styles.fontStyle = 'normal';
          }
        },
        columnStyles: {
          'Type': { cellWidth: 15 },
          'Shipment #': { cellWidth: 15 },
          'Invoice': { cellWidth: 20 },
          'Date': { cellWidth: 20 },
          'Customer': { cellWidth: 30 },
          'Time': { cellWidth: 25 },
          'Total Boxes': { cellWidth: 15 },
          'Total Weight (kg)': { cellWidth: 20 },
          'Details': { cellWidth: 40 }
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto'
      });
    }
    
    doc.save(`${filename}.pdf`);
  };

  const exportSummaryReportPDF = () => {
    const data = Object.entries(summary.customerStats).map(([customer, stats]) => ({
      'Customer': customer,
      'Shipments': stats.count,
      'Total Boxes': stats.totalBoxes,
      'Total Weight (kg)': stats.totalWeight.toFixed(2),
      'Charged Weight (kg)': stats.totalWeight.toFixed(2)
    }));

    const filename = `Summary_Report_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToPDF(data, filename, 'Summary Report');
  };

  const exportDetailedReportPDF = () => {
    const data = [];
    
    filteredShipments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((shipment, shipmentIndex) => {
        const totalWeight = shipment.boxes?.reduce((sum, box) => 
          sum + parseFloat(box.finalWeight || 0), 0
        ) || 0;

        // Add shipment header row
        data.push({
          'Type': 'SHIPMENT',
          'Shipment #': shipmentIndex + 1,
          'Invoice': shipment.invoiceNo,
          'Date': format(new Date(shipment.date), 'MMM dd, yyyy'),
          'Customer': shipment.partyName,
          'Time': `${shipment.startTime || 'N/A'} - ${shipment.endTime || 'N/A'}`,
          'Total Boxes': shipment.boxes?.length || 0,
          'Total Weight (kg)': totalWeight.toFixed(2),
          'Details': ''
        });

        // Add box summary rows
        shipment.boxes?.forEach((box, boxIndex) => {
          const boxProducts = box.products || [];
          const boxProductCount = boxProducts.reduce((sum, prod) => sum + (prod.quantity || 0), 0);
          
          data.push({
            'Type': 'BOX',
            'Shipment #': '',
            'Invoice': '',
            'Date': '',
            'Customer': '',
            'Time': '',
            'Total Boxes': '',
            'Total Weight (kg)': '',
            'Details': `Box #${box.boxNo}${box.isShortBox ? ' (Short)' : ''} - ${boxProductCount} products - ${box.finalWeight || 0}kg`
          });
        });

        // Add separator row between shipments
        if (shipmentIndex < filteredShipments.length - 1) {
          data.push({
            'Type': '',
            'Shipment #': '',
            'Invoice': '',
            'Date': '',
            'Customer': '',
            'Time': '',
            'Total Boxes': '',
            'Total Weight (kg)': '',
            'Details': '────────────────────────────────────────'
          });
        }
      });

    const filename = `Detailed_Report_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToPDF(data, filename, 'Detailed Report');
  };

  const exportAllShipmentsReportPDF = () => {
    const data = [];
    
    filteredShipments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((shipment, shipmentIndex) => {
        const totalWeight = shipment.boxes?.reduce((sum, box) => 
          sum + parseFloat(box.finalWeight || 0), 0
        ) || 0;

        // Add shipment header row
        data.push({
          'Type': 'SHIPMENT',
          'Shipment #': shipmentIndex + 1,
          'Invoice': shipment.invoiceNo,
          'Date': format(new Date(shipment.date), 'MMM dd, yyyy'),
          'Customer': shipment.partyName,
          'Time': `${shipment.startTime || 'N/A'} - ${shipment.endTime || 'N/A'}`,
          'Total Boxes': shipment.boxes?.length || 0,
          'Total Weight (kg)': totalWeight.toFixed(2),
          'Details': ''
        });

        // Add box and product details
        shipment.boxes?.forEach((box, boxIndex) => {
          if (box.products && box.products.length > 0) {
            box.products.forEach((product, productIndex) => {
              data.push({
                'Type': 'PRODUCT',
                'Shipment #': '',
                'Invoice': '',
                'Date': '',
                'Customer': '',
                'Time': '',
                'Total Boxes': '',
                'Total Weight (kg)': '',
                'Details': `Box #${box.boxNo}${box.isShortBox ? ' (Short)' : ''} | ${product.sku} - ${product.productName} | Qty: ${product.quantity}${product.externalSku ? ` | Ext: ${product.externalSku}` : ''}`
              });
            });
          } else {
            // Box with no products
            data.push({
              'Type': 'BOX',
              'Shipment #': '',
              'Invoice': '',
              'Date': '',
              'Customer': '',
              'Time': '',
              'Total Boxes': '',
              'Total Weight (kg)': '',
              'Details': `Box #${box.boxNo}${box.isShortBox ? ' (Short)' : ''} - No products - ${box.finalWeight || 0}kg`
            });
          }
        });

        // Add separator row between shipments
        if (shipmentIndex < filteredShipments.length - 1) {
          data.push({
            'Type': '',
            'Shipment #': '',
            'Invoice': '',
            'Date': '',
            'Customer': '',
            'Time': '',
            'Total Boxes': '',
            'Total Weight (kg)': '',
            'Details': '────────────────────────────────────────'
          });
        }
      });

    const filename = `All_Shipments_Report_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToPDF(data, filename, 'Detailed Full Report');
  };

  const exportCustomerDetailsPDF = () => {
    if (!selectedCustomer) return;
    
    const data = selectedCustomer.shipments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((shipment, shipmentIndex) => {
        const totalProducts = shipment.boxes?.reduce((sum, box) => 
          sum + (box.products?.reduce((prodSum, prod) => prodSum + (prod.quantity || 0), 0) || 0), 0
        ) || 0;
        const totalWeight = shipment.boxes?.reduce((sum, box) => 
          sum + parseFloat(box.finalWeight || 0), 0
        ) || 0;

        return {
          'Shipment #': shipmentIndex + 1,
          'Invoice': shipment.invoiceNo,
          'Date': format(new Date(shipment.date), 'MMM dd, yyyy'),
          'Time': `${shipment.startTime || 'N/A'} - ${shipment.endTime || 'N/A'}`,
          'Boxes': shipment.boxes?.length || 0,
          'Products': totalProducts,
          'Weight (kg)': totalWeight.toFixed(2)
        };
      });

    const filename = `Customer_Details_${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToPDF(data, filename, `Customer Details - ${selectedCustomer.name}`);
  };

  return (
    <div className="container">
      <div className="card">
      
        {/* Report Selection */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
           
            <button
              className={`btn ${selectedReport === 'detailed' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSelectedReport('detailed')}
            >
              Summary
            </button>
             <button
              className={`btn ${selectedReport === 'summary' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSelectedReport('summary')}
            >
              Shipments By Customer
            </button>
            <button
              className={`btn ${selectedReport === 'all-shipments' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setSelectedReport('all-shipments')}
            >
              Detailed Full Report
            </button>
          </div>

          {/* Date Range Filter */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontWeight: '600', color: '#34495e' }}>Date Range:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              style={{ padding: '5px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              style={{ padding: '5px', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
            >
              Clear Filter
            </button>
            <button 
              className="btn btn-success btn-sm"
              onClick={() => {
                if (selectedReport === 'summary') exportSummaryReport();
                else if (selectedReport === 'detailed') exportDetailedReport();
                else if (selectedReport === 'all-shipments') exportAllShipmentsReport();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              📊 Export Excel
            </button>
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (selectedReport === 'summary') exportSummaryReportPDF();
                else if (selectedReport === 'detailed') exportDetailedReportPDF();
                else if (selectedReport === 'all-shipments') exportAllShipmentsReportPDF();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              📄 Export PDF
            </button>
          </div>
        </div>

        {/* Summary Report */}
        {selectedReport === 'summary' && (
          <div>
            
            {/* Overall Statistics */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px', 
              marginBottom: '30px' 
            }}>
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e3f2fd', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '1px solid #bbdefb'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#1976d2' }}>Total Shipments</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d47a1' }}>
                  {summary.totalShipments}
                </div>
              </div>
              
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#f3e5f5', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '1px solid #ce93d8'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#7b1fa2' }}>Total Boxes</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a148c' }}>
                  {summary.totalBoxes}
                </div>
              </div>
              
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e8f5e8', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '1px solid #a5d6a7'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#388e3c' }}>Total Weight</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1b5e20' }}>
                  {summary.totalWeight} kg
                </div>
              </div>
              
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#fff3e0', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '1px solid #ffcc02'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#f57c00' }}>Total Charged Weight</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
                  {filteredShipments.reduce((sum, shipment) => {
                    return sum + (shipment.boxes?.reduce((boxSum, box) => boxSum + parseFloat(box.finalWeight || 0), 0) || 0);
                  }, 0).toFixed(2)} kg
                </div>
              </div>
            </div>

            {/* Customer Statistics */}
            <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Customer Statistics</h4>
            <div className="table-responsive">
              <table className="table" style={{ fontSize: '14px' }}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Shipments</th>
                    <th>Total Boxes</th>
                    <th>Total Weight (kg)</th>
                    <th>Charged Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.customerStats)
                    .sort(([,a], [,b]) => b.count - a.count)
                    .map(([customer, stats]) => (
                    <tr key={customer}>
                      <td>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#007bff',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            padding: '0'
                          }}
                          onClick={() => handleCustomerClick(customer)}
                          title="Click to view detailed shipments"
                        >
                          {customer}
                        </button>
                      </td>
                      <td>{stats.count}</td>
                      <td>{stats.totalBoxes}</td>
                      <td>{stats.totalWeight.toFixed(2)}</td>
                      <td>{stats.totalWeight.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Report */}
        {selectedReport === 'detailed' && (
          <div>
            
            <div className="table-responsive">
              <table className="table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Duration</th>
                    <th>Boxes</th>
                    <th>Total Weight</th>
                    <th>Charged Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(shipment => {
                      const weights = shipment.boxes?.reduce((sum, box) => ({
                        total: sum.total + parseFloat(box.finalWeight || 0),
                        charged: sum.charged + parseFloat(box.finalWeight || 0)
                      }), { total: 0, charged: 0 }) || { total: 0, charged: 0 };
                      
                      return (
                        <tr key={shipment.id}>
                          <td>{format(new Date(shipment.date), 'MMM dd, yyyy')}</td>
                          <td style={{ fontWeight: '600' }}>{shipment.invoiceNo}</td>
                          <td>{shipment.partyName}</td>
                          <td>{shipment.startTime || '-'}</td>
                          <td>{shipment.endTime || '-'}</td>
                          <td>{calculateDuration(shipment.startTime, shipment.endTime)}</td>
                          <td>{shipment.boxes?.length || 0}</td>
                          <td>{weights.total.toFixed(2)} kg</td>
                          <td>{weights.charged.toFixed(2)} kg</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Shipments Report */}
        {selectedReport === 'all-shipments' && (
          <div>
            
            {/* Overall Statistics */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px', 
              marginBottom: '30px' 
            }}>
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e3f2fd', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '1px solid #bbdefb'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#1976d2' }}>Total Shipments</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d47a1' }}>
                  {filteredShipments.length}
                </div>
              </div>
              
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#f3e5f5', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '1px solid #ce93d8'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#7b1fa2' }}>Total Boxes</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a148c' }}>
                  {filteredShipments.reduce((sum, shipment) => sum + (shipment.boxes?.length || 0), 0)}
                </div>
              </div>
              
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e8f5e8', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '1px solid #a5d6a7'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#388e3c' }}>Total Weight</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1b5e20' }}>
                  {filteredShipments.reduce((sum, shipment) => {
                    return sum + (shipment.boxes?.reduce((boxSum, box) => boxSum + parseFloat(box.finalWeight || 0), 0) || 0);
                  }, 0).toFixed(2)} kg
                </div>
              </div>
              
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#fff3e0', 
                borderRadius: '8px', 
                textAlign: 'center',
                border: '1px solid #ffcc02'
              }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#f57c00' }}>Total Charged Weight</h4>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
                  {filteredShipments.reduce((sum, shipment) => {
                    return sum + (shipment.boxes?.reduce((boxSum, box) => boxSum + parseFloat(box.finalWeight || 0), 0) || 0);
                  }, 0).toFixed(2)} kg
                </div>
              </div>
            </div>

            {/* All Shipments with Full Details */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Complete Shipment Details</h4>
              
              {filteredShipments
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((shipment, index) => {
                  const totalProducts = shipment.boxes?.reduce((sum, box) => 
                    sum + (box.products?.reduce((prodSum, prod) => prodSum + (prod.quantity || 0), 0) || 0), 0
                  ) || 0;
                  const totalWeight = shipment.boxes?.reduce((sum, box) => 
                    sum + parseFloat(box.finalWeight || 0), 0
                  ) || 0;
                  
                  return (
                    <div key={shipment.id} style={{ 
                      marginBottom: '25px', 
                      border: '1px solid #dee2e6', 
                      borderRadius: '8px', 
                      padding: '20px',
                      backgroundColor: '#fafafa'
                    }}>
                      {/* Shipment Header */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '15px',
                        paddingBottom: '10px',
                        borderBottom: '2px solid #e9ecef'
                      }}>
                        <div>
                          <h5 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '18px' }}>
                            Shipment #{index + 1} - {shipment.invoiceNo}
                          </h5>
                          <div style={{ fontSize: '14px', color: '#6c757d' }}>
                            📅 {format(new Date(shipment.date), 'EEEE, MMMM dd, yyyy')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                            {shipment.partyName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            Duration: {calculateDuration(shipment.startTime, shipment.endTime)}
                          </div>
                        </div>
                      </div>

                      {/* Shipment Summary */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                        gap: '15px',
                        marginBottom: '20px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Start Time</div>
                          <div style={{ fontWeight: '600', color: '#495057' }}>{shipment.startTime || 'N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>End Time</div>
                          <div style={{ fontWeight: '600', color: '#495057' }}>{shipment.endTime || 'N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Total Boxes</div>
                          <div style={{ fontWeight: '600', color: '#495057' }}>{shipment.boxes?.length || 0}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Total Products</div>
                          <div style={{ fontWeight: '600', color: '#495057' }}>{totalProducts}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Total Weight</div>
                          <div style={{ fontWeight: '600', color: '#495057' }}>{totalWeight.toFixed(2)} kg</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Charged Weight</div>
                          <div style={{ fontWeight: '600', color: '#495057' }}>{totalWeight.toFixed(2)} kg</div>
                        </div>
                      </div>

                      {/* Box Details */}
                      <div>
                        <h6 style={{ color: '#495057', marginBottom: '10px', fontSize: '14px' }}>📦 Box Details:</h6>
                        {shipment.boxes?.map((box, boxIndex) => (
                          <div key={boxIndex} style={{ 
                            marginBottom: '10px', 
                            padding: '12px', 
                            backgroundColor: 'white', 
                            borderRadius: '4px',
                            border: '1px solid #e9ecef'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}>
                              <div style={{ fontWeight: '600', color: '#495057' }}>
                                Box #{box.boxNo} {box.isShortBox ? '(Short Box)' : ''}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                Weight: {box.finalWeight || 0} kg | 
                                Dimensions: {box.length || 0}×{box.height || 0}×{box.width || 0} cm |
                                Volume Weight: {((box.volume || 0) / 4500).toFixed(2)} kg
                              </div>
                            </div>
                            
                            {box.products && box.products.length > 0 && (
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#495057', marginBottom: '5px' }}>
                                  Products ({box.products.length}):
                                </div>
                                <div style={{ fontSize: '11px', marginLeft: '10px' }}>
                                  {box.products.map((product, prodIndex) => (
                                    <div key={prodIndex} style={{ 
                                      marginBottom: '3px',
                                      padding: '2px 0',
                                      borderBottom: '1px solid #f8f9fa'
                                    }}>
                                      <span style={{ fontWeight: '600' }}>{product.sku}</span> - {product.productName} 
                                      <span style={{ color: '#007bff', marginLeft: '5px' }}>(Qty: {product.quantity})</span>
                                      {product.externalSku && (
                                        <span style={{ color: '#6c757d', marginLeft: '5px' }}>
                                          [Ext: {product.externalSku}]
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {filteredShipments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <h4>No shipments found</h4>
            <p>Try adjusting your date range filter or create some shipments first.</p>
          </div>
        )}
      </div>

      {/* Customer Details Modal */}
      {showCustomerDetails && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Shipment Details - {selectedCustomer.name}</h3>
              <button className="btn-close" onClick={closeCustomerDetails}>&times;</button>
            </div>

            <div className="modal-body">
              {/* Customer Summary */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Customer Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  <div>
                    <strong>Total Shipments:</strong> {selectedCustomer.shipments.length}
                  </div>
                  <div>
                    <strong>Total Boxes:</strong> {selectedCustomer.shipments.reduce((sum, s) => sum + (s.boxes?.length || 0), 0)}
                  </div>
                  <div>
                    <strong>Total Weight:</strong> {selectedCustomer.shipments.reduce((sum, s) => 
                      sum + (s.boxes?.reduce((boxSum, box) => boxSum + parseFloat(box.finalWeight || 0), 0) || 0), 0
                    ).toFixed(2)} kg
                  </div>
                </div>
              </div>

              {/* Shipment Details Table */}
              <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Shipment Details</h4>
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice No</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Duration</th>
                      <th>Boxes</th>
                      <th>Products</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.shipments
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(shipment => {
                        const totalProducts = shipment.boxes?.reduce((sum, box) => 
                          sum + (box.products?.reduce((prodSum, prod) => prodSum + (prod.quantity || 0), 0) || 0), 0
                        ) || 0;
                        const totalWeight = shipment.boxes?.reduce((sum, box) => 
                          sum + parseFloat(box.finalWeight || 0), 0
                        ) || 0;
                        
                        return (
                          <tr key={shipment.id}>
                            <td>{format(new Date(shipment.date), 'MMM dd, yyyy')}</td>
                            <td style={{ fontWeight: '600' }}>{shipment.invoiceNo}</td>
                            <td>{shipment.startTime || '-'}</td>
                            <td>{shipment.endTime || '-'}</td>
                            <td>{calculateDuration(shipment.startTime, shipment.endTime)}</td>
                            <td>{shipment.boxes?.length || 0}</td>
                            <td>{totalProducts}</td>
                            <td>{totalWeight.toFixed(2)} kg</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Shipment Details with Boxes */}
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Shipment Details</h4>
                {selectedCustomer.shipments
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((shipment, shipmentIndex) => {
                    const totalProducts = shipment.boxes?.reduce((sum, box) => 
                      sum + (box.products?.reduce((prodSum, prod) => prodSum + (prod.quantity || 0), 0) || 0), 0
                    ) || 0;
                    const totalWeight = shipment.boxes?.reduce((sum, box) => 
                      sum + parseFloat(box.finalWeight || 0), 0
                    ) || 0;
                    
                    return (
                      <div key={shipment.id} style={{ 
                        marginBottom: '30px', 
                        border: '2px solid #dee2e6', 
                        borderRadius: '8px', 
                        padding: '20px',
                        backgroundColor: '#fafafa'
                      }}>
                        {/* Shipment Header */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '15px',
                          paddingBottom: '10px',
                          borderBottom: '2px solid #e9ecef'
                        }}>
                          <div>
                            <h5 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '18px' }}>
                              Shipment #{shipmentIndex + 1} - {shipment.invoiceNo}
                            </h5>
                            <div style={{ fontSize: '14px', color: '#6c757d' }}>
                              📅 {format(new Date(shipment.date), 'EEEE, MMMM dd, yyyy')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                              {shipment.partyName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              Duration: {calculateDuration(shipment.startTime, shipment.endTime)}
                            </div>
                          </div>
                        </div>

                        {/* Shipment Summary */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                          gap: '15px',
                          marginBottom: '20px',
                          padding: '15px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Start Time</div>
                            <div style={{ fontWeight: '600', color: '#495057' }}>{shipment.startTime || 'N/A'}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>End Time</div>
                            <div style={{ fontWeight: '600', color: '#495057' }}>{shipment.endTime || 'N/A'}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Total Boxes</div>
                            <div style={{ fontWeight: '600', color: '#495057' }}>{shipment.boxes?.length || 0}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Total Products</div>
                            <div style={{ fontWeight: '600', color: '#495057' }}>{totalProducts}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Total Weight</div>
                            <div style={{ fontWeight: '600', color: '#495057' }}>{totalWeight.toFixed(2)} kg</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Charged Weight</div>
                            <div style={{ fontWeight: '600', color: '#495057' }}>{totalWeight.toFixed(2)} kg</div>
                          </div>
                        </div>

                        {/* Box Details for this Shipment */}
                        <div>
                          <h6 style={{ color: '#495057', marginBottom: '10px', fontSize: '14px' }}>📦 Box Details:</h6>
                          {shipment.boxes?.map((box, boxIndex) => (
                            <div key={boxIndex} style={{ 
                              marginBottom: '10px', 
                              padding: '12px', 
                              backgroundColor: 'white', 
                              borderRadius: '4px',
                              border: '1px solid #e9ecef'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '8px'
                              }}>
                                <div style={{ fontWeight: '600', color: '#495057' }}>
                                  Box #{box.boxNo} {box.isShortBox ? '(Short Box)' : ''}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                  Weight: {box.finalWeight || 0} kg | 
                                  Dimensions: {box.length || 0}×{box.height || 0}×{box.width || 0} cm |
                                  Volume Weight: {((box.volume || 0) / 4500).toFixed(2)} kg
                                </div>
                              </div>
                              
                              {box.products && box.products.length > 0 && (
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#495057', marginBottom: '5px' }}>
                                    Products ({box.products.length}):
                                  </div>
                                  <div style={{ fontSize: '11px', marginLeft: '10px' }}>
                                    {box.products.map((product, prodIndex) => (
                                      <div key={prodIndex} style={{ 
                                        marginBottom: '3px',
                                        padding: '2px 0',
                                        borderBottom: '1px solid #f8f9fa'
                                      }}>
                                        <span style={{ fontWeight: '600' }}>{product.sku}</span> - {product.productName} 
                                        <span style={{ color: '#007bff', marginLeft: '5px' }}>(Qty: {product.quantity})</span>
                                        {product.externalSku && (
                                          <span style={{ color: '#6c757d', marginLeft: '5px' }}>
                                            [Ext: {product.externalSku}]
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-success"
                onClick={exportCustomerDetails}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                📊 Export Excel
              </button>
              <button 
                className="btn btn-danger"
                onClick={exportCustomerDetailsPDF}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                📄 Export PDF
              </button>
              <button className="btn btn-secondary" onClick={closeCustomerDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;