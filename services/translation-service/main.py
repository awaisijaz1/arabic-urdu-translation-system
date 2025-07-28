from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Dict, Optional
import os
import uuid
import json
import logging

from models import TranslationReviewRequest, ReviewResponse, ReviewStatus
from translator import ReviewEngine
from langchain_translator import LangChainTranslator
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Translation Review Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/translation.db")
MODEL_PATH = os.getenv("MODEL_PATH", "./models")

# Ensure directories exist
os.makedirs("./data", exist_ok=True)
os.makedirs(MODEL_PATH, exist_ok=True)

# Initialize review engine
review_engine = ReviewEngine()

# Initialize LangChain translator
langchain_translator = LangChainTranslator()

# In-memory storage for LLM translation jobs (now managed by LangChain translator)
llm_jobs = langchain_translator.translation_jobs

# LLM Configuration Models
class APIProvider(BaseModel):
    name: str
    api_key: str
    base_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class LLMModel(BaseModel):
    provider: str
    model_id: str
    name: str
    description: str
    max_tokens: int
    temperature: float
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class SystemPrompt(BaseModel):
    name: str
    content: str
    description: str
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

class LLMConfigLog(BaseModel):
    action: str
    user: str
    details: Dict
    timestamp: datetime

# In-memory storage for configuration (in production, use a database)
llm_config = {
    "api_providers": {},
    "models": {},
    "system_prompts": {},
    "current_config": {
        "provider": "anthropic",
        "model": "claude-3-sonnet-20240229",
        "system_prompt": "You are an expert Arabic to Urdu translator. Provide accurate, natural translations that maintain the original meaning and tone.",
        "temperature": 0.1,
        "max_tokens": 1000
    },
    "logs": []
}

def initialize_default_config():
    """Initialize default LLM configuration"""
    now = datetime.utcnow()
    
    # Default API providers
    if "anthropic" not in llm_config["api_providers"]:
        llm_config["api_providers"]["anthropic"] = APIProvider(
            name="Anthropic",
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            is_active=bool(os.getenv("ANTHROPIC_API_KEY")),
            created_at=now,
            updated_at=now
        )
    
    if "openai" not in llm_config["api_providers"]:
        llm_config["api_providers"]["openai"] = APIProvider(
            name="OpenAI",
            api_key=os.getenv("OPENAI_API_KEY", ""),
            is_active=bool(os.getenv("OPENAI_API_KEY")),
            created_at=now,
            updated_at=now
        )
    
    # Default models
    default_models = [
        {
            "provider": "anthropic",
            "model_id": "claude-3-sonnet-20240229",
            "name": "Claude 3 Sonnet",
            "description": "Balanced performance and speed",
            "max_tokens": 1000,
            "temperature": 0.1
        },
        {
            "provider": "anthropic",
            "model_id": "claude-3-opus-20240229",
            "name": "Claude 3 Opus",
            "description": "Highest performance, slower speed",
            "max_tokens": 1000,
            "temperature": 0.1
        },
        {
            "provider": "anthropic",
            "model_id": "claude-3-haiku-20240307",
            "name": "Claude 3 Haiku",
            "description": "Fastest speed, good performance",
            "max_tokens": 1000,
            "temperature": 0.1
        },
        {
            "provider": "openai",
            "model_id": "gpt-4",
            "name": "GPT-4",
            "description": "OpenAI's most capable model",
            "max_tokens": 1000,
            "temperature": 0.1
        },
        {
            "provider": "openai",
            "model_id": "gpt-3.5-turbo",
            "name": "GPT-3.5 Turbo",
            "description": "Fast and cost-effective",
            "max_tokens": 1000,
            "temperature": 0.1
        }
    ]
    
    for model_data in default_models:
        model_key = f"{model_data['provider']}_{model_data['model_id']}"
        if model_key not in llm_config["models"]:
            llm_config["models"][model_key] = LLMModel(
                **model_data,
                created_at=now,
                updated_at=now
            )
    
    # Default system prompts
    default_prompts = [
        {
            "name": "Standard Translation",
            "content": "You are an expert Arabic to Urdu translator. Provide accurate, natural translations that maintain the original meaning and tone.",
            "description": "Standard translation prompt for general use",
            "is_default": True
        },
        {
            "name": "News Translation",
            "content": "You are an expert Arabic to Urdu translator specializing in news and media content. Translate with journalistic accuracy and clarity.",
            "description": "Optimized for news and media content"
        },
        {
            "name": "Technical Translation",
            "content": "You are an expert Arabic to Urdu translator specializing in technical and academic content. Maintain technical accuracy and terminology.",
            "description": "Optimized for technical and academic content"
        }
    ]
    
    for prompt_data in default_prompts:
        if prompt_data["name"] not in llm_config["system_prompts"]:
            llm_config["system_prompts"][prompt_data["name"]] = SystemPrompt(
                **prompt_data,
                created_at=now,
                updated_at=now
            )

def log_config_change(action: str, user: str, details: Dict):
    """Log configuration changes"""
    log_entry = LLMConfigLog(
        action=action,
        user=user,
        details=details,
        timestamp=datetime.utcnow()
    )
    llm_config["logs"].append(log_entry)
    logger.info(f"LLM Config Change: {action} by {user} - {details}")

# Initialize default configuration
initialize_default_config()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "translation-review-service",
        "review_tools_loaded": review_engine.reviewer.review_loaded,
        "active_reviews": len(review_engine.active_reviews),
        "llm_jobs_count": len(llm_jobs),
        "timestamp": datetime.utcnow().isoformat()
    }

# LLM Translation Endpoints
@app.post("/translate/llm")
async def start_llm_translation(background_tasks: BackgroundTasks, request: Dict):
    """Start LLM-based translation job"""
    try:
        file_id = request.get("file_id")
        segments = request.get("segments", [])
        use_existing_translations = request.get("use_existing_translations", False)
        
        print(f"Starting LLM translation for file_id: {file_id}, segments count: {len(segments)}, use_existing: {use_existing_translations}")
        
        if not file_id or not segments:
            raise HTTPException(status_code=400, detail="file_id and segments are required")
        
        # Create translation job
        job = await langchain_translator.translate_file(file_id, segments, use_existing_translations)
        
        # Store job
        llm_jobs[job.job_id] = job
        
        print(f"LLM translation job created successfully: {job.job_id}")
        
        return {
            "job_id": job.job_id,
            "status": job.status,
            "total_segments": job.total_segments,
            "message": "LLM translation job started successfully"
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"LLM translation error: {str(e)}")
        print(f"Error details: {error_details}")
        raise HTTPException(status_code=500, detail=f"LLM translation failed: {str(e)}")

@app.get("/translate/llm")
async def list_llm_translations():
    """List all LLM translation jobs"""
    try:
        return [
            {
                "job_id": job.job_id,
                "file_id": job.file_id,
                "status": job.status,
                "total_segments": job.total_segments,
                "completed_segments": job.completed_segments,
                "average_confidence": job.average_confidence,
                "average_quality_score": job.average_quality_score,
                "created_at": job.created_at.isoformat(),
                "completed_at": job.completed_at.isoformat() if job.completed_at else None
            }
            for job in llm_jobs.values()
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list translations: {str(e)}")

@app.get("/translate/llm/metrics")
async def get_llm_translation_metrics():
    """Get LLM translation metrics and benchmarks"""
    try:
        # Use LangChain translator's built-in metrics
        metrics = langchain_translator.get_metrics()
        
        # Add additional metrics
        completed_jobs = [job for job in llm_jobs.values() if job.status in ["completed", "approved"]]
        
        # Calculate average translation time
        all_translation_times = []
        for job in completed_jobs:
            for segment in job.segments:
                if segment.translation_time:
                    all_translation_times.append(segment.translation_time)
        
        avg_translation_time = sum(all_translation_times) / len(all_translation_times) if all_translation_times else 0
        
        # Ensure we have default values if no jobs exist
        default_metrics = {
            "total_jobs": 0,
            "completed_jobs": 0,
            "total_segments_translated": 0,
            "average_confidence": 0.0,
            "average_quality_score": 0.0,
            "average_translation_time": 0.0
        }
        
        return {
            **default_metrics,
            **metrics,
            "average_translation_time": round(avg_translation_time, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        # Return default metrics on error instead of throwing exception
        return {
            "total_jobs": 0,
            "completed_jobs": 0,
            "total_segments_translated": 0,
            "average_confidence": 0.0,
            "average_quality_score": 0.0,
            "average_translation_time": 0.0,
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/translate/llm/job/{job_id}")
async def get_llm_translation_status(job_id: str):
    """Get LLM translation job status and results"""
    try:
        if job_id not in llm_jobs:
            raise HTTPException(status_code=404, detail="Translation job not found")
        
        job = llm_jobs[job_id]
        
        return {
            "job_id": job.job_id,
            "file_id": job.file_id,
            "status": job.status,
            "total_segments": job.total_segments,
            "completed_segments": job.completed_segments,
            "average_confidence": job.average_confidence,
            "average_quality_score": job.average_quality_score,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "segments": [
                {
                    "segment_id": s.segment_id,
                    "original_text": s.original_text,
                    "llm_translation": s.llm_translation,
                    "confidence_score": s.confidence_score,
                    "quality_metrics": s.quality_metrics,
                    "translation_time": s.translation_time
                }
                for s in job.segments
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get translation status: {str(e)}")

@app.post("/translate/llm/{job_id}/update")
async def update_llm_translation(job_id: str, request: Dict):
    """Update a specific segment translation"""
    try:
        if job_id not in llm_jobs:
            raise HTTPException(status_code=404, detail="Translation job not found")
        
        job = llm_jobs[job_id]
        segment_id = request.get("segment_id")
        updated_translation = request.get("translation")
        
        if not segment_id or not updated_translation:
            raise HTTPException(status_code=400, detail="segment_id and translation are required")
        
        # Find and update segment
        for segment in job.segments:
            if segment.segment_id == segment_id:
                segment.llm_translation = updated_translation
                segment.translation_time = datetime.now().timestamp()
                
                # Recalculate job metrics
                if job.completed_segments > 0:
                    job.average_confidence = sum(s.confidence_score or 0 for s in job.segments) / job.completed_segments
                    job.average_quality_score = sum(s.quality_metrics.get("overall_quality_score", 0) for s in job.segments) / job.completed_segments
                
                return {"message": "Translation updated successfully"}
        
        raise HTTPException(status_code=404, detail="Segment not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update translation: {str(e)}")

@app.get("/translate/llm/config")
async def get_llm_config():
    """Get current LLM configuration"""
    try:
        return {
            "current_config": llm_config["current_config"],
            "api_providers": {
                k: {
                    "name": v.name,
                    "is_active": v.is_active,
                    "created_at": v.created_at.isoformat(),
                    "updated_at": v.updated_at.isoformat()
                } for k, v in llm_config["api_providers"].items()
            },
            "models": {
                k: {
                    "provider": v.provider,
                    "model_id": v.model_id,
                    "name": v.name,
                    "description": v.description,
                    "max_tokens": v.max_tokens,
                    "temperature": v.temperature,
                    "is_active": v.is_active,
                    "created_at": v.created_at.isoformat(),
                    "updated_at": v.updated_at.isoformat()
                } for k, v in llm_config["models"].items()
            },
            "system_prompts": {
                k: {
                    "name": v.name,
                    "content": v.content,
                    "description": v.description,
                    "is_default": v.is_default,
                    "created_at": v.created_at.isoformat(),
                    "updated_at": v.updated_at.isoformat()
                } for k, v in llm_config["system_prompts"].items()
            },
            "logs": [
                {
                    "action": log.action,
                    "user": log.user,
                    "details": log.details,
                    "timestamp": log.timestamp.isoformat()
                } for log in llm_config["logs"][-10:]  # Last 10 logs
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get config: {str(e)}")

@app.post("/translate/llm/config")
async def update_llm_config(request: Dict):
    """Update LLM configuration"""
    try:
        user = request.get("user", "admin")
        changes = []
        
        # Update current configuration
        if "current_config" in request:
            current_config = request["current_config"]
            old_config = llm_config["current_config"].copy()
            
            for key, value in current_config.items():
                if key in llm_config["current_config"] and llm_config["current_config"][key] != value:
                    llm_config["current_config"][key] = value
                    changes.append(f"Updated {key}: {old_config[key]} -> {value}")
        
        # Update API providers
        if "api_providers" in request:
            for provider_id, provider_data in request["api_providers"].items():
                if provider_id in llm_config["api_providers"]:
                    old_provider = llm_config["api_providers"][provider_id]
                    llm_config["api_providers"][provider_id].api_key = provider_data.get("api_key", old_provider.api_key)
                    llm_config["api_providers"][provider_id].is_active = provider_data.get("is_active", old_provider.is_active)
                    llm_config["api_providers"][provider_id].updated_at = datetime.utcnow()
                    changes.append(f"Updated API provider: {provider_id}")
        
        # Add new API providers
        if "new_api_providers" in request:
            for provider_data in request["new_api_providers"]:
                provider_id = provider_data["id"]
                if provider_id not in llm_config["api_providers"]:
                    llm_config["api_providers"][provider_id] = APIProvider(
                        name=provider_data["name"],
                        api_key=provider_data["api_key"],
                        base_url=provider_data.get("base_url"),
                        is_active=provider_data.get("is_active", True),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    changes.append(f"Added API provider: {provider_id}")
        
        # Update models
        if "models" in request:
            for model_key, model_data in request["models"].items():
                if model_key in llm_config["models"]:
                    old_model = llm_config["models"][model_key]
                    for key, value in model_data.items():
                        if hasattr(old_model, key) and getattr(old_model, key) != value:
                            setattr(llm_config["models"][model_key], key, value)
                    llm_config["models"][model_key].updated_at = datetime.utcnow()
                    changes.append(f"Updated model: {model_key}")
        
        # Add new models
        if "new_models" in request:
            for model_data in request["new_models"]:
                model_key = f"{model_data['provider']}_{model_data['model_id']}"
                if model_key not in llm_config["models"]:
                    llm_config["models"][model_key] = LLMModel(
                        provider=model_data["provider"],
                        model_id=model_data["model_id"],
                        name=model_data["name"],
                        description=model_data["description"],
                        max_tokens=model_data["max_tokens"],
                        temperature=model_data["temperature"],
                        is_active=model_data.get("is_active", True),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    changes.append(f"Added model: {model_key}")
        
        # Update system prompts
        if "system_prompts" in request:
            for prompt_name, prompt_data in request["system_prompts"].items():
                if prompt_name in llm_config["system_prompts"]:
                    old_prompt = llm_config["system_prompts"][prompt_name]
                    llm_config["system_prompts"][prompt_name].content = prompt_data.get("content", old_prompt.content)
                    llm_config["system_prompts"][prompt_name].description = prompt_data.get("description", old_prompt.description)
                    llm_config["system_prompts"][prompt_name].is_default = prompt_data.get("is_default", old_prompt.is_default)
                    llm_config["system_prompts"][prompt_name].updated_at = datetime.utcnow()
                    changes.append(f"Updated system prompt: {prompt_name}")
        
        # Add new system prompts
        if "new_system_prompts" in request:
            for prompt_data in request["new_system_prompts"]:
                prompt_name = prompt_data["name"]
                if prompt_name not in llm_config["system_prompts"]:
                    llm_config["system_prompts"][prompt_name] = SystemPrompt(
                        name=prompt_data["name"],
                        content=prompt_data["content"],
                        description=prompt_data["description"],
                        is_default=prompt_data.get("is_default", False),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    changes.append(f"Added system prompt: {prompt_name}")
        
        # Log changes if any
        if changes:
            log_config_change("configuration_updated", user, {"changes": changes})
        
        return {
            "message": "Configuration updated successfully",
            "changes": changes,
            "current_config": llm_config["current_config"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update config: {str(e)}")

@app.get("/translate/llm/config/providers")
async def get_api_providers():
    """Get all available API providers"""
    try:
        return {
            "providers": {
                k: {
                    "name": v.name,
                    "is_active": v.is_active,
                    "has_api_key": bool(v.api_key),
                    "created_at": v.created_at.isoformat(),
                    "updated_at": v.updated_at.isoformat()
                } for k, v in llm_config["api_providers"].items()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get providers: {str(e)}")

@app.get("/translate/llm/config/models")
async def get_models():
    """Get all available models"""
    try:
        return {
            "models": {
                k: {
                    "provider": v.provider,
                    "model_id": v.model_id,
                    "name": v.name,
                    "description": v.description,
                    "max_tokens": v.max_tokens,
                    "temperature": v.temperature,
                    "is_active": v.is_active,
                    "created_at": v.created_at.isoformat(),
                    "updated_at": v.updated_at.isoformat()
                } for k, v in llm_config["models"].items()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")

@app.get("/translate/llm/config/prompts")
async def get_system_prompts():
    """Get all available system prompts"""
    try:
        return {
            "prompts": {
                k: {
                    "name": v.name,
                    "content": v.content,
                    "description": v.description,
                    "is_default": v.is_default,
                    "created_at": v.created_at.isoformat(),
                    "updated_at": v.updated_at.isoformat()
                } for k, v in llm_config["system_prompts"].items()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompts: {str(e)}")

@app.get("/translate/llm/config/logs")
async def get_config_logs(limit: int = 50):
    """Get configuration change logs"""
    try:
        logs = llm_config["logs"][-limit:] if limit > 0 else llm_config["logs"]
        return {
            "logs": [
                {
                    "action": log.action,
                    "user": log.user,
                    "details": log.details,
                    "timestamp": log.timestamp.isoformat()
                } for log in logs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")

@app.post("/translate/llm/{job_id}/approve")
async def approve_llm_translation(job_id: str, request: Dict):
    """Approve LLM translation job and move to ground truth"""
    try:
        if job_id not in llm_jobs:
            raise HTTPException(status_code=404, detail="Translation job not found")
        
        job = llm_jobs[job_id]
        
        if job.status != "completed":
            raise HTTPException(status_code=400, detail="Only completed jobs can be approved")
        
        # Get approval details
        approved_by = request.get("approved_by", "admin")
        notes = request.get("notes", "")
        
        # Prepare ground truth data
        ground_truth_data = {
            "file_id": job.file_id,
            "evaluation_id": f"llm_approval_{job_id}",
            "segments": []
        }
        
        # Convert segments to ground truth format
        for segment in job.segments:
            ground_truth_segment = {
                "segment_id": segment.segment_id,
                "start_time": "00:00:00.000",  # Default timing for LLM translations
                "end_time": "00:00:00.000",
                "original_text": segment.original_text,
                "translated_text": segment.llm_translation or "",
                "approved_translation": segment.llm_translation or "",
                "status": "approved",
                "edited_by": approved_by,
                "edited_at": datetime.utcnow().isoformat(),
                "confidence": segment.confidence_score,
                "notes": notes
            }
            ground_truth_data["segments"].append(ground_truth_segment)
        
        # Save to storage service
        import httpx
        storage_service_url = os.getenv("STORAGE_SERVICE_URL", "http://storage-service:8004")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{storage_service_url}/ground-truth",
                json=ground_truth_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to save to ground truth: {response.text}")
        
        # Mark job as approved and save to persistent storage
        job.status = "approved"
        langchain_translator.storage.save_jobs(langchain_translator.translation_jobs)
        
        return {
            "message": "Translation job approved and moved to ground truth",
            "job_id": job_id,
            "evaluation_id": ground_truth_data["evaluation_id"],
            "segments_approved": len(ground_truth_data["segments"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve translation: {str(e)}")

@app.post("/review", response_model=ReviewResponse)
async def review_translations(request: TranslationReviewRequest):
    """Start a translation review job"""
    try:
        # Validate request
        if not request.segments:
            raise HTTPException(status_code=400, detail="No segments provided")
        
        # Start review
        response = await review_engine.start_review(request)
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review failed: {str(e)}")

@app.get("/status/{review_id}", response_model=ReviewResponse)
async def get_review_status(review_id: str):
    """Get status of a review job"""
    try:
        response = review_engine.get_review_status(review_id)
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@app.get("/reviews", response_model=List[ReviewResponse])
async def list_reviews():
    """List all review jobs"""
    try:
        return review_engine.get_all_reviews()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list reviews: {str(e)}")

@app.delete("/reviews/{review_id}")
async def cancel_review(review_id: str):
    """Cancel a review job"""
    try:
        if review_id not in review_engine.active_reviews:
            raise HTTPException(status_code=404, detail="Review not found")
        
        review_data = review_engine.active_reviews[review_id]
        response = review_data["response"]
        
        # Only allow cancellation of pending or in_review jobs
        if response.status in [ReviewStatus.APPROVED, ReviewStatus.NEEDS_REVISION, ReviewStatus.REJECTED]:
            raise HTTPException(status_code=400, detail="Cannot cancel completed review")
        
        # Cancel the task
        if review_data["task"]:
            review_data["task"].cancel()
        
        # Update status
        response.status = ReviewStatus.REJECTED
        response.completed_at = datetime.utcnow()
        
        return {"message": "Review cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel review: {str(e)}")

@app.get("/review-tools/status")
async def get_review_tools_status():
    """Get review tools status"""
    return {
        "review_tools_loaded": review_engine.reviewer.review_loaded,
        "quality_thresholds": review_engine.reviewer.quality_thresholds,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/review-tools/reload")
async def reload_review_tools():
    """Reload the review tools"""
    try:
        # Reset review tools loaded status
        review_engine.reviewer.review_loaded = False
        
        # Load review tools in background
        await review_engine.reviewer.load_review_tools()
        
        return {"message": "Review tools reloaded successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload review tools: {str(e)}")

@app.get("/stats")
async def get_review_stats():
    """Get review service statistics"""
    reviews = review_engine.get_all_reviews()
    
    stats = {
        "total_reviews": len(reviews),
        "approved_reviews": len([r for r in reviews if r.status == ReviewStatus.APPROVED]),
        "needs_revision_reviews": len([r for r in reviews if r.status == ReviewStatus.NEEDS_REVISION]),
        "rejected_reviews": len([r for r in reviews if r.status == ReviewStatus.REJECTED]),
        "pending_reviews": len([r for r in reviews if r.status == ReviewStatus.PENDING]),
        "in_review_reviews": len([r for r in reviews if r.status == ReviewStatus.IN_REVIEW]),
        "total_segments_reviewed": sum(r.reviewed_segments for r in reviews),
        "average_review_time": None,  # Calculate if needed
        "timestamp": datetime.utcnow().isoformat()
    }
    
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002) 