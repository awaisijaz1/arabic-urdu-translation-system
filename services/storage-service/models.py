from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"

class GroundTruthSegment(BaseModel):
    """Model for ground truth segment"""
    segment_id: str = Field(..., description="Unique segment ID")
    start_time: str = Field(..., description="Start time in HH:MM:SS.mmm format")
    end_time: str = Field(..., description="End time in HH:MM:SS.mmm format")
    original_text: str = Field(..., description="Original Arabic text")
    translated_text: str = Field(..., description="Machine translated Urdu text")
    approved_translation: str = Field(..., description="Human approved/edited Urdu translation")
    status: str = Field(..., description="Evaluation status")
    edited_by: str = Field(..., description="Username of editor")
    edited_at: datetime = Field(..., description="Edit timestamp")
    confidence: Optional[float] = Field(None, description="Translation confidence score")
    notes: Optional[str] = Field(None, description="Reviewer notes")

class GroundTruthData(BaseModel):
    """Model for ground truth data collection"""
    file_id: str = Field(..., description="ID of the source file")
    evaluation_id: str = Field(..., description="ID of the evaluation")
    segments: List[GroundTruthSegment] = Field(..., description="List of ground truth segments")
    total_segments: int = Field(..., description="Total number of segments")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    version: str = Field(default="1.0", description="Data version")

class ExportRequest(BaseModel):
    """Model for export request"""
    format: ExportFormat = Field(..., description="Export format")
    file_ids: Optional[List[str]] = Field(None, description="Specific file IDs to export")
    date_from: Optional[datetime] = Field(None, description="Export from date")
    date_to: Optional[datetime] = Field(None, description="Export to date")
    include_metadata: bool = Field(default=True, description="Include metadata in export")

class ExportResponse(BaseModel):
    """Model for export response"""
    export_id: str = Field(..., description="Unique export ID")
    format: ExportFormat = Field(..., description="Export format")
    file_path: str = Field(..., description="Path to exported file")
    file_size: int = Field(..., description="File size in bytes")
    segments_count: int = Field(..., description="Number of segments exported")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Export time")
    download_url: Optional[str] = Field(None, description="Download URL")

class MetricsData(BaseModel):
    """Model for metrics data"""
    total_files: int = Field(..., description="Total number of files")
    total_evaluations: int = Field(..., description="Total number of evaluations")
    total_segments: int = Field(..., description="Total number of segments")
    approved_segments: int = Field(..., description="Number of approved segments")
    edited_segments: int = Field(..., description="Number of edited segments")
    rejected_segments: int = Field(..., description="Number of rejected segments")
    pending_segments: int = Field(..., description="Number of pending segments")
    average_confidence: float = Field(..., description="Average translation confidence")
    completion_rate: float = Field(..., description="Evaluation completion rate")
    average_edit_time: Optional[float] = Field(None, description="Average edit time per segment")
    top_editors: List[Dict[str, Any]] = Field(default=[], description="Top editors by segments")
    daily_stats: List[Dict[str, Any]] = Field(default=[], description="Daily statistics")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Metrics timestamp")

class StorageStats(BaseModel):
    """Model for storage statistics"""
    total_ground_truth_records: int = Field(..., description="Total ground truth records")
    total_export_files: int = Field(..., description="Total export files")
    storage_size_bytes: int = Field(..., description="Total storage size in bytes")
    last_backup: Optional[datetime] = Field(None, description="Last backup time")
    data_integrity_score: float = Field(..., description="Data integrity score")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Stats timestamp") 