from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import List, Optional
import os
import uuid
import httpx

from models import (
    User, UserCreate, UserLogin, Token, Evaluation, EvaluationSegment, 
    EvaluationUpdate, EvaluationResponse, EvaluationStats, EvaluationStatus, UserRole
)
from auth import create_access_token, get_current_user, verify_password, get_password_hash, get_current_active_user, require_role, authenticate_user

app = FastAPI(title="Evaluation Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/evaluation.db")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
STORAGE_SERVICE_URL = os.getenv("STORAGE_SERVICE_URL", "http://storage-service:8004")

# Ensure data directory exists
os.makedirs("./data", exist_ok=True)

# In-memory storage for demo (replace with database in production)
evaluations = {}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "evaluation-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/debug/jwt")
async def debug_jwt():
    """Debug endpoint to check JWT configuration"""
    import os
    from auth import SECRET_KEY
    return {
        "jwt_secret_env": os.getenv("JWT_SECRET", "NOT_SET"),
        "jwt_secret_length": len(os.getenv("JWT_SECRET", "NOT_SET")),
        "service_secret": SECRET_KEY[:10] + "..." if len(SECRET_KEY) > 10 else SECRET_KEY
    }

@app.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """User login endpoint"""
    user = authenticate_user(user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 30 * 60  # 30 minutes in seconds
    }

@app.post("/auth/verify")
async def verify_auth_token(request: Request):
    """Verify JWT token endpoint"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = auth_header.split(" ")[1]
        user = verify_token(token)
        
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {
            "valid": True,
            "user": {
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token verification failed")

@app.get("/users/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@app.post("/evaluations", response_model=Evaluation)
async def create_evaluation(request: Request):
    """Create a new evaluation session"""
    try:
        data = await request.json()
        
        # Extract data from request
        file_id = data.get("file_id")
        segments_data = data.get("segments", [])
        
        if not file_id:
            raise HTTPException(status_code=400, detail="file_id is required")
        
        # Create evaluation segments
        segments = []
        for i, seg_data in enumerate(segments_data):
            segment = EvaluationSegment(
                segment_id=seg_data.get("segment_id", str(uuid.uuid4())),
                start_time=seg_data.get("start_time", "00:00:00.000"),
                end_time=seg_data.get("end_time", "00:00:00.000"),
                original_text=seg_data.get("original_text", ""),
                translated_text=seg_data.get("translated_text", ""),
                approved_translation=seg_data.get("approved_translation", seg_data.get("translated_text", "")),
                status=seg_data.get("status", EvaluationStatus.PENDING),
                notes=seg_data.get("notes", ""),
                confidence=seg_data.get("confidence")
            )
            segments.append(segment)
        
        # Create evaluation
        evaluation = Evaluation(
            evaluation_id=str(uuid.uuid4()),
            file_id=file_id,
            job_id=data.get("job_id", str(uuid.uuid4())),  # Generate job_id if not provided
            segments=segments,
            total_segments=len(segments),
            evaluated_segments=sum(1 for seg in segments if seg.status != EvaluationStatus.PENDING),
            created_by="admin"  # Temporary hardcoded user
        )
        
        # Store evaluation in memory
        evaluations[evaluation.evaluation_id] = evaluation
        
        # Save to storage service for persistence
        try:
            async with httpx.AsyncClient() as client:
                storage_data = {
                    "file_id": file_id,
                    "evaluation_id": evaluation.evaluation_id,
                    "segments": [
                        {
                            "segment_id": seg.segment_id,
                            "start_time": seg.start_time,
                            "end_time": seg.end_time,
                            "original_text": seg.original_text,
                            "translated_text": seg.translated_text,
                            "approved_translation": seg.approved_translation,
                            "status": seg.status.value if hasattr(seg.status, 'value') else str(seg.status),
                            "edited_by": "admin",
                            "edited_at": datetime.utcnow().isoformat(),
                            "confidence": seg.confidence,
                            "notes": seg.notes
                        }
                        for seg in segments
                    ]
                }
                
                response = await client.post(
                    f"{STORAGE_SERVICE_URL}/ground-truth",
                    json=storage_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code != 200:
                    print(f"Warning: Failed to save to storage service: {response.status_code}")
                else:
                    print(f"Successfully saved evaluation {evaluation.evaluation_id} to storage service")
                    
        except Exception as e:
            print(f"Warning: Failed to save to storage service: {str(e)}")
        
        return evaluation
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create evaluation: {str(e)}")

@app.get("/evaluations", response_model=List[Evaluation])
async def get_evaluations(
    current_user: User = Depends(get_current_active_user)
):
    """Get all evaluations"""
    return list(evaluations.values())

@app.get("/evaluations/{evaluation_id}", response_model=Evaluation)
async def get_evaluation(
    evaluation_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific evaluation"""
    if evaluation_id not in evaluations:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    return evaluations[evaluation_id]

@app.put("/evaluations/{evaluation_id}/segments", response_model=EvaluationResponse)
async def update_evaluation_segment(
    evaluation_id: str,
    update: EvaluationUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update an evaluation segment"""
    if evaluation_id not in evaluations:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    evaluation = evaluations[evaluation_id]
    
    # Find and update the segment
    updated_segment = None
    for segment in evaluation.segments:
        if segment.segment_id == update.segment_id:
            segment.approved_translation = update.approved_translation
            segment.status = update.status
            segment.notes = update.notes
            updated_segment = segment
            break
    
    if not updated_segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    # Update evaluation stats
    evaluated_count = sum(1 for seg in evaluation.segments 
                         if seg.status != EvaluationStatus.PENDING)
    evaluation.evaluated_segments = evaluated_count
    evaluation.updated_at = datetime.utcnow()
    
    return EvaluationResponse(
        evaluation_id=evaluation_id,
        message="Segment updated successfully",
        updated_segment=updated_segment,
        total_evaluated=evaluated_count,
        total_segments=evaluation.total_segments
    )

@app.get("/evaluations/{evaluation_id}/stats", response_model=EvaluationStats)
async def get_evaluation_stats(
    evaluation_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics for an evaluation"""
    if evaluation_id not in evaluations:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    evaluation = evaluations[evaluation_id]
    
    # Calculate statistics
    total_segments = len(evaluation.segments)
    approved_segments = sum(1 for seg in evaluation.segments 
                           if seg.status == EvaluationStatus.APPROVED)
    edited_segments = sum(1 for seg in evaluation.segments 
                         if seg.status == EvaluationStatus.EDITED)
    rejected_segments = sum(1 for seg in evaluation.segments 
                           if seg.status == EvaluationStatus.REJECTED)
    pending_segments = sum(1 for seg in evaluation.segments 
                          if seg.status == EvaluationStatus.PENDING)
    
    # Calculate average confidence
    confidence_scores = [seg.confidence for seg in evaluation.segments 
                        if seg.confidence is not None]
    average_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
    
    # Calculate completion rate
    completion_rate = (approved_segments + edited_segments + rejected_segments) / total_segments if total_segments > 0 else 0.0
    
    return EvaluationStats(
        total_evaluations=1,
        total_segments=total_segments,
        approved_segments=approved_segments,
        edited_segments=edited_segments,
        rejected_segments=rejected_segments,
        pending_segments=pending_segments,
        average_confidence=average_confidence,
        completion_rate=completion_rate
    )

@app.delete("/evaluations/{evaluation_id}")
async def delete_evaluation(
    evaluation_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete an evaluation (admin only)"""
    if evaluation_id not in evaluations:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    
    del evaluations[evaluation_id]
    return {"message": "Evaluation deleted successfully"}

@app.get("/stats/overall", response_model=EvaluationStats)
async def get_overall_stats(
    current_user: User = Depends(get_current_active_user)
):
    """Get overall evaluation statistics"""
    if not evaluations:
        return EvaluationStats(
            total_evaluations=0,
            total_segments=0,
            approved_segments=0,
            edited_segments=0,
            rejected_segments=0,
            pending_segments=0,
            average_confidence=0.0,
            completion_rate=0.0
        )
    
    # Aggregate statistics across all evaluations
    total_evaluations = len(evaluations)
    total_segments = sum(len(eval.segments) for eval in evaluations.values())
    approved_segments = sum(
        sum(1 for seg in eval.segments if seg.status == EvaluationStatus.APPROVED)
        for eval in evaluations.values()
    )
    edited_segments = sum(
        sum(1 for seg in eval.segments if seg.status == EvaluationStatus.EDITED)
        for eval in evaluations.values()
    )
    rejected_segments = sum(
        sum(1 for seg in eval.segments if seg.status == EvaluationStatus.REJECTED)
        for eval in evaluations.values()
    )
    pending_segments = sum(
        sum(1 for seg in eval.segments if seg.status == EvaluationStatus.PENDING)
        for eval in evaluations.values()
    )
    
    # Calculate average confidence
    all_confidence_scores = []
    for eval in evaluations.values():
        all_confidence_scores.extend([seg.confidence for seg in eval.segments if seg.confidence is not None])
    
    average_confidence = sum(all_confidence_scores) / len(all_confidence_scores) if all_confidence_scores else 0.0
    
    # Calculate completion rate
    completion_rate = (approved_segments + edited_segments + rejected_segments) / total_segments if total_segments > 0 else 0.0
    
    return EvaluationStats(
        total_evaluations=total_evaluations,
        total_segments=total_segments,
        approved_segments=approved_segments,
        edited_segments=edited_segments,
        rejected_segments=rejected_segments,
        pending_segments=pending_segments,
        average_confidence=average_confidence,
        completion_rate=completion_rate
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003) 