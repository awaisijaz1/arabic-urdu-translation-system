# Arabic-Urdu Translation and Evaluation System

A comprehensive microservices-based system for Arabic to Urdu translation using LLM technology, with evaluation capabilities and persistent job management.

## 🚀 Features

### **Core Translation System**
- **LLM-Powered Translation**: Advanced Arabic to Urdu translation using Claude AI
- **Intelligent Chunking**: Optimized batch processing for large files
- **Quality Metrics**: Confidence scores and quality assessment for each translation
- **Persistent Job History**: Translation jobs persist across service restarts
- **Real-time Progress**: Live updates during translation processing

### **Enhanced LLM Configuration**
- **Multiple API Providers**: Support for Anthropic, OpenAI, and extensible providers
- **Dynamic Model Management**: Add, edit, and configure models from different providers
- **System Prompt Management**: Create, edit, and manage system prompts with templates
- **Configuration Logging**: All changes logged with user, timestamp, and details
- **Real-time Updates**: Configuration changes immediately available

### **File Classification System**
- **Smart File Detection**: Automatically classify files as "Arabic-only" or "Arabic-Urdu pairs"
- **Translation Workflow**: Arabic-only files → LLM translation → Arabic-Urdu pairs
- **Evaluation Workflow**: Arabic-Urdu pairs → Ready for evaluation
- **Cross-page Integration**: Trigger translations from evaluation page

### **Ground Truth Management**
- **Approval System**: Review and approve translations before moving to ground truth
- **Persistent Storage**: Approved translations stored permanently
- **Quality Control**: Manual review and editing capabilities
- **Audit Trail**: Complete history of approvals and changes

### **Evaluation System**
- **Quality Assessment**: Evaluate translation quality with metrics
- **Batch Processing**: Process multiple files efficiently
- **Results Analysis**: Detailed evaluation reports and statistics

## 🏗️ Architecture

### **Microservices**
- **Frontend**: React-based UI with real-time updates
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
- **LLM**: Anthropic Claude, OpenAI GPT models

## 📋 Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 18+
- Anthropic API key (or other supported LLM provider)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/awaisijaz1/arabic-urdu-translation-system.git
   cd arabic-urdu-translation-system
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file
   echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
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
- Upload Arabic files (JSON, SRT, TXT formats)
- System automatically classifies files as "Arabic-only" or "Arabic-Urdu pairs"
- Files are processed and ready for translation or evaluation

### **2. LLM Translation**
- **For Arabic-only files**: Start LLM translation to generate Urdu translations
- **For Arabic-Urdu pairs**: Choose to use existing translations or generate new ones
- Monitor real-time progress with chunk-based processing
- View quality metrics and confidence scores

### **3. LLM Configuration Management**
- **API Providers**: Add and configure multiple LLM providers
- **Models**: Select from available models or add custom ones
- **System Prompts**: Create specialized prompts for different use cases
- **Change Logs**: Track all configuration modifications

### **4. Translation Approval**
- Review completed translations
- Edit individual segments if needed
- Approve translations to move them to ground truth
- All approved translations are permanently stored

### **5. Evaluation**
- Evaluate Arabic-Urdu paired files
- Generate quality assessment reports
- Track evaluation metrics and statistics

## 🔧 Configuration

### **LLM Configuration**
Access the LLM Configuration page to:
- Add API providers (Anthropic, OpenAI, etc.)
- Configure models with custom parameters
- Create system prompts for different translation scenarios
- Monitor API key status and provider health

### **Environment Variables**
```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional
OPENAI_API_KEY=your_openai_api_key
CLAUDE_MODEL=claude-3-sonnet-20240229
```

## 📊 Features in Detail

### **Persistent Job Storage**
- Translation jobs are automatically saved to `/app/data/translation_jobs.json`
- Jobs persist through service restarts and deployments
- Complete job history with all metrics and results
- No data loss during updates or maintenance

### **File Classification System**
- **Arabic-only files**: Contain only Arabic text, need LLM translation
- **Arabic-Urdu pairs**: Contain both Arabic and Urdu, ready for evaluation
- Automatic detection based on presence of `translated_text` field
- Cross-page workflow integration

### **Quality Metrics**
- **Confidence Score**: LLM confidence in translation accuracy
- **Quality Score**: Overall translation quality assessment
- **Translation Time**: Processing time per segment
- **Length Ratio**: Comparison of original vs translated text length

### **Real-time Updates**
- Live progress tracking during translation
- Chunk-based processing with status updates
- Immediate UI updates without page refresh
- WebSocket-like polling for responsive experience

## 🔍 API Endpoints

### **Translation Service**
- `POST /translate/llm` - Start LLM translation
- `GET /translate/llm` - List all translation jobs
- `GET /translate/llm/job/{job_id}` - Get job status and results
- `POST /translate/llm/{job_id}/approve` - Approve translation
- `GET /translate/llm/metrics` - Get translation metrics

### **LLM Configuration**
- `GET /translate/llm/config` - Get current configuration
- `POST /translate/llm/config` - Update configuration
- `GET /translate/llm/config/providers` - List API providers
- `GET /translate/llm/config/models` - List available models
- `GET /translate/llm/config/prompts` - List system prompts
- `GET /translate/llm/config/logs` - Get configuration logs

### **File Management**
- `GET /files` - List uploaded files
- `POST /upload` - Upload new file
- `GET /files/{file_id}` - Get file details

### **Ground Truth**
- `GET /ground-truth` - List approved translations
- `POST /ground-truth` - Add approved translation

## 🐛 Troubleshooting

### **Common Issues**

1. **Translation jobs not appearing**
   - Check if jobs are being saved to `/app/data/translation_jobs.json`
   - Verify persistent storage is working

2. **LLM configuration not updating**
   - Check API key status in LLM Configuration page
   - Verify provider is active and has valid API key

3. **Files not uploading**
   - Check file format (JSON, SRT, TXT supported)
   - Verify file size limits

4. **Service not starting**
   - Check Docker logs: `docker-compose logs [service-name]`
   - Verify environment variables are set

### **Logs and Debugging**
```bash
# View all service logs
docker-compose logs

# View specific service logs
docker-compose logs translation-service

# Check persistent storage
docker exec translation-translation-service-1 cat /app/data/translation_jobs.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

## 🔄 Recent Updates

### **v2.0 - Enhanced LLM Configuration & Persistent Storage**
- ✅ **Persistent Job Storage**: Translation jobs now persist across restarts
- ✅ **Enhanced LLM Configuration**: Multi-provider support with UI management
- ✅ **File Classification System**: Smart detection of Arabic-only vs Arabic-Urdu pairs
- ✅ **Real-time Updates**: Live progress tracking and immediate UI updates
- ✅ **Quality Metrics**: Comprehensive translation quality assessment
- ✅ **Configuration Logging**: Complete audit trail for all changes

### **v1.0 - Core Translation System**
- ✅ **LLM Translation**: Claude AI-powered Arabic to Urdu translation
- ✅ **Ground Truth Management**: Approval system for translations
- ✅ **Evaluation System**: Quality assessment and metrics
- ✅ **Microservices Architecture**: Scalable and maintainable design

---

**Built with ❤️ for Arabic-Urdu translation and evaluation**

