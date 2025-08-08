import { useState } from 'react';
import { CollectionItem } from '@/types';

interface UserInfo {
    username: string;
    rank?: string;
    role?: string;
}

export const usePrintCollection = () => {
    const [isPrinting, setIsPrinting] = useState(false);

    const generatePrintContent = async (collectionItems: CollectionItem[], userInfo: UserInfo, countryName?: string, activeTab?: string) => {
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
          font-family: 'Arial', sans-serif;
          font-size: 9pt;
          line-height: 1.2;
          color: black;
          background: white;
          margin: 0;
          padding: 0.7cm;
          min-height: 100vh;
          width: 100%;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        
        .print-container {
          max-width: 190mm;
          margin: 0 auto;
          padding: 0;
          min-height: 100vh;
          width: 100%;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 0.8cm;
          border-bottom: 2px solid #333;
          padding-bottom: 0.3cm;
        }
        
        .print-header h1 {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 0.2cm;
          color: #333;
        }
        
        .total-amount {
          font-size: 12pt;
          font-weight: bold;
          color: #333;
          margin-bottom: 0.3cm;
          text-align: center;
        }
        
        .sultan-group {
          margin-bottom: 0.5cm;
          page-break-inside: avoid;
        }
        
        .sultan-header {
          font-size: 11pt;
          font-weight: bold;
          color: #333;
          margin-bottom: 0.3cm;
          padding: 0.2cm;
          background: #f0f0f0;
          border-left: 3px solid #333;
        }
        
        .banknote-row {
          display: flex;
          flex-direction: column;
          gap: 0.3cm;
          margin-bottom: 0.5cm;
          page-break-inside: avoid;
          border: 1px solid #ddd;
          padding: 0.3cm;
          background: white;
          min-height: 4cm;
        }
        
        .fields-row {
          display: flex;
          gap: 0.2cm;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .field-value {
          padding: 0;
          border: 1px solid #ddd;
          border-radius: 3px;
          background: white;
          min-width: 0.8cm;
          text-align: center;
          font-size: 8pt;
          display: table-cell;
          vertical-align: middle;
          height: 0.6cm;
          line-height: 1;
          margin: 0;
        }
        
        .field-value.rarity {
          background: #ffebee;
          color: #c62828;
          border-color: #ef9a9a;
          font-weight: bold;
        }
        
        .images-notes-container {
          display: flex;
          gap: 0.3cm;
          align-items: flex-start;
        }
        
        .main-images-column {
          display: flex;
          flex-direction: column;
          gap: 0.2cm;
          flex-shrink: 0;
        }
        
        .other-images-notes-column {
          display: flex;
          flex-direction: column;
          gap: 0.1cm;
          flex: 1;
        }
        
        .other-images-row {
          display: flex;
          gap: 0.2cm;
          align-items: flex-start;
          flex-wrap: wrap;
          max-height: 4cm;
          overflow: hidden;
          width: 100%;
        }
        
        /* CSS Grid only for horizontal layout */
        .images-notes-container .other-images-notes-column .other-images-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.2cm;
        }
        
        .other-images-row .image-container {
          height: 2cm;
          width: 100%;
        }
        
        .other-images-row .image-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .other-images-row .image-container .image-label {
          width: 100% !important;
        }
        
        .images-row {
          display: flex;
          gap: 0.2cm;
          align-items: flex-start;
          flex-wrap: wrap;
          max-height: 4cm;
          overflow: hidden;
        }
        
        .image-container {
          border: 1px solid #ccc;
          border-radius: 3px;
          overflow: hidden;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .image-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .image-container.placeholder {
          background: #f0f0f0;
          color: #999;
          font-size: 6pt;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .image-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.7);
          color: white;
          font-size: 5pt;
          padding: 0;
          text-align: center;
          display: table-cell;
          vertical-align: middle;
          height: 0.5cm;
          line-height: 1;
        }
        
        .notes-row {
          display: flex;
          flex-direction: column;
          gap: 0.05cm;
          font-size: 7pt;
          color: #666;
          margin-top: auto;
        }
        
        .note-field {
          display: flex;
          gap: 0.1cm;
          align-items: center;
        }
        
        .note-label {
          font-weight: bold;
          min-width: 1.5cm;
        }
        
        .note-value {
          flex: 1;
          border-bottom: 1px solid #ccc;
          min-height: 0.3cm;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .no-print {
          display: none !important;
        }
        
        .banknote-row:nth-child(8n) {
          page-break-after: always;
        }
        
        @page {
          size: A4;
          margin: 0;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      </style>
    `;

        const getImageUrl = (item: CollectionItem, imageType: 'front' | 'back' | 'watermark' | 'tugra') => {
            switch (imageType) {
                case 'front':
                    return item.obverseImage || (item.banknote.imageUrls && item.banknote.imageUrls[0]) || null;
                case 'back':
                    return item.reverseImage || (item.banknote.imageUrls && item.banknote.imageUrls[1]) || null;
                case 'watermark':
                    return item.banknote.watermarkUrl || null;
                case 'tugra':
                    return item.banknote.tughraUrl || null;
                default:
                    return null;
            }
        };

        const getSignatureImages = (item: CollectionItem) => {
            const frontSignatures = item.banknote.signaturesFrontUrls || [];
            const backSignatures = item.banknote.signaturesBackUrls || [];
            return [...frontSignatures, ...backSignatures].slice(0, 2); // Limit to 2 signature images
        };

        const areImagesHorizontal = async (item: CollectionItem) => {
            const frontImage = getImageUrl(item, 'front');
            const backImage = getImageUrl(item, 'back');
            
            if (!frontImage || !backImage) {
                return false;
            }
            
            // Check image dimensions to determine orientation
            const checkImageOrientation = (imageUrl: string): Promise<boolean> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        // If width > height, it's horizontal
                        resolve(img.width > img.height);
                    };
                    img.onerror = () => {
                        // Default to vertical if image fails to load
                        resolve(false);
                    };
                    img.src = imageUrl;
                });
            };
            
            try {
                const frontIsHorizontal = await checkImageOrientation(frontImage);
                const backIsHorizontal = await checkImageOrientation(backImage);
                
                // If both images are horizontal, use horizontal layout
                return frontIsHorizontal && backIsHorizontal;
            } catch (error) {
                // Default to vertical layout if there's an error
                return false;
            }
        };

        const generateBanknoteRow = async (item: CollectionItem) => {
            const frontImage = getImageUrl(item, 'front');
            const backImage = getImageUrl(item, 'back');
            const watermarkImage = getImageUrl(item, 'watermark');
            const tugraImage = getImageUrl(item, 'tugra');
            const signatureImages = getSignatureImages(item);

            // Generate fields row - only show fields that have values (no labels)
            const fields = [];
            
            if (item.banknote.extendedPickNumber) {
                fields.push(`<span class="field-value">${item.banknote.extendedPickNumber}</span>`);
            }
            
            if (item.banknote.turkCatalogNumber) {
                fields.push(`<span class="field-value">${item.banknote.turkCatalogNumber}</span>`);
            }
            
            if (item.banknote.rarity) {
                fields.push(`<span class="field-value rarity">${item.banknote.rarity}</span>`);
            }
            
            if (item.banknote.denomination) {
                fields.push(`<span class="field-value">${item.banknote.denomination}</span>`);
            }
            
            if (item.condition || item.grade) {
                const conditionText = item.condition && !item.grade ? item.condition : '';
                const gradeText = item.grade ? `${item.grade_by ? `${item.grade_by} ` : ''}${item.grade}` : '';
                fields.push(`<span class="field-value">${conditionText} ${gradeText}</span>`);
            }
            
            if (item.prefix) {
                fields.push(`<span class="field-value">${item.prefix}</span>`);
            }
            
            if (item.banknote.islamicYear) {
                fields.push(`<span class="field-value">${item.banknote.islamicYear}</span>`);
            }
            
            if (item.banknote.gregorianYear || item.banknote.year) {
                fields.push(`<span class="field-value">${item.banknote.gregorianYear || item.banknote.year}</span>`);
            }
            
            if (item.banknote.sultanName) {
                fields.push(`<span class="field-value">${item.banknote.sultanName}</span>`);
            }

            // Generate other images (signatures, watermark, tugra)
            const otherImages = [];
            
            // Calculate total number of other images for dynamic sizing
            const totalOtherImages = signatureImages.length + (watermarkImage ? 1 : 0) + (tugraImage ? 1 : 0);
            
            // Calculate grid layout based on number of images - maintain reliable sizing
            let imageHeight = '2cm';
            let imageWidth = 'auto';
            let minWidth = '1.8cm';
            
            if (totalOtherImages >= 4) {
                // For 4+ images, reduce height to fit more content when breaking to new row
                imageHeight = '1.5cm';
                minWidth = '1.5cm';
            }
            
            signatureImages.forEach((sig, index) => {
                otherImages.push(`
                  <div class="image-container" style="height: ${imageHeight};">
                    <img src="${sig}" alt="Signature ${index + 1}" />
                    <div class="image-label">Signature ${index === 0 ? 'front' : 'back'}</div>
                  </div>
                `);
            });
            
            if (watermarkImage) {
                otherImages.push(`
                  <div class="image-container" style="height: ${imageHeight};">
                    <img src="${watermarkImage}" alt="Watermark" />
                    <div class="image-label">Watermark picture</div>
                  </div>
                `);
            }
            
            if (tugraImage) {
                otherImages.push(`
                  <div class="image-container" style="height: ${imageHeight};">
                    <img src="${tugraImage}" alt="Tugra" />
                    <div class="image-label">Togra picture</div>
                  </div>
                `);
            }

            // Generate notes
            const notes = [];
            
            if (item.publicNote) {
                notes.push(`
                  <div class="note-field">
                    <span class="note-label">Public note:</span>
                    <span >${item.publicNote}</span>
                  </div>
                `);
            }
            
            if (item.banknote.securityElement) {
                notes.push(`
                  <div class="note-field">
                    <span >${item.banknote.securityElement}</span>
                  </div>
                `);
            }

            const isHorizontal = await areImagesHorizontal(item);

            if (isHorizontal && frontImage && backImage) {
                // Horizontal layout: main images on left, other images and notes on right
                return `
          <div class="banknote-row">
            ${fields.length > 0 ? `<div class="fields-row">${fields.join('')}</div>` : ''}
            <div class="images-notes-container">
              <div class="main-images-column" style="width: 50%; flex-shrink: 0;">
                <div style="display: flex; gap: 0.2cm;">
                  <div class="image-container" style="height: 3cm; width: auto; min-width: 2.5cm; flex: 1;">
                    <img src="${frontImage}" alt="Front" />
                    <div class="image-label">Front picture</div>
                  </div>
                  <div class="image-container" style="height: 3cm; width: auto; min-width: 2.5cm; flex: 1;">
                    <img src="${backImage}" alt="Back" />
                    <div class="image-label">Back picture</div>
                  </div>
                </div>
                ${notes.length > 0 ? `<div class="notes-row">${notes.join('')}</div>` : ''}
              </div>
              <div class="other-images-notes-column" style="width: 50%;">
                ${otherImages.length > 0 ? `<div class="other-images-row">${otherImages.join('')}</div>` : ''}
              </div>
            </div>
          </div>
        `;
            } else {
                // Vertical layout: all images in one row, notes below
                const allImages = [];
                
                if (frontImage) {
                    allImages.push(`
                      <div class="image-container" style="height: 4cm; width: auto; background: transparent;">
                        <img src="${frontImage}" alt="Front" />
                        <div class="image-label">Front picture</div>
                      </div>
                    `);
                }
                
                if (backImage) {
                    allImages.push(`
                      <div class="image-container" style="height: 4cm; width: auto; background: transparent;">
                        <img src="${backImage}" alt="Back" />
                        <div class="image-label">Back picture</div>
                      </div>
                    `);
                }
                
                // Add other images
                allImages.push(...otherImages);
                
                return `
          <div class="banknote-row">
            ${fields.length > 0 ? `<div class="fields-row">${fields.join('')}</div>` : ''}
            <div class="images-notes-container">
              <div style="display: flex; gap: 0.3cm; align-items: flex-start;">
                <div class="images-row" style="flex: 1;">
                  ${allImages.join('')}
                </div>
                ${notes.length > 0 ? `<div class="notes-row" style="width: 30%;">${notes.join('')}</div>` : ''}
              </div>
            </div>
          </div>
        `;
            }
        };
        
        // Group items by sultan if sorting by sultan
        const isSortedBySultan = activeTab === 'collection' && collectionItems.some(item => 
            item.banknote?.sultanName && item.banknote.sultanName !== ''
        );
        
        let banknotesHtml = '';
        
        if (isSortedBySultan) {
            // Group by sultan
            const sultanGroups = new Map<string, CollectionItem[]>();
            
            collectionItems.forEach(item => {
                const sultan = item.banknote?.sultanName || 'Unknown';
                if (!sultanGroups.has(sultan)) {
                    sultanGroups.set(sultan, []);
                }
                sultanGroups.get(sultan)!.push(item);
            });
            
            // Generate HTML with sultan headers
            for (const [sultan, items] of sultanGroups) {
                const sultanBanknotes = await Promise.all(items.map(item => generateBanknoteRow(item)));
                banknotesHtml += `
                  <div class="sultan-group">
                    <div class="sultan-header">${sultan}</div>
                    ${sultanBanknotes.join('')}
                  </div>
                `;
            }
        } else {
            // No sultan grouping, just list all items
            const banknoteRows = await Promise.all(collectionItems.map(item => generateBanknoteRow(item)));
            banknotesHtml = banknoteRows.join('');
        }
        
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
              ${banknotesHtml}
            </div>
          </div>
        </body>
      </html>
    `;
    };
    
    const printCollection = async (collectionItems: CollectionItem[], userInfo: UserInfo, countryName?: string, activeTab?: string) => {
        setIsPrinting(true);
        try {
            const html = await generatePrintContent(collectionItems, userInfo, countryName, activeTab);
            
            // Use html2pdf directly from HTML string to ensure our custom print layout is preserved
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf: any = (html2pdfModule as any).default || (html2pdfModule as any);
            
            const filenameBase = `${userInfo.username}${countryName ? `-${countryName}` : ''}-collection`.replace(/\s+/g, '-');
            
            await html2pdf()
              .set({
                margin: [0, 0, 0, 0],
                filename: `${filenameBase}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] },
              })
              .from(html)
              .save();
        } catch (error) {
            console.error('PDF generation failed:', error);
        } finally {
            setIsPrinting(false);
        }
    };
    
    return { printCollection, isPrinting };
};