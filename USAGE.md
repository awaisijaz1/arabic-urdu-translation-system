# Usage Guide - Arabic-Urdu Translation and Evaluation System

This comprehensive guide will walk you through all the features and workflows of the Arabic-Urdu Translation and Evaluation System.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [File Upload and Processing](#file-upload-and-processing)
3. [LLM Translation Workflow](#llm-translation-workflow)
4. [LLM Configuration Management](#llm-configuration-management)
5. [Translation Approval Process](#translation-approval-process)
6. [Evaluation System](#evaluation-system)
7. [Ground Truth Management](#ground-truth-management)
8. [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose installed
- Anthropic API key (or other supported LLM provider)
- Modern web browser

### Initial Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/awaisijaz1/arabic-urdu-translation-system.git
   cd arabic-urdu-translation-system
   ```

2. **Configure API keys**
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

## 📁 File Upload and Processing

### Supported File Formats
- **JSON**: Structured data with segments
- **SRT**: Subtitle files
- **TXT**: Plain text files

### Upload Process
1. Navigate to the **File Upload** tab
2. Choose upload method:
   - **Drag and Drop**: Drag files directly onto the upload area
   - **File Browser**: Click to select files
   - **URL Upload**: Enter file URL for remote files
3. Select your Arabic file
4. Wait for processing to complete
5. View file details and classification

### File Classification
The system automatically classifies files as:

#### **Arabic-only Files** 🔵
- Contain only Arabic text
- Need LLM translation to generate Urdu
- Status: "Ready for LLM translation"
- Workflow: Upload → LLM Translation → Arabic-Urdu pairs

#### **Arabic-Urdu Pairs** 🟢
- Contain both Arabic and Urdu text
- Ready for evaluation
- Status: "Ready for evaluation"
- Workflow: Upload → Direct to evaluation

## 🤖 LLM Translation Workflow

### Starting a Translation Job

1. **Navigate to Translation Jobs**
   - Go to the **Translation Jobs** tab
   - View available files for translation

2. **Select a File**
   - Choose an Arabic-only file
   - View file details and segment count
   - Check file classification status

3. **Configure Translation Settings** (Optional)
   - Click "LLM Configuration" to adjust settings
   - Select different models or providers
   - Customize system prompts

4. **Start Translation**
   - Click "Start LLM Translation"
   - Monitor real-time progress
   - View chunk-based processing

### Monitoring Progress

#### **Real-time Updates**
- **Progress Bar**: Shows overall completion percentage
- **Chunk Progress**: Individual chunk processing status
- **Segment Counter**: Completed segments vs total
- **Quality Metrics**: Live confidence and quality scores

#### **Status Indicators**
- 🔵 **Pending**: Job created, waiting to start
- 🟡 **In Progress**: Currently processing
- 🟢 **Completed**: Translation finished
- 🔴 **Failed**: Error occurred
- ✅ **Approved**: Moved to ground truth

### Translation Results

#### **Quality Metrics**
- **Confidence Score**: LLM confidence (0-1)
- **Quality Score**: Overall translation quality (0-1)
- **Translation Time**: Processing time per segment
- **Length Ratio**: Original vs translated text ratio

#### **Review and Edit**
- **Side-by-side View**: Original Arabic and translated Urdu
- **Individual Editing**: Click any segment to edit
- **Bulk Actions**: Approve, reject, or edit multiple segments
- **Quality Assessment**: Review confidence and quality scores

## ⚙️ LLM Configuration Management

### Accessing Configuration
1. Navigate to **LLM Configuration** tab
2. View current settings and status
3. Access different configuration sections

### API Provider Management

#### **Adding New Providers**
1. Go to **API Providers** tab
2. Click "Add Provider"
3. Fill in provider details:
   - **Provider ID**: Unique identifier (e.g., "anthropic")
   - **Name**: Display name (e.g., "Anthropic")
   - **API Key**: Your API key
   - **Base URL**: Optional custom endpoint
4. Click "Add Provider"

#### **Managing Existing Providers**
- **Status**: Active/Inactive toggle
- **API Key Status**: Configured/Not configured
- **Last Updated**: Timestamp of last change

### Model Management

#### **Available Models**
- **Claude 3 Sonnet**: Balanced performance and speed
- **Claude 3 Opus**: Highest performance, slower speed
- **Claude 3 Haiku**: Fastest speed, good performance
- **GPT-4**: OpenAI's most capable model
- **GPT-3.5 Turbo**: Fast and cost-effective

#### **Adding Custom Models**
1. Go to **Models** tab
2. Click "Add Model"
3. Configure model parameters:
   - **Provider**: Select API provider
   - **Model ID**: Technical identifier
   - **Name**: Display name
   - **Description**: Model description
   - **Max Tokens**: Maximum output length
   - **Temperature**: Creativity level (0-2)
4. Click "Add Model"

### System Prompt Management

#### **Default Prompts**
- **Standard Translation**: General-purpose translation
- **News Translation**: Journalistic accuracy focus
- **Technical Translation**: Technical terminology focus

#### **Creating Custom Prompts**
1. Go to **System Prompts** tab
2. Click "Add Prompt"
3. Configure prompt details:
   - **Name**: Prompt identifier
   - **Description**: Purpose and use case
   - **Content**: The actual system prompt
   - **Default**: Set as default prompt
4. Click "Add Prompt"

### Configuration Logs
- **Change History**: All configuration modifications
- **User Attribution**: Who made changes
- **Timestamp**: When changes occurred
- **Details**: What was changed

## ✅ Translation Approval Process

### Reviewing Translations

1. **Access Completed Jobs**
   - Go to **Translation Jobs** tab
   - Find jobs with "Completed" status
   - Click "View" to see details

2. **Review Individual Segments**
   - **Original Text**: Arabic source
   - **Translated Text**: Urdu translation
   - **Confidence Score**: LLM confidence
   - **Quality Score**: Overall quality assessment

3. **Edit if Needed**
   - Click any segment to edit
   - Modify translation text
   - Save changes
   - Continue reviewing

### Approving Translations

1. **Bulk Approval**
   - Select multiple segments
   - Click "Approve Selected"
   - Confirm approval

2. **Individual Approval**
   - Click "Approve" on individual segments
   - Add approval notes if needed

3. **Approval Details**
   - **Approver**: Your username
   - **Notes**: Optional comments
   - **Timestamp**: When approved
   - **Status**: Moved to ground truth

### Approval Workflow
```
Translation Job → Review → Edit (optional) → Approve → Ground Truth
```

## 📊 Evaluation System

### Starting Evaluation

1. **Select Files for Evaluation**
   - Go to **Evaluation** tab
   - View Arabic-Urdu paired files
   - Select file to evaluate

2. **Evaluation Interface**
   - **Side-by-side View**: Arabic and Urdu text
   - **Quality Metrics**: Confidence and quality scores
   - **Evaluation Options**: Approve, reject, edit

3. **Evaluation Process**
   - Review each segment individually
   - Assess translation quality
   - Provide feedback and scores
   - Submit evaluation results

### Evaluation Metrics
- **Accuracy**: Translation correctness
- **Fluency**: Natural language flow
- **Completeness**: All content translated
- **Overall Score**: Combined assessment

## 🗄️ Ground Truth Management

### Viewing Ground Truth
1. Navigate to **Ground Truth** tab
2. View all approved translations
3. Filter and search through data
4. Export in various formats

### Ground Truth Features
- **Complete History**: All approved translations
- **Quality Metrics**: Confidence and quality scores
- **Approval Details**: Who approved and when
- **Export Options**: JSON, CSV, Excel formats

### Data Export
- **JSON Export**: Structured data format
- **CSV Export**: Spreadsheet compatibility
- **Excel Export**: Microsoft Excel format
- **Filtered Export**: Export selected data only

## 🔧 Troubleshooting

### Common Issues and Solutions

#### **Translation Jobs Not Appearing**
**Problem**: Jobs disappear after service restart
**Solution**: 
- Check persistent storage: `docker exec translation-translation-service-1 cat /app/data/translation_jobs.json`
- Verify jobs are being saved correctly
- Check service logs: `docker-compose logs translation-service`

#### **LLM Configuration Not Updating**
**Problem**: Configuration changes not taking effect
**Solution**:
- Check API key status in LLM Configuration
- Verify provider is active
- Check API key validity
- Review configuration logs

#### **Files Not Uploading**
**Problem**: Upload fails or files not processed
**Solution**:
- Check file format (JSON, SRT, TXT supported)
- Verify file size limits
- Check file encoding (UTF-8 recommended)
- Review upload service logs

#### **Service Not Starting**
**Problem**: Docker containers fail to start
**Solution**:
- Check Docker logs: `docker-compose logs`
- Verify environment variables
- Check port conflicts
- Ensure Docker has sufficient resources

### Debugging Commands

#### **Service Health Check**
```bash
# Check all services
docker-compose ps

# Check specific service
docker-compose logs translation-service

# Check persistent storage
docker exec translation-translation-service-1 ls -la /app/data/
```

#### **API Testing**
```bash
# Test API gateway
curl http://localhost:8000/health

# Test translation service
curl http://localhost:8000/translate/llm

# Test file upload
curl -X POST http://localhost:8000/upload -F "file=@your_file.json"
```

#### **Configuration Verification**
```bash
# Check LLM configuration
curl http://localhost:8000/translate/llm/config

# Check API providers
curl http://localhost:8000/translate/llm/config/providers

# Check models
curl http://localhost:8000/translate/llm/config/models
```

### Performance Optimization

#### **Translation Performance**
- **Batch Size**: Adjust chunk size for optimal performance
- **Model Selection**: Choose appropriate model for your needs
- **API Limits**: Monitor rate limits and usage
- **Caching**: Enable caching for repeated translations

#### **System Resources**
- **Memory**: Ensure sufficient RAM for large files
- **CPU**: Monitor CPU usage during translation
- **Storage**: Check available disk space
- **Network**: Stable internet connection for API calls

## 📈 Best Practices

### **File Preparation**
- Use UTF-8 encoding for Arabic text
- Clean and validate input data
- Structure JSON files properly
- Include segment IDs for tracking

### **Translation Quality**
- Review translations carefully before approval
- Use appropriate system prompts for your domain
- Monitor quality metrics and confidence scores
- Edit translations when needed

### **System Maintenance**
- Regular backups of persistent storage
- Monitor API usage and costs
- Update system prompts for better results
- Review configuration logs regularly

### **Workflow Optimization**
- Use file classification to streamline workflow
- Leverage existing translations when available
- Batch process similar files together
- Maintain consistent approval standards

---

**For additional support, create an issue on GitHub or check the troubleshooting section.** 