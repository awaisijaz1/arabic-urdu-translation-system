from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import re

class TimestampedSegment(BaseModel):
    """Model for a timestamped text segment with existing translation"""
    start_time: str = Field(..., description="Start time in HH:MM:SS.mmm format")
    end_time: str = Field(..., description="End time in HH:MM:SS.mmm format")
    original_text: str = Field(..., description="Original Arabic text")
    translated_text: str = Field(..., description="Existing Urdu translation")
    
    def validate_timestamp_format(self):
        """Validate timestamp format"""
        timestamp_pattern = r'^\d{2}:\d{2}:\d{2}\.\d{3}$'
        if not re.match(timestamp_pattern, self.start_time):
            raise ValueError(f"Invalid start_time format: {self.start_time}")
        if not re.match(timestamp_pattern, self.end_time):
            raise ValueError(f"Invalid end_time format: {self.end_time}")

class FileUploadResponse(BaseModel):
    """Response model for file upload"""
    file_id: str
    filename: str
    file_type: str
    segments_count: int
    upload_time: datetime
    status: str = "uploaded"

class FileInfo(BaseModel):
    """Model for file information"""
    file_id: str
    filename: str
    file_type: str
    segments_count: int
    upload_time: datetime
    status: str
    file_size: int

class ParsedContent(BaseModel):
    """Model for parsed file content with translations"""
    file_id: str
    segments: List[TimestampedSegment]
    metadata: dict

class SRTSubtitle(BaseModel):
    """Model for SRT subtitle entry with translation"""
    index: int
    start_time: str
    end_time: str
    original_text: str
    translated_text: str

class TranslationReviewRequest(BaseModel):
    """Model for translation review request"""
    file_id: str
    segments: List[TimestampedSegment] 