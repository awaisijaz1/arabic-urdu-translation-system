import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FileText, 
  Download, 
  Eye, 
  Filter,
  Search,
  Table,
  BarChart3,
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  Calendar,
  User,
  TrendingUp,
  Database,
  Globe,
  Settings,
  ChevronRight,
  Play,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';
import { 
  getFileClassification, 
  getFileStatusText, 
  getFileStatusColor, 
  getFileStatusIcon,
  filterFilesByClassification 
} from '../utils/fileClassification';

// Icon mapping object
const iconMap = {
  'Globe': Globe,
  'CheckCircle': CheckCircle,
  'FileText': FileText
};

const GroundTruth = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // table, chart
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [selectedFileForTranslation, setSelectedFileForTranslation] = useState(null);
  const queryClient = useQueryClient();

  const { data: groundTruthData, refetch: refetchGroundTruth } = useQuery('groundTruth', () => 
    axios.get('/ground-truth').then(res => res.data)
  );

  const { data: files } = useQuery('files', () => 
    axios.get('/files').then(res => res.data)
  );

  // Get all file contents for classification
  const { data: allFileContents } = useQuery(
    'allFileContents',
    async () => {
      if (!files) return [];
      const contents = await Promise.all(
        files.map(file => 
          axios.get(`/files/${file.file_id}/content`)
            .then(res => ({ file_id: file.file_id, ...res.data }))
            .catch(() => ({ file_id: file.file_id, segments: [] }))
        )
      );
      return contents;
    },
    { enabled: !!files && files.length > 0 }
  );

  // Start translation mutation
  const startTranslationMutation = useMutation(
    (data) => axios.post('/translate/llm', data),
    {
      onSuccess: (response) => {
        const jobId = response.data.job_id;
        toast.success('Translation job started! You can monitor progress in the Translation Jobs tab.');
        setShowTranslationModal(false);
        setSelectedFileForTranslation(null);
        
        // Option to navigate to translation page
        if (window.confirm('Translation job started! Would you like to go to the Translation Jobs page to monitor progress?')) {
          window.location.hash = '#translation';
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to start translation');
      }
    }
  );

  // Get unique files from ground truth data
  const uniqueFiles = groundTruthData ? 
    [...new Set(groundTruthData.map(gt => gt.file_id))] : [];

  // Filter data based on selected file and search
  const filteredData = groundTruthData?.filter(gt => {
    if (selectedFile && gt.file_id !== selectedFile) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return gt.segments.some(segment => 
        segment.original_text.toLowerCase().includes(searchLower) ||
        segment.translated_text.toLowerCase().includes(searchLower) ||
        segment.approved_translation.toLowerCase().includes(searchLower) ||
        segment.notes?.toLowerCase().includes(searchLower)
      );
    }
    if (statusFilter !== 'all') {
      return gt.segments.some(segment => segment.status === statusFilter);
    }
    return true;
  }) || [];

  // Flatten segments for table view
  const flattenedSegments = filteredData.flatMap(gt => 
    gt.segments.map(segment => ({
      ...segment,
      file_id: gt.file_id,
      evaluation_id: gt.evaluation_id,
      created_at: gt.created_at
    }))
  );

  const startTranslationFromEvaluation = (fileId) => {
    const file = files?.find(f => f.file_id === fileId);
    const fileContent = allFileContents?.find(fc => fc.file_id === fileId);
    
    if (!file || !fileContent) {
      toast.error('File not found');
      return;
    }
    
    const classification = getFileClassification(fileContent);
    
    if (classification !== 'arabic_only') {
      toast.error('This file already has translations and is ready for evaluation');
      return;
    }
    
    setSelectedFileForTranslation({ file, content: fileContent });
    setShowTranslationModal(true);
  };

  const proceedWithTranslation = () => {
    if (!selectedFileForTranslation) return;
    
    const segments = selectedFileForTranslation.content.segments.map((segment, index) => ({
      segment_id: segment.segment_id || segment.id || `segment_${index + 1}`,
      start_time: segment.start_time,
      end_time: segment.end_time,
      original_text: segment.original_text
    }));

    startTranslationMutation.mutate({
      file_id: selectedFileForTranslation.file.file_id,
      segments: segments
    });
  };

  const downloadFile = async (format) => {
    try {
      const params = new URLSearchParams();
      if (selectedFile) params.append('file_ids', selectedFile);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await axios.get(`http://localhost:8004/export/${format}?${params.toString()}`);
      
      if (response.data.download_url) {
        // Download the file
        const downloadResponse = await axios.get(
          `http://localhost:8004/export/${response.data.export_id}/download`,
          { responseType: 'blob' }
        );
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ground_truth_export.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast.success(`File downloaded successfully!`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'edited':
        return <Edit3 className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'edited':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Calculate statistics
  const stats = {
    total: flattenedSegments.length,
    approved: flattenedSegments.filter(s => s.status === 'approved').length,
    rejected: flattenedSegments.filter(s => s.status === 'rejected').length,
    edited: flattenedSegments.filter(s => s.status === 'edited').length,
    pending: flattenedSegments.filter(s => s.status === 'pending').length
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Ground Truth Data</h1>
              <p className="text-blue-100 mt-1">Manage and export approved translation evaluations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-700 rounded-lg p-3">
                <Database className="h-8 w-8 text-blue-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3">
                <Table className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Segments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3">
                <Edit3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Edited</p>
                <p className="text-2xl font-bold text-gray-900">{stats.edited}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-red-100 rounded-lg p-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-yellow-100 rounded-lg p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select File
              </label>
              <select
                value={selectedFile || ''}
                onChange={(e) => setSelectedFile(e.target.value || null)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Files</option>
                {uniqueFiles.map(fileId => {
                  const file = files?.find(f => f.file_id === fileId);
                  return (
                    <option key={fileId} value={fileId}>
                      {file?.filename || fileId}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="edited">Edited</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search text..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* View Mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                View Mode
              </label>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Table className="h-4 w-4 inline mr-2" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    viewMode === 'chart'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 inline mr-2" />
                  Chart
                </button>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadFile('json')}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </button>
            <button
              onClick={() => downloadFile('csv')}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => downloadFile('excel')}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Files Overview with Classification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Files Overview</h3>
              <p className="text-sm text-gray-600 mt-1">All uploaded files with their translation status</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files?.map(file => {
              const fileContent = allFileContents?.find(fc => fc.file_id === file.file_id);
              const classification = fileContent ? getFileClassification(fileContent) : 'unknown';
              const statusText = getFileStatusText(classification);
              const statusColor = getFileStatusColor(classification);
              const StatusIcon = iconMap[getFileStatusIcon(classification)];
              const isInGroundTruth = groundTruthData?.some(gt => gt.file_id === file.file_id);
              
              return (
                <div key={file.file_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 truncate">{file.filename}</h4>
                      <p className="text-sm text-gray-600">{file.segments_count} segments</p>
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {classification === 'arabic_only' ? 'Arabic-only' : 'Arabic-Urdu'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Status:</span> {statusText}
                    </div>
                    
                    {isInGroundTruth && (
                      <div className="text-sm text-green-600">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Available in Ground Truth
                      </div>
                    )}
                    
                    {classification === 'arabic_only' && !isInGroundTruth && (
                      <button
                        onClick={() => startTranslationFromEvaluation(file.file_id)}
                        disabled={startTranslationMutation.isLoading}
                        className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {startTranslationMutation.isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start Translation
                          </>
                        )}
                      </button>
                    )}
                    
                    {classification === 'arabic_urdu_pairs' && !isInGroundTruth && (
                      <div className="text-sm text-blue-600">
                        <Info className="h-4 w-4 inline mr-1" />
                        Ready for evaluation
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Display */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Translation Segments</h3>
              <p className="text-sm text-gray-600 mt-1">Showing {flattenedSegments.length} segments</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Segment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Original (Arabic)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Translation (Urdu)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {flattenedSegments.map((segment, index) => (
                    <tr key={`${segment.evaluation_id}-${segment.segment_id}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900" dir="rtl">
                        <div className="max-w-xs truncate">{segment.original_text}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900" dir="rtl">
                        <div className="max-w-xs truncate">{segment.approved_translation}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(segment.status)}`}>
                          {getStatusIcon(segment.status)}
                          <span className="ml-1 capitalize">{segment.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">{segment.notes || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(segment.edited_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Status Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                <div className="text-4xl font-bold text-green-600 mb-2">{stats.approved}</div>
                <div className="text-sm font-medium text-green-700">Approved</div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-4xl font-bold text-blue-600 mb-2">{stats.edited}</div>
                <div className="text-sm font-medium text-blue-700">Edited</div>
              </div>
              <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                <div className="text-4xl font-bold text-red-600 mb-2">{stats.rejected}</div>
                <div className="text-sm font-medium text-red-700">Rejected</div>
              </div>
              <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="text-4xl font-bold text-yellow-600 mb-2">{stats.pending}</div>
                <div className="text-sm font-medium text-yellow-700">Pending</div>
              </div>
            </div>
          </div>
        )}

        {flattenedSegments.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
            <p className="text-gray-500">No ground truth data found for the selected criteria.</p>
          </div>
        )}

        {/* Translation Modal */}
        {showTranslationModal && selectedFileForTranslation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Start Translation Job</h3>
                <button
                  onClick={() => setShowTranslationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">
                        Start LLM Translation
                      </p>
                      <p className="text-sm text-blue-700">
                        This will start a translation job for "{selectedFileForTranslation.file.filename}" with {selectedFileForTranslation.content.segments.length} segments.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> After the translation job completes, you can review and approve the results to move them to ground truth for evaluation.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowTranslationModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={proceedWithTranslation}
                  disabled={startTranslationMutation.isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startTranslationMutation.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Translation'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroundTruth; 