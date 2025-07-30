import React, { useState, useCallback } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FileText, 
  Languages, 
  CheckSquare, 
  Database, 
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  X,
  TrendingUp,
  Activity,
  Zap,
  Target,
  Globe,
  Brain,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Play
} from 'lucide-react';

// Circular Progress Component
const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = "#3B82F6" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-800">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 2000 }) => {
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: files, refetch: refetchFiles } = useQuery('files', () => 
    axios.get('/files').then(res => res.data)
  );

  const { data: llmJobs } = useQuery('llmJobs', () => 
    axios.get('/translate/llm').then(res => res.data)
  );

  // Use ground truth data for evaluations since that's where all approved translations are stored
  const { data: evaluations } = useQuery('evaluations', () => 
    axios.get('/ground-truth').then(res => res.data)
  );

  const { data: groundTruth } = useQuery('groundTruth', () => 
    axios.get('/ground-truth').then(res => res.data)
  );

  const { data: llmMetrics } = useQuery('llmMetrics', () => 
    axios.get('/translate/llm/metrics').then(res => res.data)
  );

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/json' || 
                         file.name.endsWith('.srt') ||
                         file.name.endsWith('.json');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      toast.error('Some files were rejected. Only .srt and .json files under 10MB are allowed.');
    }

    setUploadedFiles(validFiles);
  }, []);

  const handleUpload = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success(`Successfully uploaded ${uploadedFiles.length} file(s)`);
      setUploadedFiles([]);
      setShowUploadModal(false);
      refetchFiles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles, refetchFiles]);

  // Calculate metrics
  const totalFiles = files?.length || 0;
  const totalJobs = llmJobs?.length || 0;
  const completedJobs = llmJobs?.filter(job => job.status === 'completed').length || 0;
  const totalSegments = groundTruth ? groundTruth.reduce((total, gt) => total + gt.total_segments, 0) : 0;
  const approvedSegments = groundTruth ? groundTruth.reduce((total, gt) => 
    total + gt.segments.filter(seg => seg.status === 'approved').length, 0) : 0;
  
  const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
  const approvalRate = totalSegments > 0 ? (approvedSegments / totalSegments) * 100 : 0;
  const avgConfidence = llmMetrics?.average_confidence ? llmMetrics.average_confidence * 100 : 0;
  const avgQuality = llmMetrics?.average_quality_score ? llmMetrics.average_quality_score * 100 : 0;

  const recentJobs = llmJobs?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5) || [];
  const recentEvaluations = evaluations?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <Sparkles className="h-8 w-8 mr-3 text-yellow-300" />
              Translation Intelligence Dashboard
              <Brain className="h-8 w-8 ml-3 text-blue-300" />
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Harness the power of AI to transform Arabic content into precise Urdu translations with intelligent evaluation and quality assurance
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-10 relative z-10">
        
        {/* Performance Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Completion Rate Gauge */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CircularProgress percentage={completionRate} color="#10B981" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Job Completion</h3>
              <p className="text-sm text-gray-600">
                <AnimatedCounter value={completedJobs} /> of <AnimatedCounter value={totalJobs} /> jobs completed
              </p>
              <div className="flex items-center justify-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600 text-sm font-medium">On Track</span>
              </div>
            </div>
          </div>

          {/* Approval Rate Gauge */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CircularProgress percentage={approvalRate} color="#3B82F6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Approval Rate</h3>
              <p className="text-sm text-gray-600">
                <AnimatedCounter value={approvedSegments} /> of <AnimatedCounter value={totalSegments} /> segments
              </p>
              <div className="flex items-center justify-center mt-2">
                <CheckCircle className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-blue-600 text-sm font-medium">Quality Focus</span>
              </div>
            </div>
          </div>

          {/* Confidence Gauge */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CircularProgress percentage={avgConfidence} color="#F59E0B" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Avg Confidence</h3>
              <p className="text-sm text-gray-600">AI translation confidence</p>
              <div className="flex items-center justify-center mt-2">
                <Target className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-yellow-600 text-sm font-medium">Precision</span>
              </div>
            </div>
          </div>

          {/* Quality Gauge */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CircularProgress percentage={avgQuality} color="#8B5CF6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Quality Score</h3>
              <p className="text-sm text-gray-600">Translation quality rating</p>
              <div className="flex items-center justify-center mt-2">
                <Sparkles className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-purple-600 text-sm font-medium">Excellence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Files Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Files</p>
                <p className="text-3xl font-bold"><AnimatedCounter value={totalFiles} /></p>
                <p className="text-blue-200 text-xs mt-1">Ready for processing</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3">
                <FileText className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Translation Jobs Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Translation Jobs</p>
                <p className="text-3xl font-bold"><AnimatedCounter value={totalJobs} /></p>
                <div className="flex items-center mt-1">
                  <ArrowUp className="h-3 w-3 text-green-200 mr-1" />
                  <p className="text-green-200 text-xs">Active processing</p>
                </div>
              </div>
              <div className="bg-green-400 bg-opacity-30 rounded-lg p-3">
                <Languages className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Evaluations Card */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Evaluations</p>
                <p className="text-3xl font-bold"><AnimatedCounter value={evaluations?.length || 0} /></p>
                <p className="text-yellow-200 text-xs mt-1">Quality assessments</p>
              </div>
              <div className="bg-yellow-400 bg-opacity-30 rounded-lg p-3">
                <CheckSquare className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Ground Truth Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Ground Truth</p>
                <p className="text-3xl font-bold"><AnimatedCounter value={totalSegments} /></p>
                <p className="text-purple-200 text-xs mt-1">Validated segments</p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 rounded-lg p-3">
                <Database className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Activity and Progress Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-500" />
                Recent Translation Jobs
              </h3>
              <button 
                onClick={() => navigate('/translation')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                View All <ArrowUp className="h-4 w-4 ml-1 rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              {recentJobs.length > 0 ? recentJobs.map((job, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      job.status === 'completed' ? 'bg-green-400' : 
                      job.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-800">{job.file_id}</p>
                      <p className="text-sm text-gray-600">{job.total_segments} segments</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800 capitalize">{job.status}</p>
                    <p className="text-xs text-gray-500">{new Date(job.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Languages className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No translation jobs yet</p>
                </div>
              )}
            </div>
          </div>

          {/* System Performance */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                System Performance
              </h3>
            </div>
            <div className="space-y-6">
              {/* Processing Speed */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Processing Speed</span>
                  <span className="text-sm text-gray-600">{llmMetrics?.average_translation_time?.toFixed(2) || '0'}s avg</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style={{width: '85%'}}></div>
                </div>
              </div>

              {/* Success Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Success Rate</span>
                  <span className="text-sm text-gray-600">{completionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" style={{width: `${completionRate}%`}}></div>
                </div>
              </div>

              {/* Quality Index */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Quality Index</span>
                  <span className="text-sm text-gray-600">{avgQuality.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full" style={{width: `${avgQuality}%`}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Files
            </button>
            <button
              onClick={() => navigate('/translation')}
              className="flex items-center justify-center p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
            >
              <Languages className="h-5 w-5 mr-2" />
              Start Translation
            </button>
            <button
              onClick={() => navigate('/evaluation')}
              className="flex items-center justify-center p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 transform hover:scale-105"
            >
              <CheckSquare className="h-5 w-5 mr-2" />
              Evaluate Quality
            </button>
            <button
              onClick={() => navigate('/ground-truth')}
              className="flex items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
            >
              <Database className="h-5 w-5 mr-2" />
              View Results
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".srt,.json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="quick-upload-input"
                  />
                  <label
                    htmlFor="quick-upload-input"
                    className="cursor-pointer text-blue-600 hover:text-blue-700"
                  >
                    Choose files to upload
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports .srt and .json files up to 10MB each
                  </p>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleUpload}
                    disabled={isUploading || uploadedFiles.length === 0}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 