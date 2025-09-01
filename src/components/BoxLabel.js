import React from 'react';

const BoxLabel = React.forwardRef(({ box, shipment }, ref) => {
  const boxQuantity = box.products.reduce((sum, product) => sum + parseInt(product.quantity), 0);
  
  return (
    <div ref={ref} style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      lineHeight: '1.4',
      maxWidth: '400px',
      border: '1px solid #ccc'
    }}>
      {/* Title */}
      <div style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        marginBottom: '20px',
        textAlign: 'left'
      }}>
        {box.isShortBox ? 'Short Box Label' : 'Box Label'}
      </div>

      {/* Box Information Section */}
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
          <span>Box Number:</span>
          <span style={{ fontWeight: 'bold' }}>{box.boxNo}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Party Name:</span>
          <span style={{ fontWeight: 'bold' }}>{shipment.partyName}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Box Quantity:</span>
          <span style={{ fontWeight: 'bold' }}>{boxQuantity}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Box Weight(Kg):</span>
          <span style={{ fontWeight: 'bold' }}>{box.weight}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Box Dimension:</span>
          <span style={{ fontWeight: 'bold' }}>{box.length}*{box.height}*{box.width}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #000',
          padding: '8px 0'
        }}>
          <span>Box Dimension Weight(Kg):</span>
          <span style={{ fontWeight: 'bold' }}>{box.volumeWeight}</span>
        </div>
      </div>

      {/* Product List Section */}
      <div>
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #000',
          padding: '8px 0',
          fontWeight: 'bold'
        }}>
          <span style={{ flex: '1', textAlign: 'left' }}>S.No</span>
          <span style={{ flex: '3', textAlign: 'left' }}>Product</span>
          <span style={{ flex: '1', textAlign: 'right' }}>Quantity</span>
        </div>
        
        {box.products.map((product, index) => (
          <div key={product.id} style={{ 
            display: 'flex', 
            borderBottom: '1px solid #000',
            padding: '8px 0'
          }}>
            <span style={{ flex: '1', textAlign: 'left' }}>{index + 1}</span>
            <span style={{ flex: '3', textAlign: 'left' }}>
              {product.sku}_{product.productName}
            </span>
            <span style={{ flex: '1', textAlign: 'right' }}>{product.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

BoxLabel.displayName = 'BoxLabel';

export default BoxLabel;
