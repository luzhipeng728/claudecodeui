import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Folder, FolderOpen, File, FileText, FileCode, List, TableProperties, Eye, Upload, Trash2, Edit, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import CodeEditor from './CodeEditor';
import ImageViewer from './ImageViewer';
import { api } from '../utils/api';
import { Input } from './ui/input';

function FileTree({ selectedProject }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewMode, setViewMode] = useState('detailed'); // 'simple', 'detailed', 'compact'
  const [renamingFile, setRenamingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    if (selectedProject) {
      fetchFiles();
    }
  }, [selectedProject]);

  // Load view mode preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('file-tree-view-mode');
    if (savedViewMode && ['simple', 'detailed', 'compact'].includes(savedViewMode)) {
      setViewMode(savedViewMode);
    }
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await api.getFiles(selectedProject.name);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ File fetch failed:', response.status, errorText);
        setFiles([]);
        return;
      }
      
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('❌ Error fetching files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    
    // Add files without folder structure
    Array.from(files).forEach((file) => {
      formData.append('files', file);
      formData.append('paths', file.name);
    });

    try {
      const token = localStorage.getItem('auth-token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/projects/${selectedProject.name}/upload-folder`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (response.ok) {
        console.log('✅ Files uploaded successfully');
        await fetchFiles();
      } else {
        const error = await response.text();
        console.error('❌ Upload failed:', error);
        alert('Upload failed: ' + error);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert('Upload error: ' + error.message);
    }

    event.target.value = '';
  };

  const handleFolderUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Create FormData and organize files by folder structure
    const formData = new FormData();
    
    // Get all file paths
    const fileList = Array.from(files);
    fileList.forEach((file) => {
      // Get relative path from webkitRelativePath
      const relativePath = file.webkitRelativePath || file.name;
      formData.append('files', file);
      formData.append('paths', relativePath);
    });

    try {
      const token = localStorage.getItem('auth-token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/projects/${selectedProject.name}/upload-folder`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (response.ok) {
        console.log('✅ Folder uploaded successfully');
        // Refresh file tree
        await fetchFiles();
      } else {
        const error = await response.text();
        console.error('❌ Upload failed:', error);
        alert('Upload failed: ' + error);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert('Upload error: ' + error.message);
    }

    // Reset input
    event.target.value = '';
  };

  const toggleDirectory = (path) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/delete`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: item.path })
      });

      if (response.ok) {
        console.log('✅ Deleted successfully');
        await fetchFiles();
      } else {
        const error = await response.text();
        alert('Delete failed: ' + error);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('Delete error: ' + error.message);
    }
  };

  const handleRename = async (item) => {
    if (!newFileName || newFileName === item.name) {
      setRenamingFile(null);
      return;
    }

    try {
      const token = localStorage.getItem('auth-token');
      const newPath = item.path.replace(/[^/]+$/, newFileName);
      
      const response = await fetch(`/api/projects/${selectedProject.name}/rename`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPath: item.path, newPath: newPath })
      });

      if (response.ok) {
        console.log('✅ Renamed successfully');
        setRenamingFile(null);
        await fetchFiles();
      } else {
        const error = await response.text();
        alert('Rename failed: ' + error);
      }
    } catch (error) {
      console.error('❌ Rename error:', error);
      alert('Rename error: ' + error.message);
    }
  };

  const startRename = (item) => {
    setRenamingFile(item.path);
    setNewFileName(item.name);
  };

  const handleCreateNewFile = async () => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/projects/${selectedProject.name}/file`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath: fileName, content: '' })
      });

      if (response.ok) {
        console.log('✅ File created successfully');
        await fetchFiles();
        
        // Open the new file in editor
        setSelectedFile({
          name: fileName,
          path: fileName,
          projectPath: selectedProject.path,
          projectName: selectedProject.name
        });
      } else {
        const error = await response.text();
        alert('Create failed: ' + error);
      }
    } catch (error) {
      console.error('❌ Create error:', error);
      alert('Create error: ' + error.message);
    }
  };

  // Change view mode and save preference
  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('file-tree-view-mode', mode);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date as relative time
  const formatRelativeTime = (date) => {
    if (!date) return '-';
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return past.toLocaleDateString();
  };

  const renderFileTree = (items, level = 0) => {
    return items.map((item) => (
      <div key={item.path} className="select-none group">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-start p-2 h-auto font-normal text-left hover:bg-accent",
            )}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={() => {
              if (item.type === 'directory') {
                toggleDirectory(item.path);
              } else if (isImageFile(item.name)) {
                // Open image in viewer
                setSelectedImage({
                  name: item.name,
                  path: item.path,
                  projectPath: selectedProject.path,
                  projectName: selectedProject.name
                });
              } else {
                // Open file in editor
                setSelectedFile({
                  name: item.name,
                  path: item.path,
                  projectPath: selectedProject.path,
                  projectName: selectedProject.name
                });
              }
            }}
          >
            <div className="flex items-center gap-2 min-w-0 w-full">
              {item.type === 'directory' ? (
                expandedDirs.has(item.path) ? (
                  <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )
              ) : (
                getFileIcon(item.name)
              )}
              {renamingFile === item.path ? (
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRename(item);
                    } else if (e.key === 'Escape') {
                      setRenamingFile(null);
                    }
                  }}
                  onBlur={() => handleRename(item)}
                  className="h-6 text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm truncate text-foreground">
                  {item.name}
                </span>
              )}
            </div>
          </Button>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => startRename(item)}
              title="Rename"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleDelete(item)}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {item.type === 'directory' && 
         expandedDirs.has(item.path) && 
         item.children && 
         item.children.length > 0 && (
          <div>
            {renderFileTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const isImageFile = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'];
    return imageExtensions.includes(ext);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'];
    const docExtensions = ['md', 'txt', 'doc', 'pdf'];
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'];
    
    if (codeExtensions.includes(ext)) {
      return <FileCode className="w-4 h-4 text-green-500 flex-shrink-0" />;
    } else if (docExtensions.includes(ext)) {
      return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    } else if (imageExtensions.includes(ext)) {
      return <File className="w-4 h-4 text-purple-500 flex-shrink-0" />;
    } else {
      return <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
  };

  // Render detailed view with table-like layout
  const renderDetailedView = (items, level = 0) => {
    return items.map((item) => (
      <div key={item.path} className="select-none">
        <div
          className={cn(
            "grid grid-cols-12 gap-2 p-2 hover:bg-accent cursor-pointer items-center",
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            if (item.type === 'directory') {
              toggleDirectory(item.path);
            } else if (isImageFile(item.name)) {
              setSelectedImage({
                name: item.name,
                path: item.path,
                projectPath: selectedProject.path,
                projectName: selectedProject.name
              });
            } else {
              setSelectedFile({
                name: item.name,
                path: item.path,
                projectPath: selectedProject.path,
                projectName: selectedProject.name
              });
            }
          }}
        >
          <div className="col-span-5 flex items-center gap-2 min-w-0">
            {item.type === 'directory' ? (
              expandedDirs.has(item.path) ? (
                <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )
            ) : (
              getFileIcon(item.name)
            )}
            <span className="text-sm truncate text-foreground">
              {item.name}
            </span>
          </div>
          <div className="col-span-2 text-sm text-muted-foreground">
            {item.type === 'file' ? formatFileSize(item.size) : '-'}
          </div>
          <div className="col-span-3 text-sm text-muted-foreground">
            {formatRelativeTime(item.modified)}
          </div>
          <div className="col-span-2 text-sm text-muted-foreground font-mono">
            {item.permissionsRwx || '-'}
          </div>
        </div>
        
        {item.type === 'directory' && 
         expandedDirs.has(item.path) && 
         item.children && 
         renderDetailedView(item.children, level + 1)}
      </div>
    ));
  };

  // Render compact view with inline details
  const renderCompactView = (items, level = 0) => {
    return items.map((item) => (
      <div key={item.path} className="select-none">
        <div
          className={cn(
            "flex items-center justify-between p-2 hover:bg-accent cursor-pointer",
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            if (item.type === 'directory') {
              toggleDirectory(item.path);
            } else if (isImageFile(item.name)) {
              setSelectedImage({
                name: item.name,
                path: item.path,
                projectPath: selectedProject.path,
                projectName: selectedProject.name
              });
            } else {
              setSelectedFile({
                name: item.name,
                path: item.path,
                projectPath: selectedProject.path,
                projectName: selectedProject.name
              });
            }
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {item.type === 'directory' ? (
              expandedDirs.has(item.path) ? (
                <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )
            ) : (
              getFileIcon(item.name)
            )}
            <span className="text-sm truncate text-foreground">
              {item.name}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.type === 'file' && (
              <>
                <span>{formatFileSize(item.size)}</span>
                <span className="font-mono">{item.permissionsRwx}</span>
              </>
            )}
          </div>
        </div>
        
        {item.type === 'directory' && 
         expandedDirs.has(item.path) && 
         item.children && 
         renderCompactView(item.children, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          Loading files...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* View Mode Toggle */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Files</h3>
        <div className="flex gap-1">
          {/* New File Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleCreateNewFile()}
            title="New file"
          >
            <Plus className="w-4 h-4" />
          </Button>
          
          {/* Upload File Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => document.getElementById('file-upload-input').click()}
            title="Upload files"
          >
            <File className="w-4 h-4" />
          </Button>
          <input
            id="file-upload-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          
          {/* Upload Folder Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 mr-2"
            onClick={() => document.getElementById('folder-upload-input').click()}
            title="Upload folder"
          >
            <Folder className="w-4 h-4" />
          </Button>
          <input
            id="folder-upload-input"
            type="file"
            multiple
            webkitdirectory=""
            directory=""
            className="hidden"
            onChange={handleFolderUpload}
          />
          <Button
            variant={viewMode === 'simple' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => changeViewMode('simple')}
            title="Simple view"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'compact' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => changeViewMode('compact')}
            title="Compact view"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'detailed' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => changeViewMode('detailed')}
            title="Detailed view"
          >
            <TableProperties className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Column Headers for Detailed View */}
      {viewMode === 'detailed' && files.length > 0 && (
        <div className="px-4 pt-2 pb-1 border-b border-border">
          <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3">Modified</div>
            <div className="col-span-2">Permissions</div>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1 p-4">
        {files.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
              <Folder className="w-6 h-6 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-foreground mb-1">No files found</h4>
            <p className="text-sm text-muted-foreground">
              Check if the project path is accessible
            </p>
          </div>
        ) : (
          <div className={viewMode === 'detailed' ? '' : 'space-y-1'}>
            {viewMode === 'simple' && renderFileTree(files)}
            {viewMode === 'compact' && renderCompactView(files)}
            {viewMode === 'detailed' && renderDetailedView(files)}
          </div>
        )}
      </ScrollArea>
      
      {/* Code Editor Modal */}
      {selectedFile && (
        <CodeEditor
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          projectPath={selectedFile.projectPath}
        />
      )}
      
      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          file={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}

export default FileTree;