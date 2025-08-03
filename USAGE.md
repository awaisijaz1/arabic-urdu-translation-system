# Usage Guide - Arabic-Urdu Translation and Evaluation System

This comprehensive guide will walk you through all the features and workflows of the Arabic-Urdu Translation and Evaluation System with its modern, professional interface.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Modern Dashboard Overview](#modern-dashboard-overview)
3. [File Upload and Processing](#file-upload-and-processing)
4. [LLM Translation Workflow](#llm-translation-workflow)
5. [LLM Configuration Management](#llm-configuration-management)
6. [Translation Approval Process](#translation-approval-process)
7. [Ground Truth Management](#ground-truth-management)
8. [Evaluation System](#evaluation-system)
9. [UI/UX Features](#ui-ux-features)
10. [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose installed
- API key for supported LLM provider (Anthropic, OpenAI, or Azure OpenAI)
- Modern web browser with JavaScript enabled

### Initial Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/awaisijaz1/arabic-urdu-translation-system.git
   cd arabic-urdu-translation-system
   ```

2. **Configure API keys**
   ```bash
   # For Anthropic Claude
   echo "ANTHROPIC_API_KEY=sk-your-key-here" > .env
   
   # For OpenAI
   echo "OPENAI_API_KEY=your-key-here" > .env
   
   # For Azure OpenAI (add all required variables)
   echo "AZURE_OPENAI_API_KEY=your-key-here" >> .env
   echo "AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/" >> .env
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8000

## 🎯 Modern Dashboard Overview

### Dashboard Features
The dashboard provides a comprehensive overview with modern UI elements:

#### **Performance Gauges**
- **Circular Progress Indicators**: Visual representation of job completion rates
- **Animated Counters**: Smooth counting animations for all metrics
- **Real-time Updates**: Live data refreshes every few seconds
- **Hover Effects**: Interactive elements with smooth transitions

#### **Quick Stats Cards**
- **Total Files**: Number of uploaded files with file icon
- **Translation Jobs**: Completed translation jobs with brain icon
- **Evaluations**: Evaluation jobs completed with target icon
- **Ground Truth**: Approved segments in ground truth with shield icon

#### **Activity Tracking**
- **Recent Translation Jobs**: Latest 5 translation jobs with status
- **System Performance**: Processing speed, success rate, quality index
- **Quick Actions**: Direct access to upload, translate, evaluate, and view ground truth

#### **Visual Design**
- **Glass Morphism**: Semi-transparent cards with blur effects
- **Gradient Backgrounds**: Professional blue-purple-indigo gradients
- **Professional Icons**: Contextual Lucide React icons throughout
- **Responsive Layout**: Adapts to different screen sizes

## 📁 File Upload and Processing

### Supported File Formats
- **JSON**: Structured data with segments containing `original_text` and optionally `translated_text`
- **SRT**: Subtitle files with timestamps
- **TXT**: Plain text files (automatically segmented)

### File Classification System
The system automatically classifies uploaded files:

#### **Arabic-only Files**
- **Criteria**: Contains only `original_text` in Arabic
- **Status**: "Arabic-only - Ready for LLM translation"
- **Color**: Blue badge with Globe icon
- **Next Step**: LLM translation to generate Urdu translations

#### **Arabic-Urdu Pairs**
- **Criteria**: Contains both `original_text` (Arabic) and `translated_text` (Urdu)
- **Status**: "Arabic-Urdu pairs - Ready for evaluation"
- **Color**: Green badge with CheckCircle icon
- **Next Step**: Quality evaluation or use existing translations

### Upload Process
1. **Navigate to Dashboard**: Click "Upload Files" quick action button
2. **Drag & Drop or Browse**: Modern file upload interface with progress indicators
3. **Automatic Processing**: Files are parsed and classified immediately
4. **Status Display**: Real-time feedback with file size and processing status
5. **Classification Results**: Immediate display of file type and next steps

## 🔄 LLM Translation Workflow

### Enhanced Translation Interface
The translation page features a modern, professional design:

#### **Hero Header**
- **Gradient Background**: Consistent with dashboard design
- **Centered Title**: "LLM Translation Jobs" with Brain and Sparkles icons
- **Descriptive Subtitle**: Clear explanation of capabilities
- **Floating Config Button**: Easy access to LLM configuration

#### **Metrics Dashboard**
Five professional cards displaying:
- **Total Jobs**: All translation jobs with animated counter
- **Completed Jobs**: Successfully finished jobs
- **Success Rate**: Percentage of successful translations
- **Average Confidence**: Mean confidence score across all jobs
- **Average Time**: Mean processing time per job

#### **4-Column Layout**
- **File Selection (25%)**: File picker and job creation controls
- **Translation Jobs (75%)**: Wider area for job display and management

### Translation Process

#### **For Arabic-only Files**
1. **Select File**: Choose from dropdown of uploaded files
2. **File Status Display**: Shows "Ready for LLM translation" with blue badge
3. **Start Translation**: Click "Start LLM Translation" button
4. **Real-time Progress**: 
   - Progress ring showing completion percentage
   - Live segment count updates
   - Toast notifications for status changes
5. **Completion**: Automatic notification and job list refresh

#### **For Arabic-Urdu Pairs**
1. **Select File**: Choose file with existing translations
2. **Status Display**: Shows "Ready for evaluation" with green badge
3. **Translation Options Modal**:
   - **Use Existing**: Keep current translations and proceed to evaluation
   - **Generate New**: Override with fresh LLM translations
4. **Processing**: Same real-time updates as Arabic-only files

### Job Management
- **Status Tracking**: In Progress → Completed/Failed → Approved
- **Real-time Updates**: 1-second polling for active jobs, 2-second for job list
- **Toast Notifications**: Success/failure messages with details
- **Edit Capabilities**: Modify individual segments with change tracking
- **Metrics Display**: Confidence, quality, and timing for each segment

## ⚙️ LLM Configuration Management

### Tabbed Interface
The LLM configuration features a modern tabbed interface:

#### **Overview Tab**
- **Current Configuration**: Active provider, model, and system prompt
- **API Key Status**: Visual indicators for provider health
- **Quick Stats**: Number of providers, models, and prompts configured

#### **API Providers Tab**
- **Provider Management**: Add, edit, and configure multiple providers
- **Supported Providers**: Anthropic, OpenAI, Azure OpenAI
- **Status Indicators**: Active/inactive status with color coding
- **API Key Management**: Secure key storage and validation

#### **Models Tab**
- **Model Selection**: Choose from available models per provider
- **Dynamic Filtering**: Models filtered by selected provider
- **Custom Models**: Add new models with custom parameters
- **Model Details**: Temperature, max tokens, and other parameters

#### **System Prompts Tab**
- **Prompt Library**: Create and manage translation prompts
- **Template System**: Pre-built prompts for different scenarios
- **Custom Prompts**: Write specialized prompts for specific use cases
- **Version Control**: Track prompt changes and effectiveness

#### **Configuration Logs Tab**
- **Change History**: Complete audit trail of all configuration changes
- **User Tracking**: Who made what changes and when
- **Rollback Capability**: Ability to revert to previous configurations
- **Export/Import**: Backup and restore configuration settings

### Configuration Process
1. **Access Configuration**: Click floating config button or navigation menu
2. **Select Provider**: Choose from Anthropic, OpenAI, or Azure OpenAI
3. **Add API Key**: Securely store API credentials
4. **Choose Model**: Select appropriate model for your needs
5. **Set System Prompt**: Use default or create custom prompt
6. **Save Configuration**: Changes applied immediately
7. **Test Connection**: Verify provider connectivity and API key validity

## ✅ Translation Approval Process

### Enhanced Review Interface
The approval process features improved UI elements:

#### **Job Details Modal**
- **Glass Morphism Design**: Modern semi-transparent modal
- **Gradient Header**: Professional styling with job information
- **Segment Table**: Clean table with all translation details
- **Action Buttons**: Prominent approve/reject buttons

#### **Segment Editing**
- **Inline Editing**: Click to edit any translation segment
- **Change Tracking**: Edited segments marked with timestamp
- **Status Indicators**: Visual badges for approved/edited status
- **Validation**: Real-time validation of edits

### Approval Workflow
1. **Review Completed Job**: Click "View" button on completed translation
2. **Examine Segments**: Review original text, LLM translation, and metrics
3. **Edit if Needed**: Click on any translation to modify
4. **Add Comments**: Optional notes for approval or changes
5. **Approve Translation**: Click "Approve Translation" button
6. **Ground Truth Storage**: Approved segments automatically moved to ground truth
7. **Status Tracking**: Segments marked as "approved" or "edited" based on modifications

## 📊 Ground Truth Management

### Redesigned Interface
The Ground Truth page features a complete visual overhaul:

#### **Consistent Hero Banner**
- **Matching Design**: Same gradient and layout as other pages
- **Database and Shield Icons**: Representing data security and quality
- **Professional Subtitle**: Clear description of ground truth capabilities

#### **Statistics Dashboard**
Five consistent white cards with colored icons:
- **Total Segments**: All segments in ground truth with blue Table icon
- **Approved**: Auto-approved segments with green CheckCircle icon
- **Edited**: Manually edited segments with orange Edit3 icon
- **Files**: Number of unique files with purple FileText icon
- **Avg Confidence**: Average confidence score with indigo Target icon

#### **Enhanced Controls Panel**
Left sidebar with comprehensive filtering:
- **File Selection**: Dropdown to filter by specific files
- **Search Functionality**: Search across all text fields and file names
- **Status Filter**: Filter by approved/edited status
- **Export Data**: Download ground truth in JSON format
- **Refresh Data**: Manual refresh button for latest data

#### **Unified Dataset View**
Single professional table showing:
- **File**: Source file name (truncated for space)
- **Original**: Arabic text with RTL direction
- **Translation**: Initial LLM translation
- **Approved Translation**: Final approved version
- **Confidence**: Percentage score with proper formatting
- **Status**: Color-coded badges with icons
- **Comments**: Approval notes and feedback
- **Date**: Approval/edit timestamp

### Advanced Features
- **Multi-level Filtering**: Combine file selection, search, and status filters
- **Smart Search**: Searches across original text, translations, comments, and file names
- **Proper Scrolling**: Sticky headers with contained scrolling areas
- **RTL Support**: Correct text direction for Arabic content
- **Export Capabilities**: Download filtered or complete dataset

## 🎯 Evaluation System

### Evaluation Workflow
1. **Select Arabic-Urdu File**: Choose file with translation pairs
2. **Start Evaluation**: Begin quality assessment process
3. **Review Results**: Examine evaluation metrics and scores
4. **Generate Reports**: Create detailed evaluation reports

### Quality Metrics
- **Translation Accuracy**: Semantic correctness assessment
- **Fluency Score**: Natural language flow evaluation
- **Completeness**: Coverage of original meaning
- **Cultural Adaptation**: Appropriate cultural context

## 🎨 UI/UX Features

### Design System
The system follows a consistent modern design language:

#### **Color Palette**
- **Primary**: Blue (#3B82F6) to Purple (#8B5CF6) to Indigo (#6366F1)
- **Success**: Green (#10B981) variations
- **Warning**: Orange (#F97316) variations
- **Info**: Indigo (#6366F1) variations
- **Neutral**: Professional gray scales

#### **Visual Elements**
- **Glass Morphism**: `bg-white/80 backdrop-blur-sm` for cards and modals
- **Gradient Backgrounds**: Consistent hero banners across all pages
- **Animated Counters**: Smooth counting animations for metrics
- **Status Badges**: Color-coded with contextual icons
- **Hover Effects**: Scale, shadow, and color transitions
- **Professional Icons**: Lucide React icons throughout

#### **Layout System**
- **Responsive Grid**: 4-column layouts for optimal space usage
- **Sticky Headers**: Table headers remain visible during scrolling
- **Proper Scrolling**: Contained areas with `max-h-[32rem] overflow-y-auto`
- **Mobile-first**: Responsive design with proper breakpoints

### Interactive Elements
- **Animated Progress**: Circular progress rings and linear bars
- **Toast Notifications**: Non-intrusive success/error messages
- **Loading States**: Professional spinners and skeleton screens
- **Form Validation**: Real-time validation with helpful error messages
- **Modal System**: Consistent modal design across all features

### Navigation
- **Fixed Navbar**: Professional navigation with proper spacing
- **Breadcrumbs**: Clear navigation hierarchy
- **Quick Actions**: Direct access to main functions
- **Responsive Menu**: Adaptive navigation for different screen sizes

## 🔧 Advanced Features

### Real-time Updates
- **Live Polling**: Automatic data refresh without page reload
- **WebSocket-like Experience**: Immediate updates for job status changes
- **Optimistic Updates**: UI updates before server confirmation
- **Error Recovery**: Automatic retry and error handling

### Performance Optimization
- **Lazy Loading**: Components load only when needed
- **Query Caching**: Intelligent caching with React Query
- **Chunk Processing**: Large files processed in manageable segments
- **Memory Management**: Efficient resource usage

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels and descriptions
- **Color Contrast**: High contrast for readability
- **Focus Management**: Clear focus indicators

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### **UI Goes Blank**
- **Cause**: JavaScript errors or component crashes
- **Solution**: 
  - Check browser console for error messages
  - Clear browser cache and cookies
  - Try incognito/private browsing mode
  - Refresh the page

#### **Translation Fails**
- **Cause**: Invalid API keys or provider issues
- **Solution**:
  - Verify API key in LLM Configuration
  - Check provider status and quotas
  - Test with different model or provider
  - Review error messages in job details

#### **Jobs Lost on Restart**
- **Cause**: Persistence file permissions or corruption
- **Solution**:
  - Check `/app/data/translation_jobs.json` permissions
  - Verify Docker volume mounting
  - Restart translation service container
  - Check Docker logs for errors

#### **Configuration Reset**
- **Cause**: Configuration file corruption or permissions
- **Solution**:
  - Check `/app/data/llm_config.json` format
  - Verify file permissions in Docker container
  - Reconfigure through UI
  - Export/import configuration backup

#### **Navbar Overlap**
- **Cause**: CSS conflicts or browser cache
- **Solution**:
  - Clear browser cache completely
  - Disable browser extensions
  - Try different browser
  - Check for CSS conflicts in developer tools

### Performance Tips
- **Large Files**: System automatically chunks for optimal processing
- **Real-time Updates**: Polling optimized for performance
- **Memory Usage**: Docker containers configured with appropriate limits
- **Caching**: React Query provides intelligent caching

### Getting Help
1. **Check Browser Console**: Look for JavaScript errors
2. **Review Docker Logs**: `docker-compose logs [service-name]`
3. **Check File Permissions**: Ensure data files are writable
4. **Verify Configuration**: Use LLM Configuration page to test settings
5. **Create GitHub Issue**: Report bugs with detailed information

## 📈 Best Practices

### File Management
- **Consistent Format**: Use consistent JSON structure for best results
- **File Size**: Keep files under 10MB for optimal performance
- **Naming Convention**: Use descriptive file names
- **Backup**: Regular backups of important files

### Translation Quality
- **Review Process**: Always review translations before approval
- **Edit Tracking**: Use edit functionality to improve translations
- **Comments**: Add meaningful comments during approval
- **Quality Metrics**: Pay attention to confidence and quality scores

### Configuration Management
- **API Key Security**: Keep API keys secure and rotate regularly
- **Provider Redundancy**: Configure multiple providers for reliability
- **Prompt Optimization**: Test and refine system prompts
- **Change Logging**: Monitor configuration changes

### System Maintenance
- **Regular Updates**: Keep system updated with latest changes
- **Data Backup**: Regular backups of ground truth and job data
- **Performance Monitoring**: Monitor system performance and resource usage
- **Log Review**: Regular review of system logs for issues

---

This usage guide covers all aspects of the modern Arabic-Urdu Translation and Evaluation System. The system provides a professional, user-friendly interface with powerful features for translation, evaluation, and ground truth management. 