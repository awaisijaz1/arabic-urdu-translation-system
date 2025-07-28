import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Link, Globe } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FileUpload = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [isUrlUploading, setIsUrlUploading] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  }, []);

  const handleFiles = useCallback((files) => {
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/json' || 
                         file.name.endsWith('.srt') ||
                         file.name.endsWith('.json');
      
      if (!isValidType) {
        toast.error(`${file.name} is not a supported file type. Please upload .srt or .json files.`);
        return false;
      }
      
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      if (!isValidSize) {
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const removeFile = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload files one by one
      const uploadPromises = uploadedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        return response.data;
      });

      const results = await Promise.all(uploadPromises);
      
      toast.success(`Successfully uploaded ${uploadedFiles.length} file(s)`);
      setUploadedFiles([]);
      
      // You can add navigation to translation jobs or evaluation here
      console.log('Upload results:', results);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName) => {
    if (fileName.endsWith('.srt')) {
      return <File className="h-5 w-5 text-blue-500" />;
    }
    return <File className="h-5 w-5 text-green-500" />;
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateFileUrl = (url) => {
    if (!validateUrl(url)) {
      toast.error('Please enter a valid URL');
      return false;
    }
    
    const fileName = url.split('/').pop().split('?')[0];
    const isValidType = fileName.endsWith('.srt') || fileName.endsWith('.json');
    
    if (!isValidType) {
      toast.error('URL must point to a .srt or .json file');
      return false;
    }
    
    return true;
  };

  const uploadFromUrl = async () => {
    if (!fileUrl.trim()) {
      toast.error('Please enter a file URL');
      return;
    }

    if (!validateFileUrl(fileUrl)) {
      return;
    }

    setIsUrlUploading(true);
    
    try {
      const response = await axios.post('/upload/url', {
        file_url: fileUrl
      });
      
      toast.success('File uploaded successfully from URL!');
      setFileUrl('');
      
      // Add the uploaded file to the list if needed
      console.log('URL upload result:', response.data);
      
    } catch (error) {
      console.error('URL upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload file from URL. Please try again.');
    } finally {
      setIsUrlUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">File Upload</h1>
        <p className="text-gray-600">Upload SRT or JSON files for translation evaluation</p>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        {/* Upload Methods Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <div className="flex items-center space-x-2 py-2 px-1 border-b-2 border-blue-500">
                <Upload className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-600">Upload Files</span>
              </div>
              <div className="flex items-center space-x-2 py-2 px-1 border-b-2 border-transparent">
                <Link className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">Upload from URL</span>
              </div>
            </nav>
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supports .srt and .json files up to 10MB each
          </p>
          <input
            type="file"
            multiple
            accept=".srt,.json,application/json"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
          >
            Choose Files
          </label>
        </div>

        {/* URL Upload Section */}
        <div className="mt-6 p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Upload from URL</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Enter a direct link to a .srt or .json file hosted online
          </p>
          <div className="flex space-x-3">
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://example.com/file.srt"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={uploadFromUrl}
              disabled={isUrlUploading || !fileUrl.trim()}
              className="inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUrlUploading ? (
                <>
                  <div className="spinner mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Upload from URL
                </>
              )}
            </button>
          </div>
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Files</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={uploadFiles}
                disabled={isUploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">File Format Requirements:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>SRT files:</strong> Subtitle files with Arabic text and timestamps</li>
            <li>• <strong>JSON files:</strong> Structured data with Arabic and Urdu text pairs</li>
            <li>• <strong>Maximum file size:</strong> 10MB per file</li>
            <li>• <strong>Supported formats:</strong> .srt, .json</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 