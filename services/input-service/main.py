from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import aiofiles
import uuid
from datetime import datetime
from typing import List
import json
import httpx

from models import FileUploadResponse, FileInfo, ParsedContent, TranslationReviewRequest

class UrlUploadRequest(BaseModel):
    file_url: str
from parsers import ParserFactory

app = FastAPI(title="Input Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/input.db")

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs("./data", exist_ok=True)

# In-memory storage for demo (replace with database in production)
uploaded_files = {}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "input-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Upload and parse a file (SRT or JSON) with existing translations"""
    
    # Validate file type
    allowed_extensions = ['.srt', '.json']
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique file ID
    file_id = str(uuid.uuid4())
    
    # Save file
    file_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{file.filename}")
    
    try:
        # Read file content
        content = await file.read()
        content_str = content.decode('utf-8')
        
        # Save file to disk
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Parse file content
        parser = ParserFactory.get_parser(file_extension)
        parsed_content = parser.parse(content_str)
        
        # Store file information
        file_info = FileInfo(
            file_id=file_id,
            filename=file.filename,
            file_type=file_extension,
            segments_count=len(parsed_content.segments),
            upload_time=datetime.utcnow(),
            status="uploaded",
            file_size=len(content)
        )
        
        uploaded_files[file_id] = {
            "info": file_info,
            "content": parsed_content,
            "file_path": file_path
        }
        
        # Background task to process file
        background_tasks.add_task(process_uploaded_file, file_id)
        
        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            file_type=file_extension,
            segments_count=len(parsed_content.segments),
            upload_time=datetime.utcnow(),
            status="uploaded"
        )
        
    except Exception as e:
        # Clean up on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/upload/url", response_model=FileUploadResponse)
async def upload_file_from_url(
    background_tasks: BackgroundTasks,
    request: UrlUploadRequest
):
    """Upload and parse a file from URL (SRT or JSON) with existing translations"""
    
    # Validate URL
    if not request.file_url.startswith(('http://', 'https://')):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL. Must start with http:// or https://"
        )
    
    # Validate file type from URL
    allowed_extensions = ['.srt', '.json']
    file_extension = None
    for ext in allowed_extensions:
        if request.file_url.lower().endswith(ext):
            file_extension = ext
            break
    
    if not file_extension:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. URL must end with: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique file ID
    file_id = str(uuid.uuid4())
    
    # Extract filename from URL
    filename = request.file_url.split('/')[-1].split('?')[0]
    if not filename:
        filename = f"file{file_extension}"
    
    # Save file path
    file_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_{filename}")
    
    try:
        # Download file from URL
        async with httpx.AsyncClient() as client:
            response = await client.get(request.file_url, timeout=30.0)
            response.raise_for_status()
            content = response.content
        
        # Save file to disk
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Parse file content
        content_str = content.decode('utf-8')
        parser = ParserFactory.get_parser(file_extension)
        parsed_content = parser.parse(content_str)
        
        # Store file information
        file_info = FileInfo(
            file_id=file_id,
            filename=filename,
            file_type=file_extension,
            segments_count=len(parsed_content.segments),
            upload_time=datetime.utcnow(),
            status="uploaded",
            file_size=len(content)
        )
        
        uploaded_files[file_id] = {
            "info": file_info,
            "content": parsed_content,
            "file_path": file_path
        }
        
        # Background task to process file
        background_tasks.add_task(process_uploaded_file, file_id)
        
        return FileUploadResponse(
            file_id=file_id,
            filename=filename,
            file_type=file_extension,
            segments_count=len(parsed_content.segments),
            upload_time=datetime.utcnow(),
            status="uploaded"
        )
        
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to download file: HTTP {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Failed to download file: {str(e)}")
    except Exception as e:
        # Clean up on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"URL upload failed: {str(e)}")

@app.get("/files", response_model=List[FileInfo])
async def list_files():
    """List all uploaded files"""
    return [file_data["info"] for file_data in uploaded_files.values()]

@app.get("/files/{file_id}")
async def get_file_info(file_id: str):
    """Get information about a specific file"""
    if file_id not in uploaded_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    return uploaded_files[file_id]["info"]

@app.get("/files/{file_id}/content")
async def get_file_content(file_id: str):
    """Get parsed content of a file"""
    if file_id not in uploaded_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    return uploaded_files[file_id]["content"]

@app.post("/files/{file_id}/review")
async def request_translation_review(file_id: str):
    """Request review for a file with existing translations"""
    if file_id not in uploaded_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_data = uploaded_files[file_id]
    content = file_data["content"]
    
    # Create translation review request
    review_request = TranslationReviewRequest(
        file_id=file_id,
        segments=content.segments
    )
    
    # In a real implementation, this would be sent to the evaluation service
    # For now, we'll just return the request structure
    return {
        "request_id": str(uuid.uuid4()),
        "file_id": file_id,
        "segments_count": len(content.segments),
        "status": "ready_for_review",
        "message": "File ready for translation review"
    }

@app.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Delete an uploaded file"""
    if file_id not in uploaded_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_data = uploaded_files[file_id]
    file_path = file_data["file_path"]
    
    try:
        # Remove file from disk
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Remove from memory
        del uploaded_files[file_id]
        
        return {"message": "File deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

async def process_uploaded_file(file_id: str):
    """Background task to process uploaded file"""
    try:
        # This is where you would add additional processing
        # such as validation, indexing, etc.
        print(f"Processing file {file_id}")
        
        # Update status
        if file_id in uploaded_files:
            uploaded_files[file_id]["info"].status = "processed"
            
    except Exception as e:
        print(f"Error processing file {file_id}: {e}")
        if file_id in uploaded_files:
            uploaded_files[file_id]["info"].status = "error"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 