import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  User,
  Activity,
  Zap,
  Shield,
  FileText,
  History
} from 'lucide-react';

const LLMConfig = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  
  // Form states
  const [currentConfig, setCurrentConfig] = useState({
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    system_prompt: '',
    temperature: 0.1,
    max_tokens: 1000
  });
  
  const [newProvider, setNewProvider] = useState({
    id: '',
    name: '',
    api_key: '',
    base_url: '',
    is_active: true
  });
  
  const [newModel, setNewModel] = useState({
    provider: 'anthropic',
    model_id: '',
    name: '',
    description: '',
    max_tokens: 1000,
    temperature: 0.1,
    is_active: true
  });
  
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    content: '',
    description: '',
    is_default: false
  });

  const queryClient = useQueryClient();

  // Get current configuration
  const { data: config, isLoading } = useQuery('llmConfig', () => 
    axios.get('/translate/llm/config').then(res => res.data)
  );

  // Get providers, models, and prompts
  const { data: providers } = useQuery('llmProviders', () => 
    axios.get('/translate/llm/config/providers').then(res => res.data)
  );

  const { data: models } = useQuery('llmModels', () => 
    axios.get('/translate/llm/config/models').then(res => res.data)
  );

  const { data: prompts } = useQuery('llmPrompts', () => 
    axios.get('/translate/llm/config/prompts').then(res => res.data)
  );

  const { data: logs } = useQuery('llmLogs', () => 
    axios.get('/translate/llm/config/logs?limit=20').then(res => res.data)
  );

  // Update configuration mutation
  const updateConfigMutation = useMutation(
    (data) => axios.post('/translate/llm/config', data),
    {
      onSuccess: () => {
        toast.success('LLM configuration updated successfully!');
        setIsEditing(false);
        queryClient.invalidateQueries(['llmConfig', 'llmProviders', 'llmModels', 'llmPrompts', 'llmLogs']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to update configuration');
      }
    }
  );

  // Initialize form when config loads
  useEffect(() => {
    if (config && !isEditing) {
      setCurrentConfig(config.current_config || {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        system_prompt: '',
        temperature: 0.1,
        max_tokens: 1000
      });
    }
  }, [config, isEditing]);

  const handleSave = () => {
    updateConfigMutation.mutate({
      user: 'admin',
      current_config: currentConfig
    });
  };

  const handleCancel = () => {
    if (config) {
      setCurrentConfig(config.current_config || {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        system_prompt: '',
        temperature: 0.1,
        max_tokens: 1000
      });
    }
    setIsEditing(false);
  };

  const handleAddProvider = () => {
    updateConfigMutation.mutate({
      user: 'admin',
      new_api_providers: [newProvider]
    });
    setShowAddProvider(false);
    setNewProvider({
      id: '',
      name: '',
      api_key: '',
      base_url: '',
      is_active: true
    });
  };

  const handleAddModel = () => {
    updateConfigMutation.mutate({
      user: 'admin',
      new_models: [newModel]
    });
    setShowAddModel(false);
    setNewModel({
      provider: 'anthropic',
      model_id: '',
      name: '',
      description: '',
      max_tokens: 1000,
      temperature: 0.1,
      is_active: true
    });
  };

  const handleAddPrompt = () => {
    updateConfigMutation.mutate({
      user: 'admin',
      new_system_prompts: [newPrompt]
    });
    setShowAddPrompt(false);
    setNewPrompt({
      name: '',
      content: '',
      description: '',
      is_default: false
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Loading configuration...</span>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'providers', name: 'API Providers', icon: Key },
    { id: 'models', name: 'Models', icon: Brain },
    { id: 'prompts', name: 'System Prompts', icon: FileText },
    { id: 'logs', name: 'Change Logs', icon: History }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="bg-purple-100 rounded-lg p-2 mr-3">
            <Settings className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">LLM Configuration</h3>
            <p className="text-sm text-gray-600">Manage API providers, models, and system prompts</p>
          </div>
        </div>
        
        {activeTab === 'overview' && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Configuration
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* API Key Status */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Key className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">API Key Status:</span>
                  <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    config?.api_providers?.anthropic?.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {config?.api_providers?.anthropic?.is_active ? (
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
                <button
                  onClick={() => setActiveTab('providers')}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Manage Providers
                </button>
              </div>
            </div>

            {/* Current Configuration */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Configuration</h4>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                      <select
                        value={currentConfig.provider}
                        onChange={(e) => setCurrentConfig({...currentConfig, provider: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      >
                        {providers?.providers && Object.entries(providers.providers).map(([id, provider]) => (
                          <option key={id} value={id}>{provider.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                      <select
                        value={currentConfig.model}
                        onChange={(e) => setCurrentConfig({...currentConfig, model: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      >
                        {models?.models && Object.entries(models.models).map(([id, model]) => (
                          <option key={id} value={model.model_id}>{model.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={currentConfig.temperature}
                        onChange={(e) => setCurrentConfig({...currentConfig, temperature: parseFloat(e.target.value)})}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Tokens</label>
                      <input
                        type="number"
                        min="1"
                        max="4000"
                        value={currentConfig.max_tokens}
                        onChange={(e) => setCurrentConfig({...currentConfig, max_tokens: parseInt(e.target.value)})}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt</label>
                    <select
                      value={currentConfig.system_prompt}
                      onChange={(e) => setCurrentConfig({...currentConfig, system_prompt: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select a system prompt...</option>
                      {prompts?.prompts && Object.entries(prompts.prompts).map(([name, prompt]) => (
                        <option key={name} value={prompt.content}>{prompt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-xs text-gray-500">Provider</span>
                    <p className="text-sm font-medium">{providers?.providers?.[currentConfig.provider]?.name || currentConfig.provider}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Model</span>
                    <p className="text-sm font-medium">{models?.models?.[`${currentConfig.provider}_${currentConfig.model}`]?.name || currentConfig.model}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Temperature</span>
                    <p className="text-sm font-medium">{currentConfig.temperature}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Max Tokens</span>
                    <p className="text-sm font-medium">{currentConfig.max_tokens}</p>
                  </div>
                </div>
              )}
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
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-700">API Providers</h4>
              <button
                onClick={() => setShowAddProvider(true)}
                className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Provider
              </button>
            </div>
            
            <div className="grid gap-4">
              {providers?.providers && Object.entries(providers.providers).map(([id, provider]) => (
                <div key={id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Key className="h-5 w-5 text-gray-600 mr-2" />
                      <div>
                        <h5 className="font-medium">{provider.name}</h5>
                        <p className="text-sm text-gray-500">ID: {id}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        provider.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {provider.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        provider.has_api_key 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {provider.has_api_key ? 'API Key Set' : 'No API Key'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Provider Modal */}
            {showAddProvider && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h4 className="text-lg font-semibold mb-4">Add API Provider</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provider ID</label>
                      <input
                        type="text"
                        value={newProvider.id}
                        onChange={(e) => setNewProvider({...newProvider, id: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., anthropic"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newProvider.name}
                        onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Anthropic"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                      <input
                        type="password"
                        value={newProvider.api_key}
                        onChange={(e) => setNewProvider({...newProvider, api_key: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="sk-..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (Optional)</label>
                      <input
                        type="text"
                        value={newProvider.base_url}
                        onChange={(e) => setNewProvider({...newProvider, base_url: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="https://api.anthropic.com"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={handleAddProvider}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Add Provider
                    </button>
                    <button
                      onClick={() => setShowAddProvider(false)}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-700">Models</h4>
              <button
                onClick={() => setShowAddModel(true)}
                className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Model
              </button>
            </div>
            
            <div className="grid gap-4">
              {models?.models && Object.entries(models.models).map(([id, model]) => (
                <div key={id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Brain className="h-5 w-5 text-gray-600 mr-2" />
                      <div>
                        <h5 className="font-medium">{model.name}</h5>
                        <p className="text-sm text-gray-500">{model.description}</p>
                        <p className="text-xs text-gray-400">Provider: {model.provider} | ID: {model.model_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        model.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {model.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex space-x-4 text-xs text-gray-500">
                    <span>Max Tokens: {model.max_tokens}</span>
                    <span>Temperature: {model.temperature}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Model Modal */}
            {showAddModel && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h4 className="text-lg font-semibold mb-4">Add Model</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                      <select
                        value={newModel.provider}
                        onChange={(e) => setNewModel({...newModel, provider: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        {providers?.providers && Object.entries(providers.providers).map(([id, provider]) => (
                          <option key={id} value={id}>{provider.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model ID</label>
                      <input
                        type="text"
                        value={newModel.model_id}
                        onChange={(e) => setNewModel({...newModel, model_id: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., claude-3-sonnet-20240229"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newModel.name}
                        onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Claude 3 Sonnet"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={newModel.description}
                        onChange={(e) => setNewModel({...newModel, description: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Balanced performance and speed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                        <input
                          type="number"
                          value={newModel.max_tokens}
                          onChange={(e) => setNewModel({...newModel, max_tokens: parseInt(e.target.value)})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                        <input
                          type="number"
                          step="0.1"
                          value={newModel.temperature}
                          onChange={(e) => setNewModel({...newModel, temperature: parseFloat(e.target.value)})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={handleAddModel}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Add Model
                    </button>
                    <button
                      onClick={() => setShowAddModel(false)}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-700">System Prompts</h4>
              <button
                onClick={() => setShowAddPrompt(true)}
                className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Prompt
              </button>
            </div>
            
            <div className="grid gap-4">
              {prompts?.prompts && Object.entries(prompts.prompts).map(([name, prompt]) => (
                <div key={name} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <FileText className="h-5 w-5 text-gray-600 mr-2 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="font-medium">{prompt.name}</h5>
                        <p className="text-sm text-gray-500 mb-2">{prompt.description}</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{prompt.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {prompt.is_default && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Prompt Modal */}
            {showAddPrompt && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h4 className="text-lg font-semibold mb-4">Add System Prompt</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newPrompt.name}
                        onChange={(e) => setNewPrompt({...newPrompt, name: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Technical Translation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={newPrompt.description}
                        onChange={(e) => setNewPrompt({...newPrompt, description: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Optimized for technical content"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                      <textarea
                        value={newPrompt.content}
                        onChange={(e) => setNewPrompt({...newPrompt, content: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={4}
                        placeholder="Enter the system prompt content..."
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPrompt.is_default}
                        onChange={(e) => setNewPrompt({...newPrompt, is_default: e.target.checked})}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">Set as default prompt</label>
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={handleAddPrompt}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Add Prompt
                    </button>
                    <button
                      onClick={() => setShowAddPrompt(false)}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">Configuration Change Logs</h4>
            
            <div className="space-y-2">
              {logs?.logs && logs.logs.map((log, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 text-gray-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium">{log.action.replace('_', ' ').toUpperCase()}</p>
                        <p className="text-xs text-gray-500">by {log.user}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {log.details.changes && (
                    <div className="mt-2 text-xs text-gray-600">
                      <p className="font-medium">Changes:</p>
                      <ul className="list-disc list-inside mt-1">
                        {log.details.changes.map((change, i) => (
                          <li key={i}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMConfig; 