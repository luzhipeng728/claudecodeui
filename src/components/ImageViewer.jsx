import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Download, ExternalLink } from 'lucide-react';

function ImageViewer({ file, onClose }) {
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Use projectName if available, otherwise extract from projectPath
  const projectName = file.projectName || (file.projectPath ? file.projectPath.split('/').pop() : '');
  const imagePath = projectName ? `/api/projects/${encodeURIComponent(projectName)}/files/content?path=${encodeURIComponent(file.path)}` : '';

  useEffect(() => {
    const loadImage = async () => {
      if (!imagePath) {
        setImageError(true);
        setLoading(false);
        return;
      }
      
      try {
        const token = localStorage.getItem('auth-token');
        const response = await fetch(imagePath, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to load image');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setImageUrl(url);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load image:', error);
        setImageError(true);
        setLoading(false);
      }
    };
    
    loadImage();
    
    // Cleanup
    return () => {
      if (imageUrl) {
        window.URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imagePath]);

  const handleDownload = async () => {
    try {
      // Fetch the image with authentication
      const token = localStorage.getItem('auth-token');
      const response = await fetch(imagePath, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download');
      
      // Convert to blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download the file');
    }
  };

  const handleOpenInNewTab = () => {
    // Use the blob URL we already created
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {file.name}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInNewTab}
              className="h-8 w-8 p-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 flex justify-center items-center bg-gray-50 dark:bg-gray-900 min-h-[400px]">
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
              <p>Loading image...</p>
            </div>
          ) : imageError ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>Unable to load image</p>
              <p className="text-sm mt-2">{file.path}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="mt-4"
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={file.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
            />
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {file.path}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ImageViewer;