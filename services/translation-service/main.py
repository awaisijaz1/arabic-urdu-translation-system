from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Dict
import os
import uuid

from models import TranslationReviewRequest, ReviewResponse, ReviewStatus
from translator import ReviewEngine
from langchain_translator import LangChainTranslator

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
            "model": langchain_translator.model,
            "system_prompt": langchain_translator.system_prompt,
            "api_key_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get config: {str(e)}")

@app.post("/translate/llm/config")
async def update_llm_config(request: Dict):
    """Update LLM configuration"""
    try:
        if "system_prompt" in request:
            langchain_translator.system_prompt = request["system_prompt"]
        
        if "model" in request:
            langchain_translator.model = request["model"]
        
        return {
            "message": "Configuration updated successfully",
            "current_config": {
                "model": langchain_translator.model,
                "system_prompt": langchain_translator.system_prompt
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update config: {str(e)}")

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
        
        # Mark job as approved
        job.status = "approved"
        
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