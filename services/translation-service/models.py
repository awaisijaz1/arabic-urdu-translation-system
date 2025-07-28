from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class ReviewStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    NEEDS_REVISION = "needs_revision"
    REJECTED = "rejected"

class TranslationReviewRequest(BaseModel):
    """Model for translation review request"""
    file_id: str = Field(..., description="ID of the file to review")
    segments: List[dict] = Field(..., description="List of timestamped segments with existing translations")
    reviewer_id: Optional[str] = Field(None, description="ID of the assigned reviewer")

class ReviewedSegment(BaseModel):
    """Model for a reviewed segment"""
    start_time: str = Field(..., description="Start time in HH:MM:SS.mmm format")
    end_time: str = Field(..., description="End time in HH:MM:SS.mmm format")
    original_text: str = Field(..., description="Original Arabic text")
    original_translation: str = Field(..., description="Original Urdu translation")
    approved_translation: Optional[str] = Field(None, description="Approved/revised Urdu translation")
    review_status: ReviewStatus = Field(default=ReviewStatus.PENDING, description="Review status")
    reviewer_notes: Optional[str] = Field(None, description="Reviewer notes")
    review_time: Optional[datetime] = Field(None, description="Review timestamp")

class ReviewResponse(BaseModel):
    """Model for review response"""
    review_id: str = Field(..., description="Unique review ID")
    file_id: str = Field(..., description="ID of the original file")
    status: ReviewStatus = Field(..., description="Review status")
    segments: List[ReviewedSegment] = Field(default=[], description="Reviewed segments")
    total_segments: int = Field(..., description="Total number of segments")
    reviewed_segments: int = Field(default=0, description="Number of reviewed segments")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Review creation time")
    completed_at: Optional[datetime] = Field(None, description="Review completion time")
    reviewer_id: Optional[str] = Field(None, description="Reviewer ID")

class ReviewJob(BaseModel):
    """Model for review job"""
    review_id: str
    file_id: str
    status: ReviewStatus
    total_segments: int
    reviewed_segments: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None 