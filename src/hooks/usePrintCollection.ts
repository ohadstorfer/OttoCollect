import { useState } from 'react';
import { CollectionItem } from '@/types';

interface UserInfo {
    username: string;
    rank?: string;
    role?: string;
}

export const usePrintCollection = () => {
    const [isPrinting, setIsPrinting] = useState(false);

    const generatePrintContent = (collectionItems: CollectionItem[], userInfo: UserInfo, countryName?: string) => {
        const printStyles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          height: 100%;
          width: 100%;
          overflow-x: hidden;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 0;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          /* Hide browser headers and footers */
          @page :first {
            margin-top: 0;
          }
          
          @page :left {
            margin-left: 0;
          }
          
          @page :right {
            margin-right: 0;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.3;
            color: black;
            background: white;
            margin: 0;
            padding: 1.5cm;
            min-height: 100vh;
            width: 100%;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print-container {
            max-width: none;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            width: 100%;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 1.5cm;
            border-bottom: 2px solid #333;
            padding-bottom: 0.5cm;
          }
          
          .print-header h1 {
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 0.3cm;
            color: #333;
          }
          
          .total-amount {
            font-size: 16pt;
            font-weight: bold;
            color: #333;
            margin-bottom: 0.5cm;
            text-align: center;
          }
          
          .user-info {
            display: flex;
            gap: 1rem;
            align-items: center;
            justify-content: center;
            font-size: 10pt;
            margin-bottom: 0.3cm;
            flex-wrap: wrap;
          }
          
          .user-info p {
            margin: 0;
            padding: 0.1cm 0;
          }
          
          .print-summary {
            margin-bottom: 1cm;
            padding: 0.5cm;
            border: 1px solid #ccc;
            background: #f8f8f8;
            border-radius: 4px;
          }
          
          .print-summary h2 {
            font-size: 14pt;
            margin-bottom: 0.3cm;
            color: #333;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5cm;
            margin-top: 0.3cm;
          }
          
          .summary-item {
            text-align: center;
            padding: 0.2cm;
            background: white;
            border-radius: 3px;
            border: 1px solid #ddd;
          }
          
          .summary-label {
            font-size: 9pt;
            color: #666;
            margin-bottom: 0.1cm;
          }
          
          .summary-value {
            font-size: 12pt;
            font-weight: bold;
            color: #333;
          }
          
          .collection-list {
            page-break-inside: avoid;
            min-height: calc(100vh - 8cm);
          }
          
          .collection-row {
            display: flex;
            gap: 0.5cm;
            margin-bottom: 0.4cm;
            page-break-inside: avoid;
          }
          
          .collection-item {
            flex: 1;
            padding: 0.3cm;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            display: flex;
            align-items: center;
            gap: 0.3cm;
            min-height: 2.5cm;
          }
          
          .item-images {
            display: flex;
            gap: 0.15cm;
            flex-shrink: 0;
          }
          
          .item-image {
            width: 2.2cm;
            height: 1.4cm;
            border: 1px solid #ccc;
            border-radius: 3px;
            overflow: hidden;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .item-image img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          
          .item-image.placeholder {
            background: #f0f0f0;
            color: #999;
            font-size: 8pt;
            text-align: center;
          }
          
          .item-content {
            flex: 1;
            min-width: 0;
          }
          
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.2cm;
          }
          
          .item-details {
            display: flex;
            flex-direction: column;
            gap: 0.1cm;
          }
          
          .item-denomination {
            font-weight: bold;
            font-size: 11pt;
            color: #333;
          }
          
          .item-year {
            font-size: 10pt;
            color: #666;
          }
          
          .item-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 0.15cm;
            margin-top: 0.1cm;
          }
          
          .item-badge {
            font-size: 8pt;
            padding: 0.1cm 0.2cm;
            border-radius: 3px;
            border: 1px solid #ccc;
            background: #f8f8f8;
            color: #333;
            white-space: nowrap;
          }
          
          .item-badge.condition {
            background: #e8f5e8;
            color: #2d5a2d;
            border-color: #c3e6c3;
          }
          
          .item-badge.grade {
            background: #e8f4fd;
            color: #1e3a8a;
            border-color: #bfdbfe;
          }
          
          .item-badge.catalog {
            background: #fef3c7;
            color: #92400e;
            border-color: #fde68a;
          }
          
          .item-badge.sale {
            background: #dbeafe;
            color: #1e40af;
            border-color: #93c5fd;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .no-print {
            display: none !important;
          }
          
          @media print {
            .collection-row:nth-child(15n) {
              page-break-after: always;
            }
          }
        }
        
        /* Screen styles for preview */
        @media screen {
          body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.3;
            color: black;
            background: white;
            margin: 0;
            padding: 1cm;
            min-height: 100vh;
            width: 100%;
          }
          
          .print-container {
            max-width: 21cm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            min-height: 29.7cm;
            padding: 1.5cm;
          }
        }
      </style>
    `;

        const formatPrice = (price?: number) => {
            if (!price) return '';
            return `$${price.toFixed(2)}`;
        };

        const getConditionColor = (condition?: string) => {
            const colors: Record<string, string> = {
                'UNC': 'condition',
                'AU': 'condition',
                'XF': 'condition',
                'VF': 'condition',
                'F': 'condition',
                'VG': 'condition',
                'G': 'condition',
                'Fair': 'condition',
                'Poor': 'condition'
            };
            return colors[condition || ''] || '';
        };

        const totalValue = collectionItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
        const uniqueCountries = new Set(collectionItems.map(item => item.banknote.country)).size;

        // Group items into pairs for 2 per row
        const itemPairs = [];
        for (let i = 0; i < collectionItems.length; i += 2) {
            itemPairs.push(collectionItems.slice(i, i + 2));
        }

        const generateItemHtml = (item: CollectionItem) => {
            const frontImage = item.obverseImage || (item.banknote.imageUrls && item.banknote.imageUrls[0]) || null;
            const backImage = item.reverseImage || null;

            return `
        <div class="collection-item">
          <div class="item-images">
            <div class="item-image ${!frontImage ? 'placeholder' : ''}">
              ${frontImage ? `<img src="${frontImage}" alt="Front" />` : ''}
            </div>
            <div class="item-image ${!backImage ? 'placeholder' : ''}">
              ${backImage ? `<img src="${backImage}" alt="Back" />` : ''}
            </div>
          </div>
          <div class="item-content">
            <div class="item-header">
              <div class="item-details">
                ${item.banknote.denomination ? `<div class="item-denomination">${item.banknote.denomination}</div>` : ''}
                ${item.banknote.year ? `<div class="item-year">${item.banknote.year}</div>` : ''}
              </div>
            </div>
            <div class="item-badges">
              ${item.banknote.extendedPickNumber ? `<span class="item-badge catalog">${item.banknote.extendedPickNumber}</span>` : ''}
              ${item.banknote.turkCatalogNumber ? `<span class="item-badge catalog">${item.banknote.turkCatalogNumber}</span>` : ''}
              ${item.condition && !item.grade ? `<span class="item-badge ${getConditionColor(item.condition)}">${item.condition}</span>` : ''}
              ${item.grade ? `<span class="item-badge grade">${item.grade_by ? `${item.grade_by} ` : ''}${item.grade}</span>` : ''}
            </div>
          </div>
        </div>
      `;
        };

        const rowsHtml = itemPairs.map(pair => {
            const firstItem = generateItemHtml(pair[0]);
            const secondItem = pair[1] ? generateItemHtml(pair[1]) : '<div class="collection-item" style="visibility: hidden;"></div>';

            return `
        <div class="collection-row">
          ${firstItem}
          ${secondItem}
        </div>
      `;
        }).join('');

        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${userInfo.username}'s ${countryName || ''} Collection</title>
          ${printStyles}
        </head>
        <body>
          <div class="print-container">
            <div class="print-header">
                <h1>${userInfo.username}'s ${countryName || ''} Collection</h1>
                <div class="total-amount">
  ${collectionItems.length} ${collectionItems.length === 1 ? 'banknote' : 'banknotes'}
  </div>
                  
              </div>
              
              
              
              <div class="collection-list">
                ${rowsHtml}
              </div>
            </div>
        </body>
      </html>
    `;
    };

    const printCollection = async (collectionItems: CollectionItem[], userInfo: UserInfo, countryName?: string) => {
        setIsPrinting(true);
        try {
            const printContent = generatePrintContent(collectionItems, userInfo, countryName);
            
            const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
            if (printWindow) {
                printWindow.document.write(printContent);
                printWindow.document.close();
                
                // Focus the window and wait for content to load
                printWindow.focus();
                
                // Wait for images to load before printing
                setTimeout(() => {
                    printWindow.print();
                }, 1500);
            }
        } catch (error) {
            console.error('Print failed:', error);
        } finally {
            setIsPrinting(false);
        }
    };

    return { printCollection, isPrinting };
}; 