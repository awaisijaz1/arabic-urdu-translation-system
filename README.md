# Arabic-Urdu Translation and Evaluation System

A comprehensive microservices-based system for Arabic to Urdu translation using LLM technology, with evaluation capabilities, persistent job management, and modern UI/UX design.

## 🚀 Features

### **Core Translation System**
- **LLM-Powered Translation**: Advanced Arabic to Urdu translation using multiple LLM providers
- **Intelligent Chunking**: Optimized batch processing for large files
- **Quality Metrics**: Confidence scores and quality assessment for each translation
- **Persistent Job History**: Translation jobs persist across service restarts
- **Real-time Progress**: Live updates during translation processing with toast notifications

### **Enhanced LLM Configuration**
- **Multiple API Providers**: Support for Anthropic, OpenAI, Azure OpenAI, and extensible providers
- **Dynamic Model Management**: Add, edit, and configure models from different providers via UI
- **System Prompt Management**: Create, edit, and manage system prompts with templates
- **Configuration Logging**: All changes logged with user, timestamp, and details
- **Persistent Configuration**: Settings survive service restarts and system updates

### **File Classification System**
- **Smart File Detection**: Automatically classify files as "Arabic-only" or "Arabic-Urdu pairs"
- **Translation Workflow**: Arabic-only files → LLM translation → Arabic-Urdu pairs
- **Evaluation Workflow**: Arabic-Urdu pairs → Ready for evaluation
- **Cross-page Integration**: Trigger translations from evaluation page
- **Status Indicators**: Color-coded badges showing file readiness

### **Ground Truth Management**
- **Approval System**: Review and approve translations before moving to ground truth
- **Persistent Storage**: Approved translations stored permanently with full audit trail
- **Quality Control**: Manual review and editing capabilities with change tracking
- **Unified Dataset View**: Single table showing all segments for better analysis
- **Enhanced Filtering**: Multi-level filters (file selection, search, status)
- **Export Capabilities**: Download ground truth data in multiple formats

### **Modern UI/UX Design**
- **Professional Interface**: Glass morphism, gradients, and consistent design language
- **Animated Components**: Smooth counters, progress indicators, and hover effects
- **Responsive Design**: Mobile-first approach with proper breakpoints
- **Real-time Updates**: Enhanced polling with automatic notifications
- **Consistent Navigation**: Fixed navbar with proper spacing and responsive elements

### **Evaluation System**
- **Quality Assessment**: Evaluate translation quality with comprehensive metrics
- **Batch Processing**: Process multiple files efficiently
- **Results Analysis**: Detailed evaluation reports and statistics

## 🏗️ Architecture

### **Microservices**
- **Frontend**: React-based UI with modern design and real-time updates
- **API Gateway**: Centralized routing and authentication
- **Translation Service**: LLM translation with persistent job storage
- **Evaluation Service**: Quality assessment and evaluation
- **Storage Service**: Ground truth and file management
- **Input Service**: File upload and processing

### **Technology Stack**
- **Backend**: FastAPI, Python, LangChain
- **Frontend**: React, React Query, Tailwind CSS
- **Database**: JSON-based persistent storage
- **Containerization**: Docker, Docker Compose
- **LLM**: Anthropic Claude, OpenAI GPT models, Azure OpenAI
- **UI Components**: Lucide React icons, custom animated components

## 📋 Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 18+
- API key for supported LLM provider (Anthropic, OpenAI, or Azure OpenAI)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/awaisijaz1/arabic-urdu-translation-system.git
   cd arabic-urdu-translation-system
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file with your API key
   echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
   # or for OpenAI
   echo "OPENAI_API_KEY=your_openai_key_here" > .env
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8000

## 🎯 Usage Guide

### **1. File Upload and Processing**
- Upload Arabic files (JSON, SRT, TXT formats) through the modern file upload interface
- System automatically classifies files as "Arabic-only" or "Arabic-Urdu pairs"
- Files are processed and ready for translation or evaluation with status indicators

### **2. LLM Translation**
- **For Arabic-only files**: Start LLM translation to generate Urdu translations
- **For Arabic-Urdu pairs**: Choose to use existing translations or generate new ones
- Monitor real-time progress with enhanced polling and notifications
- View quality metrics, confidence scores, and translation times
- Edit individual segments with automatic change tracking

### **3. LLM Configuration Management**
- **API Providers**: Add and configure multiple LLM providers through the UI
- **Models**: Select from available models or add custom ones
- **System Prompts**: Create and manage translation prompts with templates
- **Real-time Updates**: Configuration changes applied immediately
- **Persistent Storage**: All settings survive service restarts

### **4. Ground Truth Management**
- **Unified View**: All segments displayed in a single, searchable table
- **Advanced Filtering**: Filter by file, search text, and status
- **Approval Process**: Review translations and approve with comments
- **Edit Tracking**: Manual changes marked separately from auto-approvals
- **Export Data**: Download approved translations in JSON format

### **5. Dashboard Analytics**
- **Performance Gauges**: Circular progress indicators with animated counters
- **Real-time Metrics**: Live updates of system performance and statistics
- **Quick Actions**: Easy access to all major functions
- **Activity Tracking**: Recent jobs and system performance monitoring

## 🔧 Configuration

### **LLM Providers**
The system supports multiple LLM providers with UI-based configuration:

#### **Anthropic Claude**
```bash
ANTHROPIC_API_KEY=sk-your-key-here
```

#### **OpenAI**
```bash
OPENAI_API_KEY=your-key-here
```

#### **Azure OpenAI**
```bash
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-05-01-preview
```

### **System Configuration**
All configuration is managed through the UI and persisted in `/app/data/llm_config.json`:
- **Current Active Configuration**: Provider, model, system prompt, temperature, max tokens
- **API Providers**: Multiple providers with keys and endpoints
- **Models**: Available models for each provider
- **System Prompts**: Custom translation prompts
- **Change Logs**: Complete audit trail of configuration changes

## 📊 API Documentation

### **Core Endpoints**
- `GET /files` - List uploaded files
- `POST /files/upload` - Upload new files
- `POST /translate/llm` - Start translation job
- `GET /translate/llm/jobs` - List all translation jobs
- `GET /translate/llm/job/{id}` - Get job details
- `POST /translate/llm/{id}/approve` - Approve translation
- `GET /ground-truth` - Get ground truth data
- `GET /ground-truth/export` - Export ground truth

### **Configuration Endpoints**
- `GET /translate/llm/config` - Get full configuration
- `POST /translate/llm/config` - Update configuration
- `GET /translate/llm/config/providers` - Get API providers
- `GET /translate/llm/config/models` - Get available models
- `GET /translate/llm/config/prompts` - Get system prompts

## 🔍 Troubleshooting

### **Common Issues**
1. **UI Goes Blank**: Check browser console for JavaScript errors, clear cache
2. **Translation Fails**: Verify API keys in configuration, check LLM provider status
3. **Jobs Lost on Restart**: Ensure `data/translation_jobs.json` has write permissions
4. **Configuration Reset**: Check `data/llm_config.json` file permissions and format
5. **Navbar Overlap**: Clear browser cache after UI updates

### **Performance Tips**
- **Large Files**: System automatically chunks large files for optimal processing
- **Real-time Updates**: Polling intervals optimized for performance and responsiveness
- **Memory Usage**: Docker containers configured with appropriate resource limits
- **Caching**: React Query provides intelligent caching for better performance

## 🔒 Security

- **API Keys**: Stored securely and excluded from version control
- **File Uploads**: Validated and stored in secure directories
- **CORS**: Properly configured for cross-origin requests
- **Input Validation**: All user inputs sanitized and validated
- **Authentication**: Admin role checking for sensitive operations

## 🚀 Recent Updates

### **UI/UX Redesign (Latest)**
- **Complete Visual Overhaul**: All pages redesigned with modern, professional interface
- **Consistent Design Language**: Glass morphism, gradients, and animated components
- **Enhanced User Experience**: Better navigation, filtering, and data visualization
- **Performance Improvements**: Optimized rendering and real-time updates
- **Responsive Design**: Mobile-first approach with proper breakpoints

### **Ground Truth Enhancements**
- **Unified Dataset View**: Single table showing all segments instead of file-grouped cards
- **Advanced Filtering**: Multi-level filters with file selection, search, and status
- **Accurate Metrics**: Fixed average confidence calculation and statistics
- **Visible Data**: Proper date display, comments, and approval information
- **Consistent Styling**: Professional white cards with colored icons

### **Translation System Improvements**
- **Persistent Job Storage**: Jobs survive service restarts with complete history
- **Enhanced Error Handling**: Proper failed job status and detailed error messages
- **Real-time Notifications**: Toast messages for job completion and failures
- **Edit Tracking**: Manual segment edits tracked and displayed separately
- **Metrics Accuracy**: Fixed calculation for averages and success rates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the system documentation in `SYSTEM_TRUTH.md`

---

**Built with ❤️ for Arabic-Urdu translation and evaluation**

