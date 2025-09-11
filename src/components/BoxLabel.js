import React, { useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import './BoxLabel.css';

const n = (v) => (Number.isFinite(+v) ? +v : 0);
const round2 = (v) => (Number.isFinite(+v) ? (+v).toFixed(2) : '0.00');

export const MAX_PRODUCT_ROWS = 12;

export function LabelCanvas({ shipment, box, maxRows = MAX_PRODUCT_ROWS }) {
  const volume = n(box?.length) * n(box?.width) * n(box?.height); // cm^3
  const dimWeight = volume > 0 ? volume / 4500 : 0;               // kg
  const actualWeight = n(box?.finalWeight ?? box?.weight);        // kg
  const chargedWeight = Math.max(actualWeight, dimWeight);        // kg

  const products = useMemo(
    () => (Array.isArray(box?.products) ? box.products : []),
    [box?.products]
  );

  const boxQty = products.reduce((s, p) => s + n(p?.quantity), 0);
  const dimensionStr = `${n(box?.length)}*${n(box?.width)}*${n(box?.height)}`; // L*W*H
  const boxCode = `${shipment?.invoiceNo || ''}_${box?.boxNo || ''}`;

  const { visibleProducts } = useMemo(() => {
    const arr = products.slice(0, maxRows);
    const extra = Math.max(products.length - arr.length, 0);
    return { visibleProducts: arr, extraCount: extra };
  }, [products, maxRows]);

  return (
    <div className="label-root">
      {/* KV table */}
      <table className="kv-table">
        <tbody>
          <tr>
            <td className="kv-k">Invoice No.</td>
            <td className="kv-v">{shipment?.invoiceNo}</td>
          </tr>
          <tr>
            <td className="kv-k">Box No.</td>
            <td className="kv-v">{box?.boxNo}</td>
          </tr>
          <tr>
            <td className="kv-k">Box Code</td>
            <td className="kv-v">{boxCode}</td>
          </tr>
          <tr>
            <td className="kv-k">Party Name</td>
            <td className="kv-v">{shipment?.customer?.name || '-'}</td>
          </tr>
          <tr>
            <td className="kv-k">Box Qty.</td>
            <td className="kv-v">{boxQty}</td>
          </tr>
          <tr>
            <td className="kv-k">Box Weight (KG)</td>
            <td className="kv-v">{round2(actualWeight)}</td>
          </tr>
          <tr>
            <td className="kv-k">Box Dimension</td>
            <td className="kv-v">{dimensionStr}</td>
          </tr>
          <tr>
            <td className="kv-k">Box Dimension Weight (KG)</td>
            <td className="kv-v">{round2(dimWeight)}</td>
          </tr>
          <tr>
            <td className="kv-k">Charged Weight (KG)</td>
            <td className="kv-v">{round2(chargedWeight)}</td>
          </tr>
        </tbody>
      </table>

      {/* Products header */}
      <table className="products-header">
        <thead>
          <tr>
            <th style={{ width: '9%' }}>S.No.</th>
            <th style={{ width: '71%' }}>Product</th>
            <th style={{ width: '20%', textAlign: 'right' }}>Qty.</th>
          </tr>
        </thead>
      </table>

      {/* Bounded products area so rows cannot overflow the label */}
      <div className="products-area">
        <table className="products-body">
          <tbody>
            {visibleProducts.map((p, i) => (
              <tr key={i}>
                <td className="sno">{i + 1}</td>
                <td className="name">
                  {p?.sku ? `${p.sku} - ` : ''}{p?.productName || ''}
                </td>
                <td className="qty">{n(p?.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BoxLabel({ shipment, box, onClose }) {
  const printRef = useRef(null);

  // Landscape 6x4in
  const pageStyle = `
    @page { size: 6in 4in; margin: 0; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `;
  const handlePrint = useReactToPrint({
    contentRef: printRef,            // v3
    content: () => printRef.current, // v2 fallback
    pageStyle,
    removeAfterPrint: false,
    documentTitle: `Box_${shipment?.invoiceNo || ''}_${box?.boxNo || ''}`,
  });

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 700, maxHeight: '85vh' }}>
        <div className="modal-header print-hide">
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {/* Keep visible in print */}
        <div className="modal-body">
          <div ref={printRef} className="label-sheet">
            <LabelCanvas shipment={shipment} box={box} />
          </div>
        </div>

        <div className="modal-footer print-hide">
          <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print Label</button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
