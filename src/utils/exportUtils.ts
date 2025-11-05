/**
 * Export Utilities
 * Functions for exporting generated content in various formats
 */

/**
 * Download a data URL as a file
 */
export const downloadDataUrl = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download text content as a file
 */
export const downloadTextFile = (content: string, filename: string, mimeType = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
};

/**
 * Download JSON data as a file
 */
export const downloadJSON = (data: any, filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  downloadTextFile(jsonString, filename, 'application/json');
};

/**
 * Export image in high resolution
 */
export const exportImage = async (imageUrl: string, filename: string, format: 'png' | 'jpg' = 'png'): Promise<void> => {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Create canvas for format conversion if needed
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // For JPG, add white background
    if (format === 'jpg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    // Convert to desired format
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpg' ? 0.95 : undefined;
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        downloadDataUrl(url, filename);
        URL.revokeObjectURL(url);
      }
    }, mimeType, quality);

    URL.revokeObjectURL(img.src);
  } catch (error) {
    // Fallback: direct download
    downloadDataUrl(imageUrl, filename);
  }
};

/**
 * Export audio file
 */
export const exportAudio = async (audioUrl: string, filename: string, format: 'mp3' | 'wav' = 'mp3'): Promise<void> => {
  try {
    // For now, directly download the audio
    // In production, you might want to convert formats using Web Audio API
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, filename);
    URL.revokeObjectURL(url);
  } catch (error) {
    // Fallback
    downloadDataUrl(audioUrl, filename);
  }
};

/**
 * Export casting report as formatted text
 */
export const exportCastingReport = (castingData: any, format: 'txt' | 'json' | 'pdf' = 'txt'): void => {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `casting-report-${timestamp}`;

  if (format === 'json') {
    downloadJSON(castingData, `${filename}.json`);
    return;
  }

  if (format === 'txt') {
    const report = formatCastingReportText(castingData);
    downloadTextFile(report, `${filename}.txt`);
    return;
  }

  if (format === 'pdf') {
    // For PDF, we'll generate HTML and use browser print
    const htmlContent = formatCastingReportHTML(castingData);
    openPrintDialog(htmlContent);
  }
};

/**
 * Format casting data as readable text
 */
const formatCastingReportText = (data: any): string => {
  let report = '='.repeat(60) + '\n';
  report += 'DREAMER V5 - CASTING REPORT\n';
  report += '='.repeat(60) + '\n\n';
  report += `Generated: ${new Date().toLocaleString()}\n\n`;

  if (data.prompt) {
    report += `Prompt:\n${data.prompt}\n\n`;
  }

  if (data.characters && Array.isArray(data.characters)) {
    report += 'CHARACTERS:\n';
    report += '-'.repeat(60) + '\n';
    data.characters.forEach((char: any, index: number) => {
      report += `\n${index + 1}. ${char.name || 'Character ' + (index + 1)}\n`;
      if (char.role) report += `   Role: ${char.role}\n`;
      if (char.description) report += `   Description: ${char.description}\n`;
      if (char.traits) report += `   Traits: ${char.traits.join(', ')}\n`;
      if (char.actor) report += `   Suggested Actor: ${char.actor}\n`;
    });
    report += '\n';
  }

  if (data.providerComparison) {
    report += '\nPROVIDER COMPARISON:\n';
    report += '-'.repeat(60) + '\n';
    report += `Provider A: ${data.providerComparison.providerA}\n`;
    report += `Provider B: ${data.providerComparison.providerB}\n`;
    if (data.providerComparison.similarity) {
      report += `Similarity Score: ${(data.providerComparison.similarity * 100).toFixed(1)}%\n`;
    }
  }

  return report;
};

/**
 * Format casting data as HTML for printing/PDF
 */
const formatCastingReportHTML = (data: any): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Casting Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      color: #6b21a8;
      border-bottom: 3px solid #a855f7;
      padding-bottom: 10px;
    }
    h2 {
      color: #7c3aed;
      margin-top: 30px;
    }
    .character {
      background: #f3f4f6;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #a855f7;
    }
    .character h3 {
      margin-top: 0;
      color: #6b21a8;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 20px;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>🎬 Dreamer V5 - Casting Report</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()}</div>
  
  ${data.prompt ? `<p><strong>Prompt:</strong> ${data.prompt}</p>` : ''}
  
  ${data.characters && Array.isArray(data.characters) ? `
    <h2>Characters</h2>
    ${data.characters.map((char: any, index: number) => `
      <div class="character">
        <h3>${char.name || 'Character ' + (index + 1)}</h3>
        ${char.role ? `<p><strong>Role:</strong> ${char.role}</p>` : ''}
        ${char.description ? `<p><strong>Description:</strong> ${char.description}</p>` : ''}
        ${char.traits ? `<p><strong>Traits:</strong> ${char.traits.join(', ')}</p>` : ''}
        ${char.actor ? `<p><strong>Suggested Actor:</strong> ${char.actor}</p>` : ''}
      </div>
    `).join('')}
  ` : ''}
  
  ${data.providerComparison ? `
    <h2>Provider Comparison</h2>
    <p><strong>Provider A:</strong> ${data.providerComparison.providerA}</p>
    <p><strong>Provider B:</strong> ${data.providerComparison.providerB}</p>
    ${data.providerComparison.similarity ? 
      `<p><strong>Similarity Score:</strong> ${(data.providerComparison.similarity * 100).toFixed(1)}%</p>` 
      : ''}
  ` : ''}
</body>
</html>
  `;
};

/**
 * Open print dialog with HTML content
 */
const openPrintDialog = (htmlContent: string): void => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

/**
 * Batch export multiple items
 */
export const batchExport = async (
  items: Array<{
    type: 'image' | 'audio' | 'casting';
    url?: string;
    data?: any;
    filename: string;
  }>
): Promise<void> => {
  for (const item of items) {
    try {
      if (item.type === 'image' && item.url) {
        await exportImage(item.url, item.filename);
      } else if (item.type === 'audio' && item.url) {
        await exportAudio(item.url, item.filename);
      } else if (item.type === 'casting' && item.data) {
        exportCastingReport(item.data, 'txt');
      }
      // Add small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
    }
  }
};
