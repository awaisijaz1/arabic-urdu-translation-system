# Translation Evaluation Tool for Arabic–Urdu Broadcast Translation

A comprehensive microservices-based tool for Arabic-to-Urdu translation with AI-powered LLM translation capabilities, evaluation, and refinement. The system supports both existing translation review and AI-generated translations using Claude API.

## 🏗️ Architecture

The system consists of the following microservices:

- **Input Service** - Handles file uploads (.srt, .json) with existing translations and URL-based uploads
- **Translation Service** - Manages translation review, validation, and **LLM-powered translation using Claude API**
- **Evaluation Service** - Web interface for human evaluators to review translations
- **Storage Service** - Data persistence and ground truth management
- **API Gateway** - Request routing and load balancing
- **Frontend** - React-based web interface with modern UI

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for local development)
- **Claude API Key** (for LLM translation features)

### Running with Docker Compose
```bash
# Clone and navigate to the project
cd Translation

# Configure Claude API Key (required for LLM translation)
export ANTHROPIC_API_KEY="your-claude-api-key-here"

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API Gateway: http://localhost:8000
```

### Local Development
```bash
# Install dependencies for each service
cd services/input-service && pip install -r requirements.txt
cd ../translation-service && pip install -r requirements.txt
cd ../evaluation-service && pip install -r requirements.txt
cd ../storage-service && pip install -r requirements.txt
cd ../api-gateway && pip install -r requirements.txt
cd ../../frontend && npm install

# Start services (in separate terminals)
# Each service can be started individually for development
```

## 📁 Project Structure

```
Translation/
├── services/
│   ├── input-service/          # File upload and parsing (with existing translations + URL uploads)
│   ├── translation-service/     # Translation review, validation, and LLM translation
│   ├── evaluation-service/      # Evaluation interface
│   ├── storage-service/         # Data persistence
│   └── api-gateway/            # Request routing
├── frontend/                   # React web interface with modern UI
├── docker-compose.yml          # Service orchestration
├── docker-compose.dev.yml      # Development configuration
└── README.md                   # This file
```

## 🔧 Configuration

### Environment Variables

#### Required Configuration
- **ANTHROPIC_API_KEY**: Your Claude API key for LLM translation features

#### Optional Configuration
- **CLAUDE_SYSTEM_PROMPT**: Custom system prompt for translation (defaults to accuracy-focused prompt)
- **JWT_SECRET**: Secret key for authentication
- **DATABASE_URL**: Database connection string

### API Key Configuration

#### Method 1: Environment Variable (Recommended)
```bash
export ANTHROPIC_API_KEY="your-claude-api-key-here"
docker-compose up -d
```

#### Method 2: .env File
Create a `.env` file in the root directory:
```bash
ANTHROPIC_API_KEY=your-claude-api-key-here
```

#### Method 3: Direct in Command
```bash
ANTHROPIC_API_KEY="your-key" docker-compose up -d
```

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

### Database
- **Development**: SQLite (file-based)
- **Production**: PostgreSQL (recommended)

## 📊 Features

### Core Features
- ✅ File input support (.srt, .json) with existing translations
- ✅ **URL-based file uploads** (supports .srt and .json files from URLs)
- ✅ Translation review and validation
- ✅ Human evaluation interface
- ✅ Ground truth storage
- ✅ Export functionality (JSON, CSV, Excel)
- ✅ Basic authentication
- ✅ Real-time updates

### 🧠 LLM Translation Features (NEW)
- ✅ **AI-powered Arabic to Urdu translation** using Claude API
- ✅ **Configurable system prompts** for translation accuracy
- ✅ **Multiple Claude models** (Sonnet, Opus, Haiku)
- ✅ **Real-time translation progress** with live updates
- ✅ **Translation quality metrics** and confidence scoring
- ✅ **Side-by-side comparison** of original and translated text
- ✅ **Edit capabilities** for AI-generated translations
- ✅ **Performance benchmarks** and translation time tracking
- ✅ **Batch processing** of multiple segments

### UI/UX Features
- ✅ **Modern, responsive design** with Tailwind CSS
- ✅ **Professional color scheme** with purple/blue gradients
- ✅ **Interactive metrics dashboard** with real-time statistics
- ✅ **File upload with drag-and-drop** and URL input
- ✅ **Progress indicators** and loading states
- ✅ **Toast notifications** for user feedback
- ✅ **Mobile-responsive** interface

## 🔐 Security

- Basic authentication for evaluators
- Role-based access control
- Audit logging for all changes
- **Secure API key management** through environment variables

## 📈 Monitoring

- Service health checks
- Translation quality metrics
- Reviewer feedback statistics
- **LLM translation performance metrics**
- **API usage tracking**

## 🎯 Usage Workflows

### 1. File Upload Workflow
1. Navigate to "File Upload" tab
2. Choose between drag-and-drop or URL upload
3. Select .srt or .json file
4. File is parsed and segments are extracted

### 2. LLM Translation Workflow
1. Navigate to "Translation Jobs" tab
2. Configure LLM settings (optional)
3. Select a file for translation
4. Click "Start LLM Translation"
5. Monitor real-time progress
6. Review and edit translations as needed

### 3. Evaluation Workflow
1. Navigate to "Evaluation" tab
2. Select a file to evaluate
3. Review segments one by one
4. Approve, reject, or edit translations
5. Submit evaluation results

### 4. Ground Truth Management
1. Navigate to "Ground Truth" tab
2. View approved translations
3. Export data in various formats
4. Filter and search through data

## 🔧 Advanced Configuration

### Custom System Prompts
The system comes with a comprehensive default prompt focused on 100% accuracy. You can customize it for specific domains:

```bash
# Example: Medical translation prompt
export CLAUDE_SYSTEM_PROMPT="You are a medical translator specializing in Arabic to Urdu translation. Focus on medical terminology accuracy and patient safety."

# Example: Legal translation prompt
export CLAUDE_SYSTEM_PROMPT="You are a legal translator specializing in Arabic to Urdu translation. Maintain legal precision and formal language."
```

### Model Selection
Choose from different Claude models based on your needs:
- **Claude 3 Sonnet**: Balanced performance and speed (default)
- **Claude 3 Opus**: Highest performance, slower speed
- **Claude 3 Haiku**: Fastest speed, good performance

### Performance Tuning
- Adjust translation batch sizes
- Configure polling intervals for real-time updates
- Set quality thresholds for automatic approval

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

