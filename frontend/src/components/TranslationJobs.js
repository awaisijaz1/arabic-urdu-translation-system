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
  Info,
  Sparkles,
  Activity,
  ArrowRight,
  Timer,
  Award,
  Filter,
  Search
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
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: 'text-green-500' };
      case 'failed':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, color: 'text-red-500' };
      case 'in_progress':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Loader2, color: 'text-blue-500' };
      case 'approved':
        return { bg: 'bg-purple-100', text: 'text-purple-800', icon: Star, color: 'text-purple-500' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, color: 'text-gray-500' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      <Icon className={`h-3 w-3 mr-1 ${config.color} ${status === 'in_progress' ? 'animate-spin' : ''}`} />
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

// Progress Ring Component
const ProgressRing = ({ progress, size = 60, strokeWidth = 4 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#10B981"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-700">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

const TranslationJobs = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showExistingTranslationModal, setShowExistingTranslationModal] = useState(false);
  const [selectedFileForTranslation, setSelectedFileForTranslation] = useState(null);
  const [useExistingTranslations, setUseExistingTranslations] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingSegment, setEditingSegment] = useState(null);
  const [editedTranslation, setEditedTranslation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const queryClient = useQueryClient();

  // Data fetching
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
    axios.get('/translate/llm').then(res => res.data), {
    refetchInterval: 2000,
    refetchIntervalInBackground: true
  });

  const { data: llmMetrics } = useQuery('llmMetrics', () => 
    axios.get('/translate/llm/metrics').then(res => res.data)
  );

  // Get current job details with enhanced polling
  const { data: llmJob } = useQuery(
    ['llmJob', currentJob],
    () => currentJob ? axios.get(`/translate/llm/job/${currentJob}`).then(res => res.data) : null,
    { 
      enabled: !!currentJob,
      refetchInterval: currentJob ? 1000 : false, // Poll every 1 second for more responsive updates
      onSuccess: (data) => {
        if (data && currentJob) {
          // Show completion notification
          if (data.status === 'completed' && llmJobs?.find(job => job.job_id === currentJob)?.status !== 'completed') {
            toast.success(`Translation completed! ${data.completed_segments}/${data.total_segments} segments processed`);
            refetchJobs(); // Refresh the jobs list
          }
          
          // Show failure notification
          if (data.status === 'failed' && llmJobs?.find(job => job.job_id === currentJob)?.status !== 'failed') {
            toast.error('Translation job failed. Check logs for details.');
            refetchJobs(); // Refresh the jobs list
          }
        }
      }
    }
  );

  // Mutations
  const startTranslationMutation = useMutation(
    (data) => axios.post('/translate/llm', data),
    {
      onSuccess: (response) => {
        const jobId = response.data.job_id;
        setCurrentJob(jobId);
        toast.success('Translation job started successfully!');
        refetchJobs();
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to start translation');
      }
    }
  );

  const updateTranslationMutation = useMutation(
    ({ jobId, segmentId, translation }) => 
      axios.post(`/translate/llm/${jobId}/update`, {
        segment_id: segmentId,
        updated_translation: translation
      }),
    {
      onSuccess: () => {
        toast.success('Translation updated successfully');
        queryClient.invalidateQueries(['llmJob', currentJob]);
        setEditingSegment(null);
        setEditedTranslation('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to update translation');
      }
    }
  );

  const approveTranslationMutation = useMutation(
    ({ jobId, notes }) => 
      axios.post(`/translate/llm/${jobId}/approve`, { notes }),
    {
      onSuccess: () => {
        toast.success('Translation approved and saved to ground truth!');
        setShowApprovalModal(false);
        setApprovalNotes('');
        refetchJobs();
        queryClient.invalidateQueries('groundTruth');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to approve translation');
      }
    }
  );

  // Helper functions
  const startLLMTranslation = () => {
    if (!selectedFile || !fileContent) {
      toast.error('Please select a file first');
      return;
    }

    // Check file classification
    const classification = getFileClassification(fileContent.segments);
    
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

  const handleExistingTranslationChoice = (useExisting) => {
    setShowExistingTranslationModal(false);
    proceedWithTranslation(useExisting);
  };

  const handleEditTranslation = (segment) => {
    setEditingSegment(segment.segment_id);
    setEditedTranslation(segment.llm_translation || '');
  };

  const handleSaveEdit = () => {
    if (!editingSegment || !editedTranslation.trim()) {
      toast.error('Please enter a translation');
      return;
    }

    updateTranslationMutation.mutate({
      jobId: currentJob,
      segmentId: editingSegment,
      translation: editedTranslation
    });
  };

  const handleApproveJob = () => {
    approveTranslationMutation.mutate({
      jobId: currentJob,
      notes: approvalNotes
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      case 'approved': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '0s';
    const duration = new Date() - startTime;
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  // Filter and search logic
  const filteredJobs = llmJobs?.filter(job => {
    const matchesSearch = job.file_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [];

  // Calculate metrics
  const totalJobs = llmJobs?.length || 0;
  const completedJobs = llmJobs?.filter(job => job.status === 'completed').length || 0;
  const inProgressJobs = llmJobs?.filter(job => job.status === 'in_progress').length || 0;
  const failedJobs = llmJobs?.filter(job => job.status === 'failed').length || 0;
  const approvedJobs = llmJobs?.filter(job => job.status === 'approved').length || 0;



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 -mt-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
                  <Brain className="h-8 w-8 mr-3 text-blue-300" />
                  LLM Translation Jobs
                  <Sparkles className="h-8 w-8 ml-3 text-yellow-300" />
                </h1>
                <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                  AI-powered Arabic to Urdu translation using LLM of your choice with intelligent chunking and real-time progress tracking
                </p>
              </div>
            </div>
            
            <div className="absolute top-6 right-6">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border border-white/20"
              >
                <Settings className="h-5 w-5 mr-2" />
                {showConfig ? 'Hide Config' : 'LLM Config'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-10 relative z-10">
        
        {/* LLM Configuration */}
        {showConfig && (
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
            <LLMConfig />
          </div>
        )}
        
        {/* Metrics Dashboard */}
        {llmMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Total Jobs */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Jobs</p>
                  <p className="text-3xl font-bold"><AnimatedCounter value={llmMetrics.total_jobs} /></p>
                  <div className="flex items-center mt-1">
                    <Activity className="h-3 w-3 text-blue-200 mr-1" />
                    <p className="text-blue-200 text-xs">Translation tasks</p>
                  </div>
                </div>
                <div className="bg-blue-400/30 rounded-xl p-3">
                  <FileText className="h-8 w-8" />
                </div>
              </div>
            </div>

            {/* Completed Jobs */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold"><AnimatedCounter value={llmMetrics.completed_jobs} /></p>
                  <div className="flex items-center mt-1">
                    <CheckCircle className="h-3 w-3 text-green-200 mr-1" />
                    <p className="text-green-200 text-xs">Successfully done</p>
                  </div>
                </div>
                <div className="bg-green-400/30 rounded-xl p-3">
                  <CheckCircle className="h-8 w-8" />
                </div>
              </div>
            </div>

            {/* Average Confidence */}
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Avg Confidence</p>
                  <p className="text-3xl font-bold">{(llmMetrics.average_confidence * 100).toFixed(1)}%</p>
                  <div className="flex items-center mt-1">
                    <Target className="h-3 w-3 text-yellow-200 mr-1" />
                    <p className="text-yellow-200 text-xs">AI certainty</p>
                  </div>
                </div>
                <div className="bg-yellow-400/30 rounded-xl p-3">
                  <Target className="h-8 w-8" />
                </div>
              </div>
            </div>

            {/* Quality Score */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Quality Score</p>
                  <p className="text-3xl font-bold">{(llmMetrics.average_quality_score * 100).toFixed(1)}%</p>
                  <div className="flex items-center mt-1">
                    <Award className="h-3 w-3 text-purple-200 mr-1" />
                    <p className="text-purple-200 text-xs">Translation quality</p>
                  </div>
                </div>
                <div className="bg-purple-400/30 rounded-xl p-3">
                  <Award className="h-8 w-8" />
                </div>
              </div>
            </div>

            {/* Average Time */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Avg Time</p>
                  <p className="text-3xl font-bold">
                    {llmMetrics.average_translation_time ? 
                      `${llmMetrics.average_translation_time.toFixed(2)}s` : 
                      'N/A'
                    }
                  </p>
                  <div className="flex items-center mt-1">
                    <Timer className="h-3 w-3 text-indigo-200 mr-1" />
                    <p className="text-indigo-200 text-xs">Per segment</p>
                  </div>
                </div>
                <div className="bg-indigo-400/30 rounded-xl p-3">
                  <Timer className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* File Selection & Job Creation */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Layers className="h-5 w-5 mr-2 text-blue-500" />
                  Start New Translation
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select File for Translation
                  </label>
                  <select
                    value={selectedFile || ''}
                    onChange={(e) => setSelectedFile(e.target.value || null)}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="">Choose a file...</option>
                                         {files?.map(file => {
                       const fileContent = allFileContents?.find(fc => fc.file_id === file.file_id);
                       const classification = fileContent ? getFileClassification(fileContent.segments) : 'unknown';
                       const statusText = getFileStatusText(classification);
                       
                       return (
                         <option key={file.file_id} value={file.file_id}>
                           {file.filename} ({file.segments_count} segments) - {statusText}
                         </option>
                       );
                     })}
                  </select>
                </div>

                                 {/* File Status Display */}
                 {selectedFile && fileContent && (
                   <div className="mt-3">
                     {(() => {
                       const classification = getFileClassification(fileContent.segments);
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

                                 <button
                   onClick={startLLMTranslation}
                   disabled={!selectedFile || startTranslationMutation.isLoading}
                   className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg"
                 >
                   {startTranslationMutation.isLoading ? (
                     <>
                       <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                       Starting Translation...
                     </>
                   ) : (
                     <>
                       <Play className="h-5 w-5 mr-2" />
                       Start LLM Translation
                     </>
                   )}
                 </button>
              </div>
            </div>
          </div>

          {/* Jobs List */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-purple-500" />
                    Translation Jobs
                  </h3>
                  <button
                    onClick={refetchJobs}
                    className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search jobs by file name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>

              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metrics</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredJobs.map((job) => {
                      const progress = job.total_segments > 0 ? (job.completed_segments / job.total_segments) * 100 : 0;
                      
                      return (
                        <tr key={job.job_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{job.file_id}</div>
                              <div className="text-sm text-gray-500">
                                {job.completed_segments}/{job.total_segments} segments
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(job.created_at).toLocaleString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <ProgressRing progress={progress} size={50} strokeWidth={3} />
                              <div className="text-sm text-gray-600">
                                {Math.round(progress)}%
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={job.status} />
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="space-y-1">
                              <div>Conf: {job.average_confidence ? (job.average_confidence * 100).toFixed(1) : '-'}%</div>
                              <div>Qual: {job.average_quality_score ? (job.average_quality_score * 100).toFixed(1) : '-'}%</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setCurrentJob(job.job_id);
                                  setShowJobDetails(true);
                                }}
                                className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </button>
                              {job.status === 'completed' && (
                                <button
                                  onClick={() => {
                                    setCurrentJob(job.job_id);
                                    setShowApprovalModal(true);
                                  }}
                                  className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredJobs.length === 0 && (
                  <div className="text-center py-12">
                    <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No translation jobs found</h3>
                    <p className="text-gray-500">Start your first translation job by selecting a file above.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Job Details Modal */}
        {showJobDetails && llmJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Translation Job Details
                  </h3>
                  <button
                    onClick={() => setShowJobDetails(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                {/* Job Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-600">{llmJob.completed_segments}</div>
                    <div className="text-sm text-blue-600">Completed</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {llmJob.average_confidence ? (llmJob.average_confidence * 100).toFixed(1) : '0'}%
                    </div>
                    <div className="text-sm text-green-600">Confidence</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {llmJob.average_quality_score ? (llmJob.average_quality_score * 100).toFixed(1) : '0'}%
                    </div>
                    <div className="text-sm text-purple-600">Quality</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <StatusBadge status={llmJob.status} />
                  </div>
                </div>

                {/* Segments Table */}
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-100">
                    <h4 className="font-medium text-gray-900">Translation Segments</h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Original</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Translation</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metrics</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {llmJob.segments?.map((segment) => {
                          const isFailed = segment.llm_translation?.startsWith('[Translation failed:');
                          
                          return (
                            <tr key={segment.segment_id} className={isFailed ? 'bg-red-50' : 'bg-white'}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {segment.segment_id}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                {segment.original_text}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {editingSegment === segment.segment_id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editedTranslation}
                                      onChange={(e) => setEditedTranslation(e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded-lg resize-none"
                                      rows={3}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={handleSaveEdit}
                                        className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                      >
                                        <Save className="h-3 w-3 mr-1" />
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingSegment(null);
                                          setEditedTranslation('');
                                        }}
                                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={isFailed ? 'text-red-600' : 'text-gray-900'}>
                                    {segment.llm_translation || 'No translation'}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div className="space-y-1">
                                  <div>Conf: {isFailed ? '0%' : segment.confidence_score ? `${(segment.confidence_score * 100).toFixed(1)}%` : '-'}</div>
                                  <div>Qual: {isFailed ? '0%' : segment.quality_metrics?.overall_quality_score ? `${(segment.quality_metrics.overall_quality_score * 100).toFixed(1)}%` : '-'}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {!isFailed && llmJob.status === 'completed' && (
                                  <button
                                    onClick={() => handleEditTranslation(segment)}
                                    className="flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                  >
                                    <Edit3 className="h-3 w-3 mr-1" />
                                    Edit
                                  </button>
                                )}
                                {isFailed && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => setShowJobDetails(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {llmJob.status === 'completed' && (
                    <button
                      onClick={() => {
                        setShowJobDetails(false);
                        setShowApprovalModal(true);
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
                    >
                      Approve Translation
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 rounded-t-2xl">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Approve Translation
                </h3>
              </div>
              
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to approve this translation? It will be saved to ground truth data.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Add any notes about this approval..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setApprovalNotes('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveJob}
                    disabled={approveTranslationMutation.isLoading}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
                  >
                    {approveTranslationMutation.isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                        Approving...
                      </>
                    ) : (
                      'Approve Translation'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Existing Translation Modal */}
        {showExistingTranslationModal && selectedFileForTranslation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 rounded-t-2xl">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  File Has Existing Translations
                </h3>
              </div>
              
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
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
                  <button
                    onClick={() => handleExistingTranslationChoice(true)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Use Existing Translations
                  </button>
                  
                  <button
                    onClick={() => handleExistingTranslationChoice(false)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                  >
                    <Brain className="h-5 w-5 mr-2" />
                    Generate New LLM Translations
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowExistingTranslationModal(false);
                      setSelectedFileForTranslation(null);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationJobs; 