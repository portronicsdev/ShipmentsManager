import React from 'react';

const ShipmentLabel = React.forwardRef(({ shipment }, ref) => {
  const totalInvoiceQty = shipment.boxes.reduce((sum, box) => 
    sum + box.products.reduce((boxSum, product) => boxSum + parseInt(product.quantity), 0), 0
  );
  
  const totalActualWeight = shipment.boxes.reduce((sum, box) => sum + box.finalWeight, 0);
  const totalVolumeWeight = shipment.boxes.reduce((sum, box) => sum + box.volumeWeight, 0);
  const totalChargedWeight = Math.max(totalActualWeight, totalVolumeWeight);
  

  
  return (
    <div ref={ref} style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      lineHeight: '1.4',
      maxWidth: '500px',
      border: '1px solid #ccc'
    }}>
      {/* Title */}
      <div style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        marginBottom: '20px',
        textAlign: 'left'
      }}>
        Shipment Label
      </div>

      {/* Shipment Information Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Invoice Number:</span>
          <span style={{ fontWeight: 'bold' }}>{shipment.invoiceNo}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Party Name:</span>
          <span style={{ fontWeight: 'bold' }}>{shipment.customer?.name || 'Unknown Customer'}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Date:</span>
          <span style={{ fontWeight: 'bold' }}>{shipment.date}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Start Time:</span>
          <span style={{ fontWeight: 'bold' }}>{shipment.startTime || 'Not set'}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>End Time:</span>
          <span style={{ fontWeight: 'bold' }}>{shipment.endTime || 'Not set'}</span>
        </div>
      </div>

      {/* Shipment Summary Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Shipment Actual Weight:</span>
          <span style={{ fontWeight: 'bold' }}>{totalActualWeight.toFixed(2)}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Shipment Dimension Weight:</span>
          <span style={{ fontWeight: 'bold' }}>{totalVolumeWeight.toFixed(2)}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Shipment Max Weight:</span>
          <span style={{ fontWeight: 'bold' }}>{totalChargedWeight.toFixed(2)}</span>
        </div>
        
                 <div style={{ 
           display: 'flex', 
           justifyContent: 'space-between', 
           borderBottom: '1px solid #000',
           padding: '8px 0'
         }}>
           <span>Total Invoice Quantity:</span>
           <span style={{ fontWeight: 'bold' }}>{totalInvoiceQty}</span>
         </div>
         
         <div style={{ 
           display: 'flex', 
           justifyContent: 'space-between', 
           borderBottom: '1px solid #000',
           padding: '8px 0'
         }}>
           <span>Available Quantity:</span>
           <span style={{ fontWeight: 'bold', color: '#28a745' }}>
             {shipment.boxes.filter(box => !box.isShortBox).reduce((sum, box) => 
               sum + box.products.reduce((boxSum, product) => boxSum + parseInt(product.quantity), 0), 0
             )}
           </span>
         </div>
         
         <div style={{ 
           display: 'flex', 
           justifyContent: 'space-between', 
           borderBottom: '1px solid #000',
           padding: '8px 0'
         }}>
           <span>Short Quantity:</span>
           <span style={{ fontWeight: 'bold', color: '#dc3545' }}>
             {shipment.boxes.filter(box => box.isShortBox).reduce((sum, box) => 
               sum + box.products.reduce((boxSum, product) => boxSum + parseInt(product.quantity), 0), 0
             )}
           </span>
         </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Box Count:</span>
          <span style={{ fontWeight: 'bold' }}>{shipment.boxes.length}</span>
        </div>
      </div>

      {/* Box Summary Section */}
      <div>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          borderBottom: '2px solid #000',
          padding: '8px 0'
        }}>
          Box Summary
        </div>
        
        {shipment.boxes.map((box, index) => (
          <div key={box.id} style={{ 
            display: 'flex', 
            borderBottom: '1px solid #000',
            padding: '8px 0'
          }}>
            <span style={{ flex: '1', textAlign: 'left' }}>
              Box {box.boxNo} {box.isShortBox ? '(SHORT)' : ''}
            </span>
            <span style={{ flex: '2', textAlign: 'left' }}>
              {box.products.reduce((sum, product) => sum + parseInt(product.quantity), 0)} pieces
            </span>
            <span style={{ flex: '1', textAlign: 'right' }}>{box.finalWeight} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
});

ShipmentLabel.displayName = 'ShipmentLabel';

export default ShipmentLabel;
