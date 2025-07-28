from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
import uuid
import json
import pandas as pd
import aiofiles
from collections import defaultdict

from models import (
    GroundTruthData, GroundTruthSegment, ExportRequest, ExportResponse,
    ExportFormat, MetricsData, StorageStats
)

app = FastAPI(title="Storage Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/storage.db")
EXPORT_FOLDER = os.getenv("EXPORT_FOLDER", "./exports")

# Ensure directories exist
os.makedirs("./data", exist_ok=True)
os.makedirs(EXPORT_FOLDER, exist_ok=True)

# In-memory storage for demo (replace with database in production)
ground_truth_data = {}
export_files = {}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "storage-service",
        "ground_truth_records": len(ground_truth_data),
        "export_files": len(export_files),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/ground-truth", response_model=GroundTruthData)
async def save_ground_truth(request: Request):
    """Save ground truth data"""
    try:
        data = await request.json()
        
        # Extract data from request
        file_id = data.get("file_id")
        evaluation_id = data.get("evaluation_id")
        segments_data = data.get("segments", [])
        
        if not file_id or not evaluation_id:
            raise HTTPException(status_code=400, detail="file_id and evaluation_id are required")
        
        # Create ground truth segments
        segments = []
        for seg_data in segments_data:
            segment = GroundTruthSegment(
                segment_id=seg_data.get("segment_id", str(uuid.uuid4())),
                start_time=seg_data.get("start_time", "00:00:00.000"),
                end_time=seg_data.get("end_time", "00:00:00.000"),
                original_text=seg_data.get("original_text", ""),
                translated_text=seg_data.get("translated_text", ""),
                approved_translation=seg_data.get("approved_translation", ""),
                status=seg_data.get("status", "approved"),
                edited_by=seg_data.get("edited_by", "unknown"),
                edited_at=datetime.fromisoformat(seg_data.get("edited_at", datetime.utcnow().isoformat())),
                confidence=seg_data.get("confidence"),
                notes=seg_data.get("notes")
            )
            segments.append(segment)
        
        # Create ground truth data
        ground_truth = GroundTruthData(
            file_id=file_id,
            evaluation_id=evaluation_id,
            segments=segments,
            total_segments=len(segments)
        )
        
        # Store ground truth data
        ground_truth_data[ground_truth.evaluation_id] = ground_truth
        
        return ground_truth
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save ground truth: {str(e)}")

@app.get("/ground-truth", response_model=List[GroundTruthData])
async def get_ground_truth(
    file_id: str = None,
    evaluation_id: str = None,
    limit: int = 100
):
    """Get ground truth data with optional filtering"""
    try:
        results = []
        
        for gt_data in ground_truth_data.values():
            # Apply filters
            if file_id and gt_data.file_id != file_id:
                continue
            if evaluation_id and gt_data.evaluation_id != evaluation_id:
                continue
            
            results.append(gt_data)
            
            # Apply limit
            if len(results) >= limit:
                break
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ground truth: {str(e)}")

@app.get("/ground-truth/{evaluation_id}", response_model=GroundTruthData)
async def get_ground_truth_by_id(evaluation_id: str):
    """Get ground truth data by evaluation ID"""
    if evaluation_id not in ground_truth_data:
        raise HTTPException(status_code=404, detail="Ground truth data not found")
    
    return ground_truth_data[evaluation_id]

@app.get("/export/{format}", response_model=ExportResponse)
async def export_data(
    format: ExportFormat,
    background_tasks: BackgroundTasks,
    file_ids: str = None,
    date_from: str = None,
    date_to: str = None,
    include_metadata: bool = True
):
    """Export ground truth data in specified format"""
    try:
        # Parse parameters
        file_id_list = file_ids.split(",") if file_ids else None
        date_from_dt = datetime.fromisoformat(date_from) if date_from else None
        date_to_dt = datetime.fromisoformat(date_to) if date_to else None
        
        # Filter data
        filtered_data = []
        for gt_data in ground_truth_data.values():
            # Apply file ID filter
            if file_id_list and gt_data.file_id not in file_id_list:
                continue
            
            # Apply date filter
            if date_from_dt and gt_data.created_at < date_from_dt:
                continue
            if date_to_dt and gt_data.created_at > date_to_dt:
                continue
            
            filtered_data.append(gt_data)
        
        if not filtered_data:
            raise HTTPException(status_code=404, detail="No data found for export")
        
        # Create export
        export_id = str(uuid.uuid4())
        filename = f"ground_truth_export_{export_id}.{format.value}"
        file_path = os.path.join(EXPORT_FOLDER, filename)
        
        # Start background export task
        background_tasks.add_task(
            perform_export, 
            filtered_data, 
            file_path, 
            format, 
            include_metadata,
            export_id
        )
        
        return ExportResponse(
            export_id=export_id,
            format=format,
            file_path=file_path,
            file_size=0,  # Will be updated by background task
            segments_count=sum(len(gt.segments) for gt in filtered_data),
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.get("/export/{export_id}/status", response_model=ExportResponse)
async def get_export_status(export_id: str):
    """Get export status"""
    if export_id not in export_files:
        raise HTTPException(status_code=404, detail="Export not found")
    
    return export_files[export_id]

@app.get("/export/{export_id}/download")
async def download_export(export_id: str):
    """Download exported file"""
    if export_id not in export_files:
        raise HTTPException(status_code=404, detail="Export not found")
    
    export_info = export_files[export_id]
    file_path = export_info.file_path
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(
        path=file_path,
        filename=os.path.basename(file_path),
        media_type="application/octet-stream"
    )

@app.get("/metrics", response_model=MetricsData)
async def get_metrics():
    """Get system metrics"""
    try:
        # Calculate metrics from ground truth data
        total_files = len(set(gt.file_id for gt in ground_truth_data.values()))
        total_evaluations = len(ground_truth_data)
        total_segments = sum(len(gt.segments) for gt in ground_truth_data.values())
        
        # Segment status counts
        status_counts = defaultdict(int)
        confidence_scores = []
        editor_counts = defaultdict(int)
        
        for gt_data in ground_truth_data.values():
            for segment in gt_data.segments:
                status_counts[segment.status] += 1
                if segment.confidence is not None:
                    confidence_scores.append(segment.confidence)
                editor_counts[segment.edited_by] += 1
        
        approved_segments = status_counts.get("approved", 0)
        edited_segments = status_counts.get("edited", 0)
        rejected_segments = status_counts.get("rejected", 0)
        pending_segments = status_counts.get("pending", 0)
        
        average_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        completion_rate = (approved_segments + edited_segments + rejected_segments) / total_segments if total_segments > 0 else 0.0
        
        # Top editors
        top_editors = [
            {"editor": editor, "segments": count}
            for editor, count in sorted(editor_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        # Daily stats (mock data for demo)
        daily_stats = []
        for i in range(7):
            date = datetime.utcnow() - timedelta(days=i)
            daily_stats.append({
                "date": date.date().isoformat(),
                "segments_evaluated": total_segments // 7,  # Mock data
                "completion_rate": completion_rate
            })
        
        return MetricsData(
            total_files=total_files,
            total_evaluations=total_evaluations,
            total_segments=total_segments,
            approved_segments=approved_segments,
            edited_segments=edited_segments,
            rejected_segments=rejected_segments,
            pending_segments=pending_segments,
            average_confidence=average_confidence,
            completion_rate=completion_rate,
            top_editors=top_editors,
            daily_stats=daily_stats
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

@app.get("/stats", response_model=StorageStats)
async def get_storage_stats():
    """Get storage statistics"""
    try:
        # Calculate storage size (mock calculation)
        total_size = len(ground_truth_data) * 1024  # Mock size calculation
        
        return StorageStats(
            total_ground_truth_records=len(ground_truth_data),
            total_export_files=len(export_files),
            storage_size_bytes=total_size,
            last_backup=datetime.utcnow() - timedelta(hours=6),  # Mock backup time
            data_integrity_score=0.98  # Mock integrity score
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get storage stats: {str(e)}")

async def perform_export(
    data: List[GroundTruthData],
    file_path: str,
    format: ExportFormat,
    include_metadata: bool,
    export_id: str
):
    """Background task to perform data export"""
    try:
        # Prepare data for export
        export_data = []
        for gt_data in data:
            for segment in gt_data.segments:
                export_row = {
                    "segment_id": segment.segment_id,
                    "start_time": segment.start_time,
                    "end_time": segment.end_time,
                    "original_text": segment.original_text,
                    "translated_text": segment.translated_text,
                    "approved_translation": segment.approved_translation,
                    "status": segment.status,
                    "edited_by": segment.edited_by,
                    "edited_at": segment.edited_at.isoformat(),
                    "confidence": segment.confidence,
                    "notes": segment.notes
                }
                
                if include_metadata:
                    export_row.update({
                        "file_id": gt_data.file_id,
                        "evaluation_id": gt_data.evaluation_id,
                        "created_at": gt_data.created_at.isoformat(),
                        "version": gt_data.version
                    })
                
                export_data.append(export_row)
        
        # Export based on format
        if format == ExportFormat.JSON:
            async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(export_data, indent=2, ensure_ascii=False))
        
        elif format == ExportFormat.CSV:
            df = pd.DataFrame(export_data)
            df.to_csv(file_path, index=False, encoding='utf-8')
        
        elif format == ExportFormat.EXCEL:
            df = pd.DataFrame(export_data)
            df.to_excel(file_path, index=False, engine='openpyxl')
        
        # Update export info
        file_size = os.path.getsize(file_path)
        export_files[export_id] = ExportResponse(
            export_id=export_id,
            format=format,
            file_path=file_path,
            file_size=file_size,
            segments_count=len(export_data),
            created_at=datetime.utcnow(),
            download_url=f"/export/{export_id}/download"
        )
        
        print(f"Export {export_id} completed successfully")
        
    except Exception as e:
        print(f"Export {export_id} failed: {e}")
        # Store error info
        export_files[export_id] = ExportResponse(
            export_id=export_id,
            format=format,
            file_path="",
            file_size=0,
            segments_count=0,
            created_at=datetime.utcnow()
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004) 