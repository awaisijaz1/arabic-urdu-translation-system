# Translation Evaluation Tool - Usage Guide

## Overview

This comprehensive tool is designed for **Arabic-to-Urdu translation with AI-powered LLM capabilities**, evaluation, and refinement. It supports both existing translation review and AI-generated translations using Claude API, providing a complete translation workflow from file upload to ground truth storage.

## Quick Start

### 1. Configure Claude API Key

**Required for LLM translation features:**

```bash
# Method 1: Environment Variable (Recommended)
export ANTHROPIC_API_KEY="your-claude-api-key-here"

# Method 2: .env File
echo "ANTHROPIC_API_KEY=your-claude-api-key-here" > .env

# Method 3: Direct in Command
ANTHROPIC_API_KEY="your-key" docker-compose up -d
```

### 2. Start the System

```bash
# Clone the repository
git clone <repository-url>
cd Translation

# Start all services
./start.sh

# Or manually with Docker Compose
docker-compose up -d
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

### 4. Upload Files

The system accepts files in multiple ways:

#### File Upload Methods
1. **Drag & Drop**: Upload .srt or .json files directly
2. **URL Upload**: Provide direct links to .srt or .json files
3. **Browse Files**: Traditional file selection

#### Supported Formats

**SRT Format** (with existing translations):
```
1
00:00:01,000 --> 00:00:04,000
مرحبا بكم في الأخبار
خبروں میں خوش آمدید

2
00:00:04,500 --> 00:00:07,500
هذا تقرير إخباري من الشرق الأوسط
یہ مشرق وسطی سے ایک خبری رپورٹ ہے
```

**JSON Format** (with existing translations):
```json
{
  "metadata": {
    "title": "Arabic-Urdu News Broadcast",
    "language_pair": "ar-ur"
  },
  "segments": [
    {
      "start_time": "00:00:01.000",
      "end_time": "00:00:04.000",
      "original_text": "مرحبا بكم في الأخبار",
      "translated_text": "خبروں میں خوش آمدید"
    }
  ]
}
```

**For LLM Translation**: Upload files with only Arabic text (no existing translations)

## Architecture

### Microservices

1. **Input Service** (Port 8001)
   - Handles file uploads (.srt, .json)
   - **URL-based file downloads**
   - Parses files with or without existing translations
   - Validates file formats

2. **Translation Service** (Port 8002)
   - Reviews and validates existing translations
   - **LLM-powered translation using Claude API**
   - **Configurable system prompts**
   - **Quality metrics and confidence scoring**
   - Manages review workflows

3. **Evaluation Service** (Port 8003)
   - User authentication and authorization
   - Review management interface
   - Role-based access control

4. **Storage Service** (Port 8004)
   - Ground truth data storage
   - Export functionality (JSON, CSV, Excel)
   - Metrics and analytics

5. **API Gateway** (Port 8000)
   - Request routing and load balancing
   - Authentication middleware
   - Rate limiting

6. **Frontend** (Port 3000)
   - **Modern React-based web interface**
   - **Real-time translation progress**
   - **Interactive metrics dashboard**
   - **Professional UI with Tailwind CSS**

## 🧠 LLM Translation Features

### System Prompt Configuration

#### Method 1: Environment Variable
```bash
export CLAUDE_SYSTEM_PROMPT="Your custom system prompt here"
docker-compose up -d
```

#### Method 2: UI Configuration
1. Access the frontend at http://localhost:3000
2. Navigate to "Translation Jobs" tab
3. Click "Show Config" button
4. Edit the system prompt and save

#### Method 3: API Update
```bash
curl -X POST http://localhost:8000/translate/llm/config \
  -H "Content-Type: application/json" \
  -d '{"system_prompt": "Your custom prompt"}'
```

### Default System Prompt
The system comes with a comprehensive accuracy-focused prompt:
```
You are a highly skilled translator specializing in Arabic to Urdu translation. 
Your task is to translate the given Arabic text into Urdu with 100% accuracy. 
This requires careful attention to detail, cultural nuances, and linguistic precision.

To ensure 100% accuracy in your translation, follow these steps:
1. Read the entire Arabic text carefully to understand the context and meaning.
2. Translate the text sentence by sentence, paying close attention to grammar, vocabulary, and idiomatic expressions.
3. Consider any cultural references or nuances that may require special attention in translation.
4. Double-check your translation for any potential errors or misinterpretations.
5. Ensure that the Urdu translation maintains the tone and style of the original Arabic text.

Present your final Urdu translation within <urdu_translation> tags. 
If you have any notes or explanations about specific translation choices, 
include them after the translation within <translation_notes> tags.
```

### Claude Model Selection
Choose from different Claude models based on your needs:
- **Claude 3 Sonnet**: Balanced performance and speed (default)
- **Claude 3 Opus**: Highest performance, slower speed
- **Claude 3 Haiku**: Fastest speed, good performance

## API Endpoints

### Input Service

```bash
# Upload file with existing translations
POST /upload
Content-Type: multipart/form-data

# Upload file from URL
POST /upload/url
{
  "file_url": "https://example.com/file.srt"
}

# List uploaded files
GET /files

# Get file content
GET /files/{file_id}/content
```

### Translation Service

#### Traditional Review Endpoints
```bash
# Start review job
POST /review
{
  "file_id": "uuid",
  "segments": [...],
  "reviewer_id": "optional"
}

# Get review status
GET /status/{review_id}

# List all reviews
GET /reviews

# Cancel review
DELETE /reviews/{review_id}
```

#### 🧠 LLM Translation Endpoints (NEW)
```bash
# Start LLM translation job
POST /translate/llm
{
  "file_id": "uuid",
  "segments": [
    {
      "segment_id": "1",
      "original_text": "مرحبا بكم في الأخبار"
    }
  ]
}

# Get LLM translation status and results
GET /translate/llm/{job_id}

# List all LLM translation jobs
GET /translate/llm

# Update specific segment translation
POST /translate/llm/{job_id}/update
{
  "segment_id": "1",
  "translation": "Updated Urdu translation"
}

# Get LLM translation metrics
GET /translate/llm/metrics

# Get/Update LLM configuration
GET /translate/llm/config
POST /translate/llm/config
{
  "system_prompt": "Custom prompt",
  "model": "claude-3-sonnet-20240229"
}
```

### Evaluation Service

```bash
# User authentication
POST /auth/login
POST /auth/logout

# Review management
GET /evaluations
POST /evaluations/{review_id}/approve
POST /evaluations/{review_id}/reject
```

### Storage Service

```bash
# Ground truth management
GET /ground-truth
POST /ground-truth/export
GET /metrics

# Export in different formats
GET /export/json
GET /export/csv
GET /export/excel
```

## Workflows

### 1. Traditional Translation Review Workflow
1. **File Upload**: Upload SRT or JSON files with existing Arabic-Urdu translations
2. **System Review**: Automatic review of existing translations
3. **Human Evaluation**: Review flagged segments
4. **Ground Truth Storage**: Store approved translations

### 2. 🧠 LLM Translation Workflow (NEW)
1. **File Upload**: Upload files with Arabic text only
2. **LLM Configuration**: Set system prompt and model (optional)
3. **Start Translation**: Initiate AI-powered translation
4. **Monitor Progress**: Real-time progress tracking
5. **Review & Edit**: Review AI-generated translations
6. **Quality Assessment**: Check confidence scores and metrics
7. **Ground Truth Storage**: Store approved translations

### 3. Hybrid Workflow
1. **File Upload**: Upload files with partial translations
2. **LLM Translation**: Generate missing translations
3. **Human Review**: Review and edit all segments
4. **Quality Control**: Ensure consistency and accuracy
5. **Export**: Generate final translation files

## Configuration

### Environment Variables

```bash
# Required for LLM Translation
ANTHROPIC_API_KEY=your-claude-api-key-here

# Optional LLM Configuration
CLAUDE_SYSTEM_PROMPT="Your custom system prompt"
CLAUDE_MODEL=claude-3-sonnet-20240229

# Database
DATABASE_URL=sqlite:///./data/app.db

# Authentication
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256

# File Storage
UPLOAD_FOLDER=./uploads
MAX_FILE_SIZE=10485760

# Review Settings
QUALITY_THRESHOLD=0.7
REVIEW_TIMEOUT=3600
```

### Docker Configuration

```yaml
# docker-compose.yml
version: '3.8'
services:
  input-service:
    environment:
      - UPLOAD_FOLDER=/app/uploads
      - DATABASE_URL=sqlite:///./data/input.db
  
  translation-service:
    environment:
      - MODEL_PATH=/app/models
      - QUALITY_THRESHOLD=0.7
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your-key}
      - CLAUDE_SYSTEM_PROMPT=${CLAUDE_SYSTEM_PROMPT:-default-prompt}
```

## Development

### Local Development Setup

```bash
# Install dependencies
cd services/input-service && pip install -r requirements.txt
cd ../translation-service && pip install -r requirements.txt
cd ../evaluation-service && pip install -r requirements.txt
cd ../storage-service && pip install -r requirements.txt
cd ../api-gateway && pip install -r requirements.txt
cd ../../frontend && npm install

# Start services individually
cd services/input-service && python main.py
cd ../translation-service && python main.py
# ... repeat for other services

# Start frontend
cd frontend && npm start
```

### Testing

```bash
# Run tests for each service
cd services/input-service && python -m pytest
cd ../translation-service && python -m pytest
cd ../evaluation-service && python -m pytest
cd ../storage-service && python -m pytest

# Run frontend tests
cd frontend && npm test
```

## Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

### Metrics

```bash
# Get review statistics
curl http://localhost:8002/stats

# Get LLM translation metrics
curl http://localhost:8002/translate/llm/metrics

# Get evaluation metrics
curl http://localhost:8003/metrics

# Get storage metrics
curl http://localhost:8004/metrics
```

## Troubleshooting

### Common Issues

1. **LLM Translation Not Working**
   - Check if ANTHROPIC_API_KEY is set
   - Verify API key validity
   - Check translation service logs
   - Ensure Claude API access

2. **File Upload Fails**
   - Check file format (SRT or JSON)
   - Verify file size limits
   - Ensure proper encoding (UTF-8)
   - For URL uploads, check URL accessibility

3. **Review Jobs Not Starting**
   - Check translation service health
   - Verify file parsing
   - Check database connectivity

4. **Authentication Issues**
   - Verify JWT configuration
   - Check user credentials
   - Ensure proper CORS settings

5. **Frontend Not Loading**
   - Check React development server
   - Verify API gateway connectivity
   - Check browser console for errors

### Logs

```bash
# View service logs
docker-compose logs input-service
docker-compose logs translation-service
docker-compose logs evaluation-service
docker-compose logs storage-service
docker-compose logs api-gateway
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f translation-service
```

## Production Deployment

### Prerequisites

- Docker and Docker Compose
- PostgreSQL database
- SSL certificate
- Reverse proxy (nginx)
- **Valid Claude API key**

### Production Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: translation_eval
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: secure_password
    
  redis:
    image: redis:6-alpine
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
```

### Security Considerations

1. **Authentication**
   - Use strong JWT secrets
   - Implement rate limiting
   - Enable HTTPS

2. **Data Protection**
   - Encrypt sensitive data
   - Regular backups
   - Access logging

3. **Network Security**
   - Firewall configuration
   - VPN access
   - **Secure API key management**

4. **LLM Security**
   - **Store API keys securely**
   - **Monitor API usage**
   - **Implement rate limiting for LLM calls**

## Advanced Configuration

### Custom System Prompts

Create domain-specific prompts for better translation quality:

```bash
# Medical translation
export CLAUDE_SYSTEM_PROMPT="You are a medical translator specializing in Arabic to Urdu translation. Focus on medical terminology accuracy and patient safety."

# Legal translation
export CLAUDE_SYSTEM_PROMPT="You are a legal translator specializing in Arabic to Urdu translation. Maintain legal precision and formal language."

# Technical translation
export CLAUDE_SYSTEM_PROMPT="You are a technical translator specializing in Arabic to Urdu translation. Preserve technical accuracy and terminology consistency."
```

### Performance Tuning

```bash
# Adjust translation batch sizes
# Configure polling intervals for real-time updates
# Set quality thresholds for automatic approval
# Optimize Claude model selection based on use case
```

## Extending the System

### Adding New File Formats

1. Create new parser in `services/input-service/parsers.py`
2. Update `ParserFactory` class
3. Add format validation
4. Update documentation

### Custom Review Logic

1. Modify `TranslationReviewer` class
2. Implement custom validation rules
3. Add quality metrics
4. Update review thresholds

### Additional Export Formats

1. Add export handlers in storage service
2. Implement format converters
3. Update API endpoints
4. Add frontend support

### Custom LLM Integration

1. Modify `LLMTranslator` class
2. Add support for other LLM providers
3. Implement custom prompt templates
4. Add provider-specific configurations

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review service logs
3. Verify configuration
4. **Check Claude API status and usage**
5. Contact development team

## License

This project is licensed under the MIT License - see the LICENSE file for details. 