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
 * Batch export multiple visual items
 */
export const batchExport = async (
  items: Array<{
    type: 'image';
    url?: string;
    filename: string;
  }>
): Promise<void> => {
  for (const item of items) {
    try {
      if (item.type === 'image' && item.url) {
        await exportImage(item.url, item.filename);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      // ignore failed export and continue with remaining items
    }
  }
};
