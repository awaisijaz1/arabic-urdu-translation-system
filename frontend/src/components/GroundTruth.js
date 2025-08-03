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
  Info,
  Sparkles,
  Brain,
  Award,
  Activity,
  Target,
  Shield,
  RefreshCw
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

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1500 }) => {
  const [count, setCount] = useState(0);

  React.useEffect(() => {
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{count}</span>;
};

// Status Badge Component
const StatusBadge = ({ status, className = "" }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: 'text-green-500' };
      case 'edited':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Edit3, color: 'text-blue-500' };
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: 'text-yellow-500' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: FileText, color: 'text-gray-500' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      <Icon className={`h-3 w-3 mr-1 ${config.color}`} />
      {status.toUpperCase()}
    </span>
  );
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

  // Data fetching
  const { data: groundTruth, refetch: refetchGroundTruth } = useQuery('groundTruth', () => 
    axios.get('/ground-truth').then(res => res.data)
  );

  const { data: files } = useQuery('files', () => 
    axios.get('/files').then(res => res.data)
  );

  const { data: evaluations } = useQuery('evaluations', () => 
    axios.get('/evaluate').then(res => res.data)
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

  // Get unique files from ground truth data
  const uniqueFiles = groundTruth ? [...new Set(groundTruth.map(item => item.file_id))] : [];

  // Mutation for triggering translation job
  const startTranslationMutation = useMutation(
    (data) => axios.post('/translate/llm', data),
    {
      onSuccess: (response) => {
        toast.success('Translation job started successfully!');
        setShowTranslationModal(false);
        setSelectedFileForTranslation(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to start translation');
      }
    }
  );

  // Handle triggering translation job for Arabic-only files
  const handleTriggerTranslation = (file) => {
    const fileContent = allFileContents?.find(content => content.file_id === file.file_id);
    if (!fileContent) {
      toast.error('File content not found');
      return;
    }

    const segments = fileContent.segments.map((segment, index) => ({
      segment_id: segment.segment_id || segment.id || `segment_${index + 1}`,
      start_time: segment.start_time,
      end_time: segment.end_time,
      original_text: segment.original_text
    }));

    startTranslationMutation.mutate({
      file_id: file.file_id,
      segments: segments,
      use_existing_translations: false
    });
  };

  // Flatten all segments for unified view and filtering
  const flattenedSegments = groundTruth ? groundTruth.flatMap(gt => 
    gt.segments.map(segment => ({
      ...segment,
      file_id: gt.file_id,
      evaluation_id: gt.evaluation_id,
      created_at: gt.created_at
    }))
  ) : [];

  // Apply filters to flattened segments
  const filteredSegments = flattenedSegments.filter(segment => {
    const matchesSearch = searchTerm === '' || 
      segment.original_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      segment.translated_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      segment.approved_translation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      segment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      segment.file_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || segment.status === statusFilter;
    const matchesFile = selectedFile === null || segment.file_id === selectedFile;
    
    return matchesSearch && matchesStatus && matchesFile;
  });

  // Calculate statistics from all segments
  const stats = {
    total: flattenedSegments.length,
    approved: flattenedSegments.filter(seg => seg.status === 'approved').length,
    edited: flattenedSegments.filter(seg => seg.status === 'edited').length,
    files: uniqueFiles.length,
    avgConfidence: flattenedSegments.length > 0 ? 
      flattenedSegments.reduce((sum, seg) => sum + (seg.confidence_score || 0), 0) / flattenedSegments.length : 0
  };

  // Export functionality
  const handleExport = async () => {
    try {
      const response = await axios.get('/ground-truth/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ground_truth_data.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Ground truth data exported successfully');
    } catch (error) {
      toast.error('Failed to export ground truth data');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 -mt-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <Database className="h-8 w-8 mr-3 text-blue-300" />
              Ground Truth Data
              <Shield className="h-8 w-8 ml-3 text-green-300" />
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Manage and analyze approved translation evaluations with comprehensive quality metrics and export capabilities
            </p>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-10 relative z-10">
        
        {/* Statistics Dashboard - Consistent Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Segments */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Segments</p>
                <p className="text-3xl font-bold text-gray-900"><AnimatedCounter value={stats.total} /></p>
                <div className="flex items-center mt-1">
                  <Table className="h-3 w-3 text-blue-500 mr-1" />
                  <p className="text-gray-500 text-xs">Ground truth data</p>
                </div>
              </div>
              <div className="bg-blue-100 rounded-xl p-3">
                <Table className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Approved Segments */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Approved</p>
                <p className="text-3xl font-bold text-gray-900"><AnimatedCounter value={stats.approved} /></p>
                <div className="flex items-center mt-1">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                  <p className="text-gray-500 text-xs">Quality assured</p>
                </div>
              </div>
              <div className="bg-green-100 rounded-xl p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Edited Segments */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Edited</p>
                <p className="text-3xl font-bold text-gray-900"><AnimatedCounter value={stats.edited} /></p>
                <div className="flex items-center mt-1">
                  <Edit3 className="h-3 w-3 text-orange-500 mr-1" />
                  <p className="text-gray-500 text-xs">Manual reviews</p>
                </div>
              </div>
              <div className="bg-orange-100 rounded-xl p-3">
                <Edit3 className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Total Files */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Files</p>
                <p className="text-3xl font-bold text-gray-900"><AnimatedCounter value={stats.files} /></p>
                <div className="flex items-center mt-1">
                  <FileText className="h-3 w-3 text-purple-500 mr-1" />
                  <p className="text-gray-500 text-xs">Unique files</p>
                </div>
              </div>
              <div className="bg-purple-100 rounded-xl p-3">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Average Confidence */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Confidence</p>
                <p className="text-3xl font-bold text-gray-900">{(stats.avgConfidence * 100).toFixed(1)}%</p>
                <div className="flex items-center mt-1">
                  <Target className="h-3 w-3 text-indigo-500 mr-1" />
                  <p className="text-gray-500 text-xs">Quality score</p>
                </div>
              </div>
              <div className="bg-indigo-100 rounded-xl p-3">
                <Target className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Controls & File Classification */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Filter className="h-5 w-5 mr-2 text-purple-500" />
                  Filters & Actions
                </h3>
              </div>

              <div className="space-y-4">
                {/* File Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
                  <select
                    value={selectedFile || ''}
                    onChange={(e) => setSelectedFile(e.target.value || null)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 backdrop-blur-sm"
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

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search segments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 backdrop-blur-sm"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 backdrop-blur-sm"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="edited">Edited</option>
                </select>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export Data
                </button>

                {/* Refresh Button */}
                <button
                  onClick={() => refetchGroundTruth()}
                  className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Refresh Data
                </button>
              </div>
            </div>

            {/* Files Overview with Classification */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-500" />
                  File Classification
                </h3>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {files?.map(file => {
                  const fileContent = allFileContents?.find(fc => fc.file_id === file.file_id);
                  const classification = fileContent ? getFileClassification(fileContent.segments) : 'unknown';
                  const statusText = getFileStatusText(classification);
                  const statusColor = getFileStatusColor(classification);
                  const StatusIcon = iconMap[getFileStatusIcon(classification)];
                  
                  return (
                    <div key={file.file_id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{file.filename}</h4>
                      </div>
                      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusText}
                      </div>
                      
                      {classification === 'arabic_only' && (
                        <button
                          onClick={() => handleTriggerTranslation(file)}
                          disabled={startTranslationMutation.isLoading}
                          className="mt-2 w-full flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs"
                        >
                          {startTranslationMutation.isLoading ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          Trigger Translation
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ground Truth Data Display - Unified Dataset */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Database className="h-5 w-5 mr-2 text-green-500" />
                    Ground Truth Segments
                  </h3>
                  <div className="text-sm text-gray-500">
                    Showing {filteredSegments.length} of {flattenedSegments.length} segments
                  </div>
                </div>
              </div>

              <div className="max-h-[32rem] overflow-y-auto">
                {filteredSegments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Translation</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Translation</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredSegments.map((segment, index) => (
                          <tr key={`${segment.evaluation_id}-${segment.segment_id}-${index}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              <div className="max-w-24 truncate">
                                {files?.find(f => f.file_id === segment.file_id)?.filename || segment.file_id}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="max-w-xs truncate" dir="rtl">
                                {segment.original_text}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="max-w-xs truncate" dir="rtl">
                                {segment.translated_text}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="max-w-xs truncate" dir="rtl">
                                {segment.approved_translation || segment.translated_text}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {segment.confidence_score ? 
                                `${(segment.confidence_score * 100).toFixed(1)}%` : 
                                'N/A'
                              }
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={segment.status} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div className="max-w-xs truncate">
                                {segment.notes || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {segment.approved_at ? 
                                new Date(segment.approved_at).toLocaleDateString() : 
                                new Date(segment.edited_at || segment.created_at).toLocaleDateString()
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No ground truth data found</h3>
                    <p className="text-gray-500">No ground truth data found for the selected criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroundTruth; 