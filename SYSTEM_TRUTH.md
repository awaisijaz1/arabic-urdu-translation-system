# Translation System - Complete Truth File

## System Overview
This is a microservices-based Arabic-to-Urdu translation system with LLM integration, evaluation capabilities, and ground truth management. The system uses Docker containers, React frontend, FastAPI backends, and supports multiple LLM providers (Anthropic Claude, OpenAI/Azure OpenAI).

## Architecture

### Microservices Structure
```
Translation/
├── frontend/                    # React frontend (port 3000)
├── services/
│   ├── api-gateway/            # Main API router (port 8000)
│   ├── input-service/          # File upload/management (port 8001)
│   ├── translation-service/    # LLM translation (port 8002)
│   ├── evaluation-service/     # Translation evaluation (port 8003)
│   └── storage-service/        # Ground truth storage (port 8004)
├── docker-compose.yml          # Container orchestration
├── data/                       # Persistent data storage
│   ├── llm_config.json        # LLM configuration (excluded from git)
│   └── translation_jobs.json  # Job persistence
└── uploads/                    # File uploads (excluded from git)
```

### Container Dependencies
- **frontend** → **api-gateway** (port 8000)
- **api-gateway** → all services (8001-8004)
- All services are independent and communicate via HTTP

## Core Features

### 1. File Management & Classification
**Location**: `frontend/src/utils/fileClassification.js`

**File Types**:
- **Arabic-only**: Files with `original_text` only → "Ready for LLM translation"
- **Arabic-Urdu pairs**: Files with both `original_text` and `translated_text` → "Ready for evaluation"

**Classification Logic**:
```javascript
export const getFileClassification = (fileContent) => {
  // Handles both segments array and full file content object
  let segments = Array.isArray(fileContent) ? fileContent : fileContent.segments;
  
  const hasTranslations = segments.every(segment => 
    segment.original_text && 
    segment.translated_text && 
    segment.translated_text.trim() !== ''
  );
  
  return hasTranslations ? 'arabic_urdu_pairs' : 'arabic_only';
};
```

### 2. LLM Translation System
**Location**: `services/translation-service/`

**Key Components**:
- **Main API**: `main.py` - FastAPI endpoints
- **Translation Engine**: `langchain_translator.py` - LangChain integration
- **Persistent Storage**: `PersistentJobStorage` class for job data

**LLM Configuration** (Dynamic, UI-configurable):
```python
# Stored in /app/data/llm_config.json
{
  "current_config": {
    "provider": "anthropic|OpenAI",
    "model": "claude-3-sonnet-20240229|gpt-4|gpt-4o",
    "system_prompt": "Custom translation prompt",
    "temperature": 0.1,
    "max_tokens": 1000
  },
  "api_providers": {
    "anthropic": {"api_key": "...", "is_active": true},
    "openai": {"api_key": "...", "base_url": "...", "is_active": true}
  }
}
```

**Translation Flow**:
1. File uploaded → Input Service
2. User selects file → Translation Service
3. File classified (Arabic-only vs Arabic-Urdu pairs)
4. If Arabic-Urdu: Show modal (use existing vs generate new)
5. LLM processes segments in chunks
6. Real-time status updates via polling
7. Results stored with metrics (confidence, quality, time)

### 3. Job Management & Persistence
**Location**: `services/translation-service/langchain_translator.py`

**Job Structure**:
```python
class TranslationJob:
    job_id: str
    file_id: str
    status: str  # "in_progress", "completed", "failed", "approved"
    total_segments: int
    completed_segments: int
    segments: List[TranslationSegment]
    created_at: str
    updated_at: str
    
class TranslationSegment:
    segment_id: str
    original_text: str
    llm_translation: str
    confidence_score: float
    quality_score: float
    translation_time: float
    is_edited: bool = False  # Manual edit tracking
    edited_at: str = None    # Edit timestamp
```

**Persistence**: Jobs saved to `/app/data/translation_jobs.json` to survive service restarts.

### 4. Real-time Updates & Status Management
**Frontend Polling**:
- `llmJobs` query: `refetchInterval: 2000ms` for job list updates
- `llmJob` query: `refetchInterval: 1000ms` for active job details
- Toast notifications for completion/failure
- Automatic job list refresh on status changes

**Status Flow**:
```
"in_progress" → "completed" (success) → "approved" (user action)
              → "failed" (error)
```

### 5. Ground Truth Management
**Location**: `services/storage-service/`

**Approval Process**:
1. User reviews completed translation job
2. Can edit individual segments (marked as `is_edited: true`)
3. Approves entire job → moves to ground truth
4. Segments marked as "approved" or "edited" based on modification status
5. Includes approval comments and timestamps

## UI/UX Design System

### **Modern Visual Design Language**
All pages now follow a consistent design system with:

#### **Color Palette**:
- **Primary Gradients**: Blue (#3B82F6) to Purple (#8B5CF6) to Indigo (#6366F1)
- **Success**: Green (#10B981) variations
- **Warning**: Orange (#F97316) variations  
- **Info**: Indigo (#6366F1) variations
- **Neutral**: Professional gray scales with white/glass morphism

#### **Design Components**:
- **Glass Morphism**: `bg-white/80 backdrop-blur-sm` for cards and modals
- **Gradient Headers**: Consistent hero banners across all pages
- **Animated Counters**: Smooth counting animations for metrics
- **Status Badges**: Color-coded with icons for all status types
- **Hover Effects**: Scale, shadow, and color transitions
- **Professional Icons**: Contextual Lucide React icons throughout

#### **Layout System**:
- **Grid Layouts**: Responsive 4-column grids for optimal space usage
- **Sticky Headers**: Table headers remain visible during scrolling
- **Proper Scrolling**: `max-h-[32rem] overflow-y-auto` for contained areas
- **Responsive Design**: Mobile-first approach with breakpoint considerations

### **Page-Specific Design**

#### **Dashboard Page** (`frontend/src/components/Dashboard.js`):
- **Hero Section**: Gradient background with animated icons (Sparkles, Brain)
- **Performance Gauges**: Circular progress indicators with animated counters
- **Quick Stats Cards**: 4 gradient cards with hover animations and real-time data
- **Activity Section**: Recent jobs and system performance with progress bars
- **Enhanced Quick Actions**: Gradient buttons with scale effects and clear icons

#### **Translation Jobs Page** (`frontend/src/components/TranslationJobs.js`):
- **Consistent Hero Header**: Matching dashboard design with Brain and Sparkles icons
- **Metrics Dashboard**: 5 professional cards with animated counters and consistent styling
- **4-Column Layout**: File selection (25%) + Translation jobs display (75%)
- **LLM Configuration**: Tabbed interface with comprehensive provider/model management
- **Real-time Updates**: Enhanced polling with toast notifications and status tracking
- **Modern Job Cards**: Glass morphism with progress rings and status badges

#### **Ground Truth Page** (`frontend/src/components/GroundTruth.js`):
- **Redesigned Statistics**: 5 consistent white cards with colored icons (not gradients)
- **Unified Dataset View**: Single table showing all segments instead of file-grouped cards
- **Enhanced Filtering**: Multi-level filters (file selection + search + status)
- **Complete Data Display**: File, Original, Translation, Approved Translation, Confidence, Status, Comments, Date
- **Professional Table**: Sticky headers, proper scrolling, RTL text direction support
- **Smart Search**: Searches across all text fields and file names

#### **Evaluation Page** (`frontend/src/components/Evaluation.js`):
- **Consistent Hero Banner**: Matching design with Target and Award icons for evaluation theme
- **Real-time Statistics Dashboard**: 5 professional metric cards (Total, Approved, Edited, Rejected, Progress)
- **4-Column Layout**: File selection panel (25%) + Evaluation interface (75%)
- **Advanced File Selection**: Glass morphism cards with hover effects, refresh functionality, and empty states
- **Professional Evaluation Interface**: 
  - **Gradient Content Cards**: Separate styled cards for Original (gray), Translated (blue), Approved (green), Notes (yellow)
  - **Enhanced Navigation**: Larger segment indicators with color-coded status and hover effects
  - **Modern Action Buttons**: Centered layout with gradient styling and scale transforms
  - **Progress Tracking**: Animated progress bar and circular progress ring
- **Preserved Functionality**: All original API connections, state management, and evaluation workflow intact
- **Interactive Elements**: Animated counters, status badges, progress rings, and smooth transitions
- **RTL Support**: Proper right-to-left text display for Arabic and Urdu content

### **Navigation & Layout**

#### **Navbar** (`frontend/src/components/Navbar.js`):
- **Increased Height**: `h-20` for better proportions
- **Resolved Overlaps**: Proper spacing and responsive text display
- **Health Indicator**: Positioned at extreme right with visual separation
- **Responsive Elements**: Hide/show text based on screen size
- **Professional Styling**: Consistent with overall design language

#### **App Container** (`frontend/src/App.js`):
- **Proper Scrolling**: `flex flex-col` layout with `overflow-y-auto`
- **Background Gradients**: Consistent across all pages
- **Z-index Management**: Proper layering for modals and overlays

## API Endpoints

### Translation Service (Port 8002)
```python
# Job Management
POST   /translate/llm                    # Start translation job
GET    /translate/llm/job/{job_id}       # Get job details  
POST   /translate/llm/{job_id}/update    # Update segment
POST   /translate/llm/{job_id}/approve   # Approve job
GET    /translate/llm/jobs               # List all jobs
GET    /translate/llm/metrics            # Get metrics

# LLM Configuration  
GET    /translate/llm/config             # Get full config
POST   /translate/llm/config             # Update config
GET    /translate/llm/config/providers   # Get providers
GET    /translate/llm/config/models      # Get models
GET    /translate/llm/config/prompts     # Get prompts
GET    /translate/llm/config/logs        # Get change logs
GET    /translate/llm/config/providers/{id} # Get provider details
```

### Storage Service (Port 8004)
```python
POST   /ground-truth                     # Store ground truth
GET    /ground-truth                     # Get ground truth
GET    /ground-truth/export              # Export data
```

### Input Service (Port 8001)
```python
POST   /files/upload                     # Upload file
GET    /files                            # List files
GET    /files/{file_id}/content          # Get file content
```

### Evaluation Service (Port 8003)
```python
POST   /evaluations                      # Save evaluation results
GET    /evaluations                      # Get evaluation data
GET    /evaluations/{file_id}            # Get file-specific evaluations
```

## Data Flow

### Translation Workflow
```
1. File Upload (Input Service)
   ↓
2. File Classification (Frontend)
   ↓
3. Translation Job Creation (Translation Service)
   ↓
4. LLM Processing with Real-time Updates
   ↓
5. Results Display with Metrics
   ↓
6. User Review & Approval
   ↓
7. Ground Truth Storage (Storage Service)
```

### Error Handling & Status Management
```python
# Translation Service Error Handling
try:
    # Process chunk
    result = llm.invoke(messages)
    segment.llm_translation = result.content
    segment.status = "completed"
except Exception as e:
    segment.llm_translation = f"[Translation failed: {str(e)}]"
    segment.status = "failed"
    any_chunks_failed = True

# Job status determination
if any_chunks_failed:
    job.status = "failed"
else:
    job.status = "completed"
```

## Configuration Management

### LLM Configuration Persistence
**Location**: `/app/data/llm_config.json`

**Structure**:
```json
{
  "current_config": {
    "provider": "anthropic",
    "model": "claude-3-sonnet-20240229", 
    "system_prompt": "Translation prompt...",
    "temperature": 0.1,
    "max_tokens": 1000
  },
  "api_providers": {
    "anthropic": {
      "api_key": "sk-...",
      "is_active": true
    },
    "openai": {
      "api_key": "...",
      "base_url": "https://api.openai.com/v1",
      "is_active": true
    }
  },
  "models": [
    {
      "id": "claude-3-sonnet",
      "name": "Claude 3 Sonnet",
      "provider": "anthropic"
    }
  ],
  "system_prompts": [
    {
      "id": "default",
      "name": "Default Translation",
      "content": "You are a translator..."
    }
  ],
  "logs": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "user": "admin",
      "action": "update_config",
      "details": "Changed model to gpt-4"
    }
  ]
}
```

### Azure OpenAI Support
```python
# langchain_translator.py
if provider_config and provider_config.base_url:
    self.model = ChatOpenAI(
        model=model_config.model_name,
        api_key=api_key,
        base_url=provider_config.base_url,  # Azure endpoint
        temperature=current_config.temperature,
        max_tokens=current_config.max_tokens
    )
```

## Error Handling

### Frontend Error Management
- **React Query**: Automatic retry and error boundaries
- **Toast Notifications**: User-friendly error messages
- **Validation**: Form validation and input sanitization
- **Loading States**: Proper loading indicators and disabled states

### Backend Error Handling
- **Translation Failures**: Graceful degradation with error messages
- **API Rate Limits**: Proper error responses and retry logic
- **Configuration Errors**: Validation and fallback configurations
- **Job Persistence**: Atomic operations and data consistency

## File Structure

### Critical Files
```
frontend/src/
├── components/
│   ├── Dashboard.js           # Modern dashboard with gauges
│   ├── TranslationJobs.js     # Enhanced translation interface  
│   ├── GroundTruth.js        # Redesigned ground truth management
│   ├── Evaluation.js         # Modern evaluation interface with redesigned UI
│   └── Navbar.js             # Fixed navigation with proper spacing
├── utils/
│   └── fileClassification.js # File type detection logic
└── App.js                    # Main app with proper scrolling

services/translation-service/
├── main.py                   # FastAPI endpoints with persistence
├── langchain_translator.py   # LLM integration with job storage
└── requirements.txt          # Updated dependencies

data/
├── llm_config.json          # Persistent LLM configuration
└── translation_jobs.json    # Job persistence across restarts
```

## Git Configuration

### Excluded Files (.gitignore)
```
venv1/
uploads/
exports/
data/llm_config.json
temp_config.json
temp_llm_config.json
test_*.py
simple_test.py
```

## Troubleshooting

### Common Issues
1. **UI Goes Blank**: Check browser console for JavaScript errors
2. **Translation Fails**: Verify API keys and LLM configuration
3. **Jobs Lost on Restart**: Ensure `translation_jobs.json` has write permissions
4. **Configuration Reset**: Check `llm_config.json` file permissions and format
5. **Navbar Overlap**: Clear browser cache after UI updates

### Performance Optimization
- **Frontend**: React Query caching and optimistic updates
- **Backend**: Chunk-based processing and async operations
- **Database**: JSON file-based storage with atomic writes
- **Real-time Updates**: Optimized polling intervals and selective refreshes

## Security

### API Security
- **Environment Variables**: Sensitive data in environment files
- **Git Exclusions**: API keys and configuration files excluded
- **Input Validation**: Sanitization of user inputs
- **CORS**: Proper cross-origin request handling

## Recent Updates

### UI/UX Redesign (Latest)
- **Complete Visual Overhaul**: All pages redesigned with modern UI
- **Consistent Design Language**: Glass morphism, gradients, and professional styling
- **Enhanced User Experience**: Better navigation, filtering, and data display
- **Performance Improvements**: Optimized rendering and real-time updates
- **Responsive Design**: Mobile-first approach with proper breakpoints

### Evaluation Page Complete Redesign (Latest)
- **Stunning Visual Transformation**: Complete UI overhaul with modern design language
- **Consistent Hero Banner**: Matching design with Target/Award icons and professional gradient
- **Real-time Statistics Dashboard**: 5 animated metric cards (Total, Approved, Edited, Rejected, Progress)
- **Enhanced 4-Column Layout**: Optimized file selection (25%) and evaluation interface (75%)
- **Professional File Selection**: Glass morphism cards with hover effects and interactive states
- **Advanced Evaluation Interface**: Gradient content cards with color-coded workflow
- **Modern Action Buttons**: Centered layout with gradient styling and smooth animations
- **Enhanced Navigation**: Larger segment indicators with color-coded status and hover effects
- **100% Functionality Preserved**: All API connections, state management, and workflows intact
- **Improved User Experience**: Animated counters, progress rings, and professional styling

### Ground Truth Page Fixes
- **Consistent Metric Colors**: White cards with colored icons instead of gradients
- **Working Filters**: Multi-level filtering with file selection, search, and status
- **Accurate Average Confidence**: Fixed calculation logic
- **Visible Dates**: Proper date display with fallback logic
- **Unified Dataset View**: Single table instead of file-grouped cards
- **Approval Comments**: Restored comments and notes columns

### Translation System Enhancements
- **Persistent Job Storage**: Jobs survive service restarts
- **Enhanced Error Handling**: Proper failed job status and metrics
- **Real-time Updates**: Improved polling and notifications
- **Edit Tracking**: Manual segment edits tracked and displayed
- **Metrics Accuracy**: Fixed calculation for averages and totals

### Configuration Management
- **UI-Based Configuration**: Complete LLM setup through interface
- **Persistent Storage**: Configuration survives restarts
- **Multi-Provider Support**: Anthropic, OpenAI, Azure OpenAI
- **Change Logging**: All configuration changes tracked

This system provides a comprehensive, production-ready translation platform with modern UI/UX, robust error handling, and persistent data management. 