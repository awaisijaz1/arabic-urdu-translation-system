from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class EvaluationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    EDITED = "edited"
    REJECTED = "rejected"

class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

class User(BaseModel):
    """User model for authentication"""
    username: str = Field(..., description="Username")
    email: str = Field(..., description="Email address")
    role: UserRole = Field(default=UserRole.EDITOR, description="User role")
    is_active: bool = Field(default=True, description="User active status")

class UserCreate(BaseModel):
    """Model for creating a new user"""
    username: str = Field(..., description="Username")
    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Password")
    role: UserRole = Field(default=UserRole.EDITOR, description="User role")

class UserLogin(BaseModel):
    """Model for user login"""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")

class Token(BaseModel):
    """Model for JWT token"""
    access_token: str = Field(..., description="Access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")

class EvaluationSegment(BaseModel):
    """Model for an evaluation segment"""
    segment_id: str = Field(..., description="Unique segment ID")
    start_time: str = Field(..., description="Start time in HH:MM:SS.mmm format")
    end_time: str = Field(..., description="End time in HH:MM:SS.mmm format")
    original_text: str = Field(..., description="Original Arabic text")
    translated_text: str = Field(..., description="Machine translated Urdu text")
    approved_translation: Optional[str] = Field(None, description="Human approved/edited Urdu translation")
    status: EvaluationStatus = Field(default=EvaluationStatus.PENDING, description="Evaluation status")
    confidence: Optional[float] = Field(None, description="Translation confidence score")
    notes: Optional[str] = Field(None, description="Reviewer notes")

class Evaluation(BaseModel):
    """Model for an evaluation session"""
    evaluation_id: str = Field(..., description="Unique evaluation ID")
    file_id: str = Field(..., description="ID of the source file")
    job_id: str = Field(..., description="ID of the translation job")
    segments: List[EvaluationSegment] = Field(..., description="List of segments to evaluate")
    total_segments: int = Field(..., description="Total number of segments")
    evaluated_segments: int = Field(default=0, description="Number of evaluated segments")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    created_by: str = Field(..., description="Username of creator")
    status: str = Field(default="active", description="Evaluation status")

class EvaluationUpdate(BaseModel):
    """Model for updating evaluation segments"""
    segment_id: str = Field(..., description="Segment ID to update")
    approved_translation: str = Field(..., description="Approved/edited translation")
    status: EvaluationStatus = Field(..., description="New status")
    notes: Optional[str] = Field(None, description="Reviewer notes")

class EvaluationResponse(BaseModel):
    """Model for evaluation response"""
    evaluation_id: str
    message: str
    updated_segment: EvaluationSegment
    total_evaluated: int
    total_segments: int

class EvaluationStats(BaseModel):
    """Model for evaluation statistics"""
    total_evaluations: int
    total_segments: int
    approved_segments: int
    edited_segments: int
    rejected_segments: int
    pending_segments: int
    average_confidence: float
    completion_rate: float 