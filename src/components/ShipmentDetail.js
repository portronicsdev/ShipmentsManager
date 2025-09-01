import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import BoxLabel from './BoxLabel';
import ShipmentLabel from './ShipmentLabel';

const ShipmentDetail = ({ shipments, products, onUpdate, onDelete }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const shipment = shipments.find(s => s.id === id);
  
  // Refs for printing
  const shipmentLabelRef = useRef();
  const boxLabelRefs = useRef({});
  
  // Print handlers
  const handlePrintShipment = useReactToPrint({
    content: () => shipmentLabelRef.current,
  });
  
  const [currentPrintBoxId, setCurrentPrintBoxId] = useState(null);
  
  const handlePrintBox = useReactToPrint({
    content: () => boxLabelRefs.current[currentPrintBoxId],
  });
  
  const printBox = (boxId) => {
    setCurrentPrintBoxId(boxId);
    setTimeout(() => {
      handlePrintBox();
    }, 100);
  };
  
  if (!shipment) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Shipment not found</h2>
        <p>The shipment you're looking for doesn't exist.</p>
        <button 
          onClick={() => navigate('/shipments')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Back to Shipments
        </button>
      </div>
    );
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'Not set';
    const [hour, minute] = timeString.split(':');
    const hour12 = parseInt(hour) % 12 || 12;
    const ampm = parseInt(hour) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minute} ${ampm}`;
  };

  const totalInvoiceQty = shipment.boxes.reduce((sum, box) => 
    sum + box.products.reduce((boxSum, product) => boxSum + parseInt(product.quantity), 0), 0
  );

  const totalActualWeight = shipment.boxes.reduce((sum, box) => sum + box.finalWeight, 0);
  const totalVolumeWeight = shipment.boxes.reduce((sum, box) => sum + box.volumeWeight, 0);
  const totalChargedWeight = Math.max(totalActualWeight, totalVolumeWeight);

  return (
    <div style={{ padding: '15px', maxWidth: '100%', margin: '0' }}>
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: '#2c3e50' }}>
            Shipment Details
          </h1>
          <p style={{ color: '#7f8c8d', margin: '0', fontSize: '14px' }}>
            Invoice: {shipment.invoiceNo} | Party: {shipment.partyName}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate('/shipments')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Back to List
          </button>
          <button 
            onClick={handlePrintShipment}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🖨️ Print Shipment
          </button>
          
        </div>
      </div>

      {/* Shipment Information & Summary - Merged */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '20px', 
        marginBottom: '15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 15px 0', color: '#2c3e50' }}>Shipment Overview</h2>
        
        {/* Basic Info Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Date</label>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px' }}>
              {format(new Date(shipment.date), 'MMM dd, yyyy')}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Invoice</label>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px' }}>
              {shipment.invoiceNo}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Party</label>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px' }}>
              {shipment.partyName}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Start</label>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px' }}>
              {formatTime(shipment.startTime)}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>End</label>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px' }}>
              {formatTime(shipment.endTime)}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#34495e', fontSize: '12px' }}>Boxes</label>
            <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px' }}>
              {shipment.boxes.length}
            </div>
          </div>
        </div>
        
                 {/* Summary Stats Row */}
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px' }}>
           <div style={{ 
             padding: '12px', 
             backgroundColor: '#e8f4fd', 
             borderRadius: '6px',
             border: '1px solid #b3d9ff',
             textAlign: 'center'
           }}>
             <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '3px' }}>Total Pieces</div>
             <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>{totalInvoiceQty}</div>
           </div>
           
           <div style={{ 
             padding: '12px', 
             backgroundColor: '#d4edda', 
             borderRadius: '6px',
             border: '1px solid #c3e6cb',
             textAlign: 'center'
           }}>
             <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '3px' }}>Available Qty</div>
             <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
               {shipment.boxes.filter(box => !box.isShortBox).reduce((sum, box) => 
                 sum + box.products.reduce((boxSum, product) => boxSum + parseInt(product.quantity), 0), 0
               )}
             </div>
           </div>
           
           <div style={{ 
             padding: '12px', 
             backgroundColor: '#f8d7da', 
             borderRadius: '6px',
             border: '1px solid #f5c6cb',
             textAlign: 'center'
           }}>
             <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '3px' }}>Short Qty</div>
             <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
               {shipment.boxes.filter(box => box.isShortBox).reduce((sum, box) => 
                 sum + box.products.reduce((boxSum, product) => boxSum + parseInt(product.quantity), 0), 0
               )}
             </div>
           </div>
          
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#e8f4fd', 
            borderRadius: '6px',
            border: '1px solid #b3d9ff',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '3px' }}>Total Volume</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
              {shipment.boxes.reduce((sum, box) => sum + box.volume, 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: '#6c757d' }}>cm³</div>
          </div>
          
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#e8f4fd', 
            borderRadius: '6px',
            border: '1px solid #b3d9ff',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '3px' }}>Actual Weight</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
              {totalActualWeight.toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: '#6c757d' }}>kg</div>
          </div>
          
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#e8f4fd', 
            borderRadius: '6px',
            border: '1px solid #b3d9ff',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '3px' }}>Charged Weight</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
              {totalChargedWeight.toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: '#6c757d' }}>kg</div>
          </div>
        </div>
      </div>

      {/* Boxes Details - Compact */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '20px', 
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 15px 0', color: '#2c3e50' }}>
          Boxes ({shipment.boxes.length})
        </h2>
        
        {/* Boxes Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Box #</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Type</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Dimensions (L×H×W)</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Weight (kg)</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Box Dimention Weight (KG)</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Products</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Calculations</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipment.boxes.map(box => (
                <tr key={box.id} style={{ 
                  borderBottom: '1px solid #e9ecef',
                  backgroundColor: box.isShortBox ? '#ffe6e6' : 'transparent'
                }}>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#2c3e50' }}>
                    Box #{box.boxNo}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', textAlign: 'center' }}>
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
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        NORMAL
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {box.length} × {box.height} × {box.width}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div><strong>Box:</strong> {box.weight}</div>
                    <div><strong>Final:</strong> {box.finalWeight}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>{box.volumeWeight}</div>
                  </td>
                  <td style={{ padding: '12px', maxWidth: '300px' }}>
                    {box.products.map(product => (
                      <div key={product.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '6px 8px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        margin: '2px 0',
                        fontSize: '12px'
                      }}>
                        <span style={{ fontWeight: '500' }}>{product.sku}</span>
                        <span style={{ 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          padding: '2px 6px', 
                          borderRadius: '3px',
                          fontSize: '10px'
                        }}>
                          {product.quantity}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px' }}>
                    <div><strong>Pieces:</strong> {box.products.reduce((sum, product) => sum + parseInt(product.quantity), 0)}</div>
                    <div><strong>Max Wt:</strong> {box.finalWeight} kg</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => printBox(box.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      🖨️ Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Print Components */}
      <div style={{ display: 'none' }}>
        {/* Shipment Label for Printing */}
        <ShipmentLabel ref={shipmentLabelRef} shipment={shipment} />
        
        {/* Box Labels for Printing */}
        {shipment.boxes.map(box => (
          <BoxLabel 
            key={box.id} 
            ref={el => boxLabelRefs.current[box.id] = el}
            box={box} 
            shipment={shipment} 
          />
        ))}
      </div>
    </div>
  );
};

export default ShipmentDetail;

