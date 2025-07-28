import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Brain, 
  Key,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const LLMConfig = () => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('claude-3-sonnet-20240229');
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Available Claude models
  const availableModels = [
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Highest performance, slower speed' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest speed, good performance' }
  ];

  // Get current configuration
  const { data: config, isLoading } = useQuery('llmConfig', () => 
    axios.get('/translate/llm/config').then(res => res.data)
  );

  // Update configuration mutation
  const updateConfigMutation = useMutation(
    (data) => axios.post('/translate/llm/config', data),
    {
      onSuccess: () => {
        toast.success('LLM configuration updated successfully!');
        setIsEditing(false);
        queryClient.invalidateQueries('llmConfig');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to update configuration');
      }
    }
  );

  // Initialize form when config loads
  React.useEffect(() => {
    if (config && !isEditing) {
      setSystemPrompt(config.system_prompt || '');
      setModel(config.model || 'claude-3-sonnet-20240229');
    }
  }, [config, isEditing]);

  const handleSave = () => {
    updateConfigMutation.mutate({
      system_prompt: systemPrompt,
      model: model
    });
  };

  const handleCancel = () => {
    if (config) {
      setSystemPrompt(config.system_prompt || '');
      setModel(config.model || 'claude-3-sonnet-20240229');
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-purple-100 rounded-lg p-2 mr-3">
            <Settings className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">LLM Configuration</h3>
            <p className="text-sm text-gray-600">Configure Claude API settings and system prompt</p>
          </div>
        </div>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Configuration
          </button>
        )}
      </div>

      {/* API Key Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <Key className="h-5 w-5 text-gray-600 mr-2" />
          <span className="text-sm font-medium text-gray-700">API Key Status:</span>
          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            config?.api_key_configured 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {config?.api_key_configured ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Not Configured
              </>
            )}
          </span>
        </div>
        {!config?.api_key_configured && (
          <p className="text-sm text-red-600 mt-2">
            Please set the ANTHROPIC_API_KEY environment variable to use LLM translation.
          </p>
        )}
      </div>

      {/* Model Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Claude Model
        </label>
        {isEditing ? (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
          >
            {availableModels.map(modelOption => (
              <option key={modelOption.id} value={modelOption.id}>
                {modelOption.name} - {modelOption.description}
              </option>
            ))}
          </select>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Brain className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm text-gray-900">
                {availableModels.find(m => m.id === model)?.name || model}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {availableModels.find(m => m.id === model)?.description}
            </p>
          </div>
        )}
      </div>

      {/* System Prompt */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          System Prompt
        </label>
        {isEditing ? (
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white resize-none"
            placeholder="Enter the system prompt for Claude..."
          />
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{systemPrompt}</p>
          </div>
        )}
        <p className="text-xs text-gray-600 mt-2">
          This prompt defines Claude's role and behavior for translation tasks.
        </p>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={updateConfigMutation.isLoading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {updateConfigMutation.isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </button>
          
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Default Prompt Template */}
      {!isEditing && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Default System Prompt Template</h4>
          <p className="text-sm text-blue-800 mb-3">
            You can customize the system prompt to better suit your translation needs. Here's a suggested template:
          </p>
          <div className="bg-white p-3 rounded border border-blue-200">
            <p className="text-xs text-gray-700 font-mono">
              You are an expert Arabic to Urdu translator specializing in [your domain]. 
              Your translations should be:
              • Accurate and faithful to the original meaning
              • Natural and fluent in Urdu
              • Appropriate for [your use case]
              • Maintain the same tone and style as the original
              • [Add any specific requirements]
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMConfig; 