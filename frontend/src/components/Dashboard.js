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
  X
} from 'lucide-react';

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
      setShowUploadModal(false);
      refetchFiles();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const stats = [
    {
      name: 'Uploaded Files',
      value: files?.length || 0,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      name: 'Translation Jobs',
      value: llmJobs?.length || 0,
      icon: Languages,
      color: 'bg-green-500',
    },
    {
      name: 'Evaluations',
      value: evaluations?.length || 0,
      icon: CheckSquare,
      color: 'bg-yellow-500',
    },
    {
      name: 'Ground Truth Records',
      value: groundTruth ? groundTruth.reduce((total, gt) => total + gt.total_segments, 0) : 0,
      icon: Database,
      color: 'bg-purple-500',
    },
  ];

  const recentJobs = llmJobs?.slice(0, 5) || [];
  const recentEvaluations = evaluations?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your translation evaluation system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Translation Jobs */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Translation Jobs
            </h3>
            <div className="space-y-3">
              {recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <div key={job.job_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Job {job.job_id.slice(-8)}...
                      </p>
                      <p className="text-sm text-gray-500">
                        {job.completed_segments}/{job.total_segments} segments
                      </p>
                    </div>
                    <div className="flex items-center">
                      {job.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {job.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {job.status === 'in_progress' && (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                      <span className="ml-2 text-sm text-gray-500 capitalize">
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent jobs</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Evaluations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Evaluations
            </h3>
            <div className="space-y-3">
              {recentEvaluations.length > 0 ? (
                recentEvaluations.map((evaluation) => (
                  <div key={evaluation.evaluation_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {evaluation.evaluation_id.startsWith('llm_approval_') ? 'LLM Approval' : 'Evaluation'} {evaluation.evaluation_id.slice(-8)}...
                      </p>
                      <p className="text-sm text-gray-500">
                        {evaluation.total_segments} segments • {evaluation.edited_by || 'admin'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(evaluation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent evaluations</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New File
            </button>
            <button 
              onClick={() => navigate('/translation')}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Languages className="h-4 w-4 mr-2" />
              LLM Translation Jobs
            </button>
            <button 
              onClick={() => navigate('/evaluation')}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Review Evaluations
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
                    <h4 className="text-sm font-medium text-gray-900">Selected Files:</h4>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={uploadFiles}
                    disabled={isUploading || uploadedFiles.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
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