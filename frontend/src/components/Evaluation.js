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
  Pause
} from 'lucide-react';

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

  const currentSegment = fileContent?.segments?.[currentSegmentIndex];
  const currentEvaluation = evaluations[currentSegmentIndex];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Translation Evaluation</h1>
        <p className="text-gray-600">Review and approve Arabic-to-Urdu translations</p>
      </div>

      {/* File Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Select File to Evaluate</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files?.map((file) => (
            <div
              key={file.file_id}
              onClick={() => setSelectedFile(file.file_id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedFile === file.file_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.filename}
                  </p>
                  <p className="text-sm text-gray-500">
                    {file.segments_count} segments • {file.file_type}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation Interface */}
      {selectedFile && fileContent && currentSegment && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Evaluating: {files?.find(f => f.file_id === selectedFile)?.filename}
            </h2>
            <button
              onClick={saveEvaluation}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Evaluation
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Segment {currentSegmentIndex + 1} of {fileContent.segments.length}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(((currentSegmentIndex + 1) / fileContent.segments.length) * 100)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentSegmentIndex + 1) / fileContent.segments.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Segment Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Original Text */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Original Text (Arabic)</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-lg text-right" dir="rtl">
                  {currentSegment.original_text}
                </p>
                <div className="mt-2 text-sm text-gray-500">
                  {currentSegment.start_time} - {currentSegment.end_time}
                </div>
              </div>
            </div>

            {/* Translated Text */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Translated Text (Urdu)</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-lg text-right" dir="rtl">
                  {currentSegment.translated_text}
                </p>
                <div className="mt-2 text-sm text-gray-500">
                  Confidence: {currentSegment.confidence ? `${(currentSegment.confidence * 100).toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Evaluation Controls */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Approved Translation</h3>
              <textarea
                value={currentEvaluation?.approved_translation || currentSegment.translated_text}
                onChange={(e) => handleSegmentEvaluation(currentSegmentIndex, 'approved_translation', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                rows={3}
                dir="rtl"
                placeholder="Edit the translation if needed..."
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
              <textarea
                value={currentEvaluation?.notes || ''}
                onChange={(e) => handleSegmentEvaluation(currentSegmentIndex, 'notes', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                rows={2}
                placeholder="Add any notes about this translation..."
              />
            </div>

            {/* Status Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleSegmentEvaluation(currentSegmentIndex, 'status', 'approved')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  currentEvaluation?.status === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </button>
              <button
                onClick={() => handleSegmentEvaluation(currentSegmentIndex, 'status', 'rejected')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  currentEvaluation?.status === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </button>
              <button
                onClick={() => handleSegmentEvaluation(currentSegmentIndex, 'status', 'edited')}
                className={`flex items-center px-4 py-2 rounded-md ${
                  currentEvaluation?.status === 'edited'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <button
              onClick={() => setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))}
              disabled={currentSegmentIndex === 0}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            <div className="flex items-center space-x-2">
              {fileContent.segments.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSegmentIndex(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === currentSegmentIndex
                      ? 'bg-blue-600'
                      : evaluations[index]?.status === 'pending'
                      ? 'bg-gray-300'
                      : 'bg-green-500'
                  }`}
                  title={`Segment ${index + 1} - ${evaluations[index]?.status || 'pending'}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentSegmentIndex(Math.min(fileContent.segments.length - 1, currentSegmentIndex + 1))}
              disabled={currentSegmentIndex === fileContent.segments.length - 1}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {selectedFile && fileContent && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Evaluation Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(evaluations).filter(e => e.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(evaluations).filter(e => e.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(evaluations).filter(e => e.status === 'edited').length}
              </div>
              <div className="text-sm text-gray-600">Edited</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(evaluations).filter(e => e.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Evaluation; 