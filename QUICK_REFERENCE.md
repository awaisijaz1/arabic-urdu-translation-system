# Translation System - Quick Reference

## System Status (Current Implementation)
- ✅ **Microservices Architecture**: 5 services + React frontend
- ✅ **LLM Integration**: Anthropic Claude + OpenAI/Azure OpenAI
- ✅ **File Classification**: Arabic-only vs Arabic-Urdu pairs
- ✅ **Real-time Updates**: Job status polling every 1-2 seconds
- ✅ **Job Persistence**: Survives service restarts
- ✅ **Modern UI**: Gradients, animations, glass morphism
- ✅ **Ground Truth Management**: Approval workflow with edit tracking

## Critical File Locations
```
frontend/src/components/TranslationJobs.js    # Main translation UI
frontend/src/utils/fileClassification.js      # File type detection
services/translation-service/main.py          # Translation API
services/translation-service/langchain_translator.py  # LLM engine
services/api-gateway/main.py                  # API routing
data/llm_config.json                         # LLM settings (excluded from git)
data/translation_jobs.json                   # Job persistence
```

## Key Functions & Classes
- `getFileClassification(segments)` - Detects file type
- `LangChainTranslator` - Main translation engine
- `PersistentJobStorage` - Job data persistence
- `load_llm_config()` / `save_llm_config()` - Config persistence
- `AnimatedCounter`, `StatusBadge`, `ProgressRing` - UI components

## Service Ports
- Frontend: 3000
- API Gateway: 8000
- Input Service: 8001
- Translation Service: 8002
- Evaluation Service: 8003
- Storage Service: 8004

## Common Commands
```bash
# Full restart
docker-compose down && docker-compose up -d --build

# Frontend only
docker-compose build frontend && docker-compose up -d frontend

# Translation service only
docker-compose build translation-service && docker-compose up -d translation-service
```

## File Classification Logic
- **Arabic-only**: `original_text` only → "Ready for LLM translation"
- **Arabic-Urdu pairs**: Both `original_text` + `translated_text` → "Ready for evaluation"

## Job Status Flow
`pending` → `in_progress` → `completed`/`failed` → `approved`

## Recent Critical Fixes
1. **File Classification**: Fixed to handle both segments array and full file content
2. **Real-time Updates**: Enhanced polling with auto-notifications
3. **Job Persistence**: Jobs saved to JSON file to survive restarts
4. **UI Stability**: Fixed route conflicts and variable naming issues
5. **Error Handling**: Proper failed job detection and display

## Git Exclusions
- `data/llm_config.json` (contains API keys)
- `uploads/` (file uploads)
- `venv1/` (virtual environment)

## User Workflow
1. Upload files → Input Service
2. Select file → Classification shown
3. Start translation → Real-time progress
4. Review results → Edit if needed
5. Approve → Move to ground truth

This is the essential information needed to understand and work with the system. 