import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Clock, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Save,
  Play,
  Pause,
  Target,
  Award,
  BarChart3,
  Activity,
  Eye,
  Sparkles,
  Brain,
  Shield,
  TrendingUp,
  Users,
  RefreshCw
} from 'lucide-react';

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
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, color: 'text-red-500' };
      case 'edited':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Edit3, color: 'text-blue-500' };
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: 'text-yellow-500' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, color: 'text-gray-500' };
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

// Progress Ring Component
const ProgressRing = ({ progress, size = 60, strokeWidth = 6 }) => {
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
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-blue-500 transition-all duration-300 ease-in-out"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-gray-700">
        {Math.round(progress)}%
      </span>
    </div>
  );
};

const Evaluation = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const { data: files, refetch: refetchFiles } = useQuery('files', () => 
    axios.get('/files').then(res => res.data)
  );

  const { data: fileContent } = useQuery(
    ['fileContent', selectedFile],
    () => selectedFile ? axios.get(`/files/${selectedFile}/content`).then(res => res.data) : null,
    { enabled: !!selectedFile }
  );

  useEffect(() => {
    if (fileContent && fileContent.segments) {
      // Initialize evaluations for all segments
      const initialEvaluations = {};
      fileContent.segments.forEach((segment, index) => {
        initialEvaluations[index] = {
          status: 'pending',
          approved_translation: segment.translated_text || '',
          notes: ''
        };
      });
      setEvaluations(initialEvaluations);
      setCurrentSegmentIndex(0);
    }
  }, [fileContent]);

  const handleSegmentEvaluation = (segmentIndex, field, value) => {
    setEvaluations(prev => ({
      ...prev,
      [segmentIndex]: {
        ...prev[segmentIndex],
        [field]: value
      }
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'edited':
        return <Edit3 className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'edited':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const saveEvaluation = async () => {
    if (!selectedFile) return;

    try {
      const evaluationData = {
        file_id: selectedFile,
        segments: fileContent.segments.map((segment, index) => ({
          segment_id: segment.segment_id || index.toString(),
          start_time: segment.start_time,
          end_time: segment.end_time,
          original_text: segment.original_text,
          translated_text: segment.translated_text,
          approved_translation: evaluations[index]?.approved_translation || segment.translated_text,
          status: evaluations[index]?.status || 'pending',
          notes: evaluations[index]?.notes || ''
        }))
      };

      await axios.post('/evaluations', evaluationData);
      toast.success('Evaluation saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save evaluation');
    }
  };

  // Calculate statistics
  const stats = {
    total: fileContent?.segments?.length || 0,
    approved: Object.values(evaluations).filter(e => e.status === 'approved').length,
    rejected: Object.values(evaluations).filter(e => e.status === 'rejected').length,
    edited: Object.values(evaluations).filter(e => e.status === 'edited').length,
    pending: Object.values(evaluations).filter(e => e.status === 'pending').length,
    progress: fileContent?.segments?.length > 0 ? 
      ((Object.values(evaluations).filter(e => e.status !== 'pending').length / fileContent.segments.length) * 100) : 0
  };

  const currentSegment = fileContent?.segments?.[currentSegmentIndex];
  const currentEvaluation = evaluations[currentSegmentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 -mt-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
              <Target className="h-8 w-8 mr-3 text-blue-300" />
              Translation Evaluation
              <Award className="h-8 w-8 ml-3 text-yellow-300" />
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Review and approve Arabic-to-Urdu translations with comprehensive quality assessment and real-time evaluation tracking
            </p>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-10 relative z-10">
        
        {/* Statistics Dashboard */}
        {selectedFile && fileContent && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Total Segments */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Segments</p>
                  <p className="text-3xl font-bold text-gray-900"><AnimatedCounter value={stats.total} /></p>
                  <div className="flex items-center mt-1">
                    <FileText className="h-3 w-3 text-blue-500 mr-1" />
                    <p className="text-gray-500 text-xs">Ready for review</p>
                  </div>
                </div>
                <div className="bg-blue-100 rounded-xl p-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Approved */}
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

            {/* Edited */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Edited</p>
                  <p className="text-3xl font-bold text-gray-900"><AnimatedCounter value={stats.edited} /></p>
                  <div className="flex items-center mt-1">
                    <Edit3 className="h-3 w-3 text-blue-500 mr-1" />
                    <p className="text-gray-500 text-xs">Manual reviews</p>
                  </div>
                </div>
                <div className="bg-blue-100 rounded-xl p-3">
                  <Edit3 className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Rejected */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Rejected</p>
                  <p className="text-3xl font-bold text-gray-900"><AnimatedCounter value={stats.rejected} /></p>
                  <div className="flex items-center mt-1">
                    <XCircle className="h-3 w-3 text-red-500 mr-1" />
                    <p className="text-gray-500 text-xs">Quality issues</p>
                  </div>
                </div>
                <div className="bg-red-100 rounded-xl p-3">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Progress</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.progress.toFixed(1)}%</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-purple-500 mr-1" />
                    <p className="text-gray-500 text-xs">Completion rate</p>
                  </div>
                </div>
                <div className="bg-purple-100 rounded-xl p-3">
                  <ProgressRing progress={stats.progress} size={40} strokeWidth={4} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* File Selection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-purple-500" />
                  Select File
                </h3>
                <button
                  onClick={() => refetchFiles()}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {files?.map((file) => (
                  <div
                    key={file.file_id}
                    onClick={() => setSelectedFile(file.file_id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedFile === file.file_id
                        ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105'
                        : 'border-gray-200 hover:border-gray-300 bg-white/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedFile === file.file_id ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <FileText className={`h-5 w-5 ${
                          selectedFile === file.file_id ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.segments_count} segments • {file.file_type}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(!files || files.length === 0) && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No files available</p>
                  <p className="text-gray-400 text-xs">Upload files to start evaluation</p>
                </div>
              )}
            </div>
          </div>

          {/* Evaluation Interface */}
          <div className="lg:col-span-3">
            {selectedFile && fileContent && currentSegment ? (
              <div className="space-y-6">
                {/* Current Evaluation Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2 text-green-500" />
                          Evaluating: {files?.find(f => f.file_id === selectedFile)?.filename}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Segment {currentSegmentIndex + 1} of {fileContent.segments.length} • 
                          {Math.round(((currentSegmentIndex + 1) / fileContent.segments.length) * 100)}% complete
                        </p>
                      </div>
                      <button
                        onClick={saveEvaluation}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Evaluation
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-in-out"
                          style={{ width: `${((currentSegmentIndex + 1) / fileContent.segments.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Segment Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Original Text */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <Brain className="h-4 w-4 mr-2 text-blue-500" />
                          Original Text (Arabic)
                        </h4>
                        <div className="mb-4">
                          <p className="text-lg text-right leading-relaxed" dir="rtl">
                            {currentSegment.original_text}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 bg-white/50 rounded-lg px-3 py-2">
                          <span>Time: {currentSegment.start_time} - {currentSegment.end_time}</span>
                          <span>ID: {currentSegment.segment_id || currentSegmentIndex}</span>
                        </div>
                      </div>

                      {/* Translated Text */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                          Translated Text (Urdu)
                        </h4>
                        <div className="mb-4">
                          <p className="text-lg text-right leading-relaxed" dir="rtl">
                            {currentSegment.translated_text}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 bg-white/50 rounded-lg px-3 py-2">
                          <span>Confidence: {currentSegment.confidence ? `${(currentSegment.confidence * 100).toFixed(1)}%` : 'N/A'}</span>
                          <StatusBadge status={currentEvaluation?.status || 'pending'} />
                        </div>
                      </div>
                    </div>

                    {/* Evaluation Controls */}
                    <div className="space-y-6">
                      {/* Approved Translation */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-green-500" />
                          Approved Translation
                        </h4>
                        <textarea
                          value={currentEvaluation?.approved_translation || currentSegment.translated_text}
                          onChange={(e) => handleSegmentEvaluation(currentSegmentIndex, 'approved_translation', e.target.value)}
                          className="w-full p-4 border border-green-300 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/70 backdrop-blur-sm text-right"
                          rows={3}
                          dir="rtl"
                          placeholder="Edit the translation if needed..."
                        />
                      </div>

                      {/* Notes */}
                      <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-yellow-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <Edit3 className="h-4 w-4 mr-2 text-amber-500" />
                          Evaluation Notes
                        </h4>
                        <textarea
                          value={currentEvaluation?.notes || ''}
                          onChange={(e) => handleSegmentEvaluation(currentSegmentIndex, 'notes', e.target.value)}
                          className="w-full p-4 border border-yellow-300 rounded-xl resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white/70 backdrop-blur-sm"
                          rows={2}
                          placeholder="Add any notes about this translation..."
                        />
                      </div>

                      {/* Status Buttons */}
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => handleSegmentEvaluation(currentSegmentIndex, 'status', 'approved')}
                          className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                            currentEvaluation?.status === 'approved'
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                              : 'bg-white/70 text-gray-700 hover:bg-green-50 border border-gray-200 hover:border-green-300'
                          }`}
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleSegmentEvaluation(currentSegmentIndex, 'status', 'edited')}
                          className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                            currentEvaluation?.status === 'edited'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                              : 'bg-white/70 text-gray-700 hover:bg-blue-50 border border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <Edit3 className="h-5 w-5 mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleSegmentEvaluation(currentSegmentIndex, 'status', 'rejected')}
                          className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                            currentEvaluation?.status === 'rejected'
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                              : 'bg-white/70 text-gray-700 hover:bg-red-50 border border-gray-200 hover:border-red-300'
                          }`}
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="p-6 border-t border-gray-200 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))}
                        disabled={currentSegmentIndex === 0}
                        className="flex items-center px-6 py-3 text-gray-700 bg-white/70 rounded-xl hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                      </button>

                      {/* Segment Indicators */}
                      <div className="flex items-center space-x-2 max-w-md overflow-x-auto">
                        {fileContent.segments.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentSegmentIndex(index)}
                            className={`w-4 h-4 rounded-full transition-all duration-300 hover:scale-125 ${
                              index === currentSegmentIndex
                                ? 'bg-blue-600 ring-2 ring-blue-300'
                                : evaluations[index]?.status === 'pending'
                                ? 'bg-gray-300 hover:bg-gray-400'
                                : evaluations[index]?.status === 'approved'
                                ? 'bg-green-500 hover:bg-green-600'
                                : evaluations[index]?.status === 'edited'
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : 'bg-red-500 hover:bg-red-600'
                            }`}
                            title={`Segment ${index + 1} - ${evaluations[index]?.status || 'pending'}`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentSegmentIndex(Math.min(fileContent.segments.length - 1, currentSegmentIndex + 1))}
                        disabled={currentSegmentIndex === fileContent.segments.length - 1}
                        className="flex items-center px-6 py-3 text-gray-700 bg-white/70 rounded-xl hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-12 text-center">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No File Selected</h3>
                <p className="text-gray-500">Select a file from the panel to start evaluation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Evaluation; 