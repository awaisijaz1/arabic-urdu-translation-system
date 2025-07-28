import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Brain,
  BarChart3,
  Edit3,
  Save,
  RefreshCw,
  TrendingUp,
  Target,
  Zap,
  Globe,
  Settings,
  Download,
  Eye,
  Star,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Layers,
  AlertCircle,
  Info
} from 'lucide-react';
import LLMConfig from './LLMConfig';
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

const TranslationJobs = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [editingSegment, setEditingSegment] = useState(null);
  const [editText, setEditText] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [jobProgress, setJobProgress] = useState({});
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalApprover, setApprovalApprover] = useState('admin');
  const [showExistingTranslationModal, setShowExistingTranslationModal] = useState(false);
  const [selectedFileForTranslation, setSelectedFileForTranslation] = useState(null);
  const [translationChoice, setTranslationChoice] = useState('use_existing'); // 'use_existing' or 'generate_new'
  const queryClient = useQueryClient();

  // Queries
  const { data: files } = useQuery('files', () => 
    axios.get('/files').then(res => res.data)
  );

  const { data: fileContent } = useQuery(
    ['fileContent', selectedFile],
    () => selectedFile ? axios.get(`/files/${selectedFile}/content`).then(res => res.data) : null,
    { enabled: !!selectedFile }
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

  const { data: llmJobs, refetch: refetchJobs } = useQuery('llmJobs', () => 
    axios.get('/translate/llm').then(res => res.data)
  );

  const { data: llmMetrics } = useQuery('llmMetrics', () => 
    axios.get('/translate/llm/metrics').then(res => res.data)
  );

  // Mutations
  const startTranslationMutation = useMutation(
    (data) => axios.post('/translate/llm', data),
    {
      onSuccess: (response) => {
        const jobId = response.data.job_id;
        toast.success('LLM translation job started! Processing in chunks...');
        setCurrentJob(jobId);
        
        // Initialize progress tracking
        setJobProgress(prev => ({
          ...prev,
          [jobId]: {
            status: 'starting',
            chunks: [],
            totalChunks: Math.ceil(response.data.total_segments / 3),
            completedChunks: 0,
            currentChunk: 0,
            startTime: new Date(),
            lastUpdate: new Date()
          }
        }));
        
        queryClient.invalidateQueries('llmJobs');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to start translation');
      }
    }
  );

  const updateTranslationMutation = useMutation(
    ({ jobId, segmentId, translation }) => 
      axios.post(`/translate/llm/${jobId}/update`, { segment_id: segmentId, translation }),
    {
      onSuccess: () => {
        toast.success('Translation updated successfully!');
        setEditingSegment(null);
        setEditText('');
        queryClient.invalidateQueries('llmJobs');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to update translation');
      }
    }
  );

  const approveTranslationMutation = useMutation(
    ({ jobId, approvedBy, notes }) => 
      axios.post(`/translate/llm/${jobId}/approve`, { 
        approved_by: approvedBy || 'admin', 
        notes: notes || '' 
      }),
    {
      onSuccess: (response) => {
        toast.success(`Translation approved! ${response.data.segments_approved} segments moved to ground truth.`);
        queryClient.invalidateQueries('llmJobs');
        queryClient.invalidateQueries('groundTruth');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to approve translation');
      }
    }
  );

  // Get current job details with enhanced polling
  const { data: currentJobDetails } = useQuery(
    ['llmJob', currentJob],
    () => currentJob ? axios.get(`/translate/llm/job/${currentJob}`).then(res => res.data) : null,
    { 
      enabled: !!currentJob,
      refetchInterval: currentJob ? 1000 : false, // Poll every 1 second for more responsive updates
      onSuccess: (data) => {
        if (data && currentJob) {
          // Update progress tracking
          setJobProgress(prev => {
            const current = prev[currentJob] || {};
            const isCompleted = data.status === 'completed';
            const isFailed = data.status === 'failed';
            
            // Estimate chunk progress based on completed segments
            const estimatedChunks = Math.ceil(data.total_segments / 3);
            const completedChunks = Math.floor(data.completed_segments / 3);
            
            return {
              ...prev,
              [currentJob]: {
                ...current,
                status: data.status,
                completedSegments: data.completed_segments,
                totalSegments: data.total_segments,
                completedChunks: Math.min(completedChunks, estimatedChunks),
                totalChunks: estimatedChunks,
                lastUpdate: new Date(),
                isCompleted,
                isFailed,
                completionTime: isCompleted ? new Date() : current.completionTime
              }
            };
          });
          
          // Show completion notification
          if (data.status === 'completed' && !jobProgress[currentJob]?.isCompleted) {
            const duration = new Date() - (jobProgress[currentJob]?.startTime || new Date());
            toast.success(`Translation completed! Took ${Math.round(duration / 1000)}s`);
          }
          
          // Show failure notification
          if (data.status === 'failed' && !jobProgress[currentJob]?.isFailed) {
            toast.error('Translation job failed. Check logs for details.');
          }
        }
      }
    }
  );

  const startLLMTranslation = () => {
    if (!selectedFile || !fileContent) {
      toast.error('Please select a file first');
      return;
    }

    // Check file classification
    const classification = getFileClassification(fileContent);
    
    if (classification === 'arabic_urdu_pairs') {
      // Show modal for existing translations
      setSelectedFileForTranslation({ file_id: selectedFile, content: fileContent });
      setShowExistingTranslationModal(true);
      return;
    }

    // Proceed with normal translation for Arabic-only files
    proceedWithTranslation();
  };

  const proceedWithTranslation = (useExistingTranslations = false) => {
    if (!selectedFile || !fileContent) {
      toast.error('Please select a file first');
      return;
    }

    let segments;
    
    if (useExistingTranslations) {
      // Use existing translations from the file
      segments = fileContent.segments.map((segment, index) => ({
        segment_id: segment.segment_id || segment.id || `segment_${index + 1}`,
        start_time: segment.start_time,
        end_time: segment.end_time,
        original_text: segment.original_text,
        translated_text: segment.translated_text
      }));
    } else {
      // Generate new translations
      segments = fileContent.segments.map((segment, index) => ({
        segment_id: segment.segment_id || segment.id || `segment_${index + 1}`,
        start_time: segment.start_time,
        end_time: segment.end_time,
        original_text: segment.original_text
      }));
    }

    startTranslationMutation.mutate({
      file_id: selectedFile,
      segments: segments,
      use_existing_translations: useExistingTranslations
    });
  };

  const handleEditTranslation = (segment) => {
    setEditingSegment(segment.segment_id);
    setEditText(segment.llm_translation || '');
  };

  const saveTranslation = () => {
    if (!currentJob || !editingSegment || !editText.trim()) return;

    updateTranslationMutation.mutate({
      jobId: currentJob,
      segmentId: editingSegment,
      translation: editText.trim()
    });
  };

  const handleApproveTranslation = () => {
    if (!currentJob) return;
    
    approveTranslationMutation.mutate({
      jobId: currentJob,
      approvedBy: approvalApprover,
      notes: approvalNotes
    });
    
    setShowApprovalModal(false);
    setApprovalNotes('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (jobId) => {
    const progress = jobProgress[jobId];
    if (!progress) return 0;
    
    if (progress.isCompleted) return 100;
    if (progress.isFailed) return 0;
    
    return Math.round((progress.completedSegments / progress.totalSegments) * 100);
  };

  const getChunkProgress = (jobId) => {
    const progress = jobProgress[jobId];
    if (!progress) return { completed: 0, total: 0 };
    
    return {
      completed: progress.completedChunks,
      total: progress.totalChunks
    };
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '0s';
    const duration = new Date() - startTime;
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">LLM Translation Jobs</h1>
              <p className="text-purple-100 mt-1">AI-powered Arabic to Urdu translation using Claude with intelligent chunking</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                {showConfig ? 'Hide Config' : 'Show Config'}
              </button>
              <div className="bg-purple-700 rounded-lg p-3">
                <Brain className="h-8 w-8 text-purple-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* LLM Configuration */}
        {showConfig && (
          <div className="mb-8">
            <LLMConfig />
          </div>
        )}
        
        {/* Metrics Dashboard */}
        {llmMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-lg p-3">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{llmMetrics.total_jobs}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-lg p-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{llmMetrics.completed_jobs}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">{(llmMetrics.average_confidence * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="bg-yellow-100 rounded-lg p-3">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Quality</p>
                  <p className="text-2xl font-bold text-gray-900">{(llmMetrics.average_quality_score * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="bg-orange-100 rounded-lg p-3">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Time</p>
                  <p className="text-2xl font-bold text-gray-900">{llmMetrics.average_translation_time}s</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Selection and Translation Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select File for Translation
              </label>
              <select
                value={selectedFile || ''}
                onChange={(e) => setSelectedFile(e.target.value || null)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                <option value="">Choose a file...</option>
                {files?.map(file => {
                  const fileContent = allFileContents?.find(fc => fc.file_id === file.file_id);
                  const classification = fileContent ? getFileClassification(fileContent) : 'unknown';
                  const statusText = getFileStatusText(classification);
                  
                  return (
                    <option key={file.file_id} value={file.file_id}>
                      {file.filename} ({file.segments_count} segments) - {statusText}
                    </option>
                  );
                })}
              </select>
              
              {/* File Status Display */}
              {selectedFile && fileContent && (
                <div className="mt-3">
                  {(() => {
                    const classification = getFileClassification(fileContent);
                    const statusText = getFileStatusText(classification);
                    const statusColor = getFileStatusColor(classification);
                    const StatusIcon = iconMap[getFileStatusIcon(classification)];
                    
                    return (
                      <div className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium ${statusColor}`}>
                        <StatusIcon className="h-4 w-4 mr-2" />
                        {statusText}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Translation Controls */}
            <div className="flex items-end space-x-4">
              <button
                onClick={startLLMTranslation}
                disabled={!selectedFile || startTranslationMutation.isLoading}
                className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startTranslationMutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start LLM Translation
                  </>
                )}
              </button>
              
              <button
                onClick={refetchJobs}
                className="flex items-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Enhanced Current Job Status */}
          {currentJobDetails && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Current Translation Job</h3>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentJobDetails.status)}`}>
                    {getStatusIcon(currentJobDetails.status)}
                    <span className="ml-1 capitalize">{currentJobDetails.status.replace('_', ' ')}</span>
                  </span>
                  {jobProgress[currentJob] && (
                    <span className="text-sm text-gray-600">
                      Duration: {formatDuration(jobProgress[currentJob].startTime)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Enhanced Progress Information */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{currentJobDetails.completed_segments}</div>
                  <div className="text-sm text-gray-600">of {currentJobDetails.total_segments} segments</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {currentJobDetails.average_confidence ? (currentJobDetails.average_confidence * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {currentJobDetails.average_quality_score ? (currentJobDetails.average_quality_score * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="text-sm text-gray-600">Quality Score</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {getProgressPercentage(currentJob)}%
                  </div>
                  <div className="text-sm text-gray-600">Progress</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center">
                    <Layers className="h-6 w-6 text-purple-600 mr-2" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {getChunkProgress(currentJob).completed}/{getChunkProgress(currentJob).total}
                      </div>
                      <div className="text-sm text-gray-600">Chunks</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Overall Progress</span>
                  <span>{getProgressPercentage(currentJob)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${getProgressPercentage(currentJob)}%` }}
                  ></div>
                </div>
                
                {/* Chunk Progress */}
                {currentJobDetails.status === 'in_progress' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Chunk Processing</span>
                      <span>{getChunkProgress(currentJob).completed}/{getChunkProgress(currentJob).total} chunks</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(getChunkProgress(currentJob).completed / getChunkProgress(currentJob).total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Approval Button for Completed Jobs */}
              {currentJobDetails.status === 'completed' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Ready for Approval</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Review the translations below and approve to move to ground truth
                      </p>
                    </div>
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      disabled={approveTranslationMutation.isLoading}
                      className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approveTranslationMutation.isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Translation
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Translation Results */}
        {currentJobDetails && currentJobDetails.segments && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Translation Results</h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing {currentJobDetails.segments.length} segments
              </p>
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
                      LLM Translation (Urdu)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quality
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentJobDetails.segments.map((segment, index) => (
                    <tr key={segment.segment_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900" dir="rtl">
                        <div className="max-w-xs">{segment.original_text}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900" dir="rtl">
                        {editingSegment === segment.segment_id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                              rows={3}
                              dir="rtl"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={saveTranslation}
                                className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                <Save className="h-3 w-3 inline mr-1" />
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSegment(null);
                                  setEditText('');
                                }}
                                className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-xs">
                            {segment.llm_translation ? (
                              segment.llm_translation
                            ) : (
                              <div className="flex items-center text-gray-400">
                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                Translating...
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {segment.confidence_score ? (
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${segment.confidence_score * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {(segment.confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {segment.quality_metrics?.overall_quality_score ? (
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${segment.quality_metrics.overall_quality_score * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {(segment.quality_metrics.overall_quality_score * 100).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {segment.llm_translation && (
                          <button
                            onClick={() => handleEditTranslation(segment)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Enhanced Recent Jobs */}
        {llmJobs && llmJobs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Translation Jobs</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Job ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      File ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Quality
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {llmJobs.slice(0, 10).map((job) => (
                    <tr key={job.job_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {job.job_id.slice(-8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.file_id.slice(-8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          <span className="ml-1 capitalize">{job.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(job.completed_segments / job.total_segments) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {job.completed_segments}/{job.total_segments}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.average_confidence ? (job.average_confidence * 100).toFixed(1) : '-'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.average_quality_score ? (job.average_quality_score * 100).toFixed(1) : '-'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(job.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setCurrentJob(job.job_id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Existing Translation Modal */}
        {showExistingTranslationModal && selectedFileForTranslation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">File Has Existing Translations</h3>
                <button
                  onClick={() => setShowExistingTranslationModal(false)}
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
                        This file contains Arabic-Urdu translation pairs
                      </p>
                      <p className="text-sm text-blue-700">
                        You can either use the existing translations or generate new ones using LLM.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="translationChoice"
                      value="use_existing"
                      checked={translationChoice === 'use_existing'}
                      onChange={(e) => setTranslationChoice(e.target.value)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Use Existing Translations</div>
                      <div className="text-sm text-gray-600">
                        Use the translations already present in the file. This will create a translation job with existing translations.
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="translationChoice"
                      value="generate_new"
                      checked={translationChoice === 'generate_new'}
                      onChange={(e) => setTranslationChoice(e.target.value)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Generate New LLM Translations</div>
                      <div className="text-sm text-gray-600">
                        Ignore existing translations and generate new ones using the LLM. This will overwrite existing translations.
                      </div>
                    </div>
                  </label>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> After translation, you can review and approve the results to move them to ground truth.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowExistingTranslationModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowExistingTranslationModal(false);
                    proceedWithTranslation(translationChoice === 'use_existing');
                  }}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Approve Translation</h3>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approved By
                  </label>
                  <input
                    type="text"
                    value={approvalApprover}
                    onChange={(e) => setApprovalApprover(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Add any notes about this translation..."
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will move {currentJobDetails?.segments?.length || 0} segments to the ground truth database. 
                    You can review and edit individual segments before approving.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveTranslation}
                  disabled={approveTranslationMutation.isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approveTranslationMutation.isLoading ? 'Approving...' : 'Approve & Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationJobs; 