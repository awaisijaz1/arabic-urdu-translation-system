from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import os
from typing import Optional
import json
from datetime import datetime

app = FastAPI(title="Translation Evaluation API Gateway", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
INPUT_SERVICE_URL = os.getenv("INPUT_SERVICE_URL", "http://localhost:8001")
TRANSLATION_SERVICE_URL = os.getenv("TRANSLATION_SERVICE_URL", "http://localhost:8002")
EVALUATION_SERVICE_URL = os.getenv("EVALUATION_SERVICE_URL", "http://localhost:8003")
STORAGE_SERVICE_URL = os.getenv("STORAGE_SERVICE_URL", "http://localhost:8004")

# Security
security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token with evaluation service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{EVALUATION_SERVICE_URL}/auth/verify",
                headers={"Authorization": f"Bearer {credentials.credentials}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    services_status = {}
    
    # Check each service
    services = {
        "input": INPUT_SERVICE_URL,
        "translation": TRANSLATION_SERVICE_URL,
        "evaluation": EVALUATION_SERVICE_URL,
        "storage": STORAGE_SERVICE_URL
    }
    
    async with httpx.AsyncClient() as client:
        for service_name, url in services.items():
            try:
                response = await client.get(f"{url}/health", timeout=5.0)
                services_status[service_name] = "healthy" if response.status_code == 200 else "unhealthy"
            except Exception:
                services_status[service_name] = "unreachable"
    
    return {
        "status": "healthy" if all(status == "healthy" for status in services_status.values()) else "degraded",
        "services": services_status,
        "timestamp": datetime.utcnow().isoformat()
    }

# Input Service Routes
@app.post("/upload")
async def upload_file(request: Request):
    """Upload file to input service"""
    try:
        async with httpx.AsyncClient() as client:
            # Forward the request to input service
            response = await client.post(
                f"{INPUT_SERVICE_URL}/upload",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/upload/url")
async def upload_file_from_url(request: Request):
    """Upload file from URL to input service"""
    try:
        async with httpx.AsyncClient() as client:
            # Forward the request to input service
            response = await client.post(
                f"{INPUT_SERVICE_URL}/upload/url",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL upload failed: {str(e)}")

@app.get("/files")
async def list_files():
    """List uploaded files"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{INPUT_SERVICE_URL}/files")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@app.get("/files/{file_id}")
async def get_file_info(file_id: str):
    """Get information about a specific file"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{INPUT_SERVICE_URL}/files/{file_id}")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file info: {str(e)}")

@app.get("/files/{file_id}/content")
async def get_file_content(file_id: str):
    """Get parsed content of a file"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{INPUT_SERVICE_URL}/files/{file_id}/content")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file content: {str(e)}")

# Translation Service Routes
@app.post("/translate")
async def translate_text(request: Request):
    """Translate text using translation service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TRANSLATION_SERVICE_URL}/translate",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

@app.get("/translation-status/{job_id}")
async def get_translation_status(job_id: str):
    """Get translation job status"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSLATION_SERVICE_URL}/status/{job_id}")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

# LLM Translation Routes
@app.post("/translate/llm")
async def start_llm_translation(request: Request):
    """Start LLM-based translation job"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TRANSLATION_SERVICE_URL}/translate/llm",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM translation failed: {str(e)}")

@app.get("/translate/llm/job/{job_id}")
async def get_llm_translation_status(job_id: str):
    """Get LLM translation job status and results"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSLATION_SERVICE_URL}/translate/llm/job/{job_id}")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get translation status: {str(e)}")

@app.get("/translate/llm")
async def list_llm_translations():
    """List all LLM translation jobs"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSLATION_SERVICE_URL}/translate/llm")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list LLM translations: {str(e)}")

@app.post("/translate/llm/{job_id}/update")
async def update_llm_translation(job_id: str, request: Request):
    """Update a specific segment translation"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TRANSLATION_SERVICE_URL}/translate/llm/{job_id}/update",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update LLM translation: {str(e)}")

@app.get("/translate/llm/metrics")
async def get_llm_translation_metrics():
    """Get LLM translation metrics and benchmarks"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSLATION_SERVICE_URL}/translate/llm/metrics")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get LLM metrics: {str(e)}")

@app.get("/translate/llm/config")
async def get_llm_config():
    """Get current LLM configuration"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TRANSLATION_SERVICE_URL}/translate/llm/config")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get LLM config: {str(e)}")

@app.post("/translate/llm/config")
async def update_llm_config(request: Request):
    """Update LLM configuration"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TRANSLATION_SERVICE_URL}/translate/llm/config",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update LLM config: {str(e)}")

@app.post("/translate/llm/{job_id}/approve")
async def approve_llm_translation(job_id: str, request: Request):
    """Approve LLM translation job and move to ground truth"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TRANSLATION_SERVICE_URL}/translate/llm/{job_id}/approve",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve translation: {str(e)}")

# Evaluation Service Routes
@app.post("/auth/login")
async def login(request: Request):
    """Login endpoint"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{EVALUATION_SERVICE_URL}/auth/login",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.post("/auth/verify")
async def verify_auth(request: Request):
    """Verify authentication token"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{EVALUATION_SERVICE_URL}/auth/verify",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token verification failed: {str(e)}")

@app.get("/users/me")
async def get_current_user(request: Request):
    """Get current user information"""
    try:
        # Get the Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        # Forward the request with the Authorization header
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{EVALUATION_SERVICE_URL}/users/me",
                headers={"Authorization": auth_header}
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user info: {str(e)}")

@app.get("/evaluations")
async def get_evaluations(token: dict = Depends(verify_token)):
    """Get evaluations (requires authentication)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{EVALUATION_SERVICE_URL}/evaluations")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get evaluations: {str(e)}")

@app.post("/evaluations")
async def create_evaluation(request: Request):
    """Create evaluation (requires authentication)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{EVALUATION_SERVICE_URL}/evaluations",
                content=await request.body(),
                headers={"Content-Type": "application/json"}
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create evaluation: {str(e)}")

@app.put("/evaluations/{evaluation_id}")
async def update_evaluation(evaluation_id: str, request: Request, token: dict = Depends(verify_token)):
    """Update evaluation (requires authentication)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{EVALUATION_SERVICE_URL}/evaluations/{evaluation_id}",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update evaluation: {str(e)}")

# Storage Service Routes
@app.get("/ground-truth", dependencies=[])
async def get_ground_truth():
    """Get ground truth data"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{STORAGE_SERVICE_URL}/ground-truth")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ground truth: {str(e)}")

@app.get("/ground-truth-test")
async def get_ground_truth_test():
    """Get ground truth data (test endpoint without auth)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{STORAGE_SERVICE_URL}/ground-truth")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ground truth: {str(e)}")

@app.post("/ground-truth")
async def save_ground_truth(request: Request, token: dict = Depends(verify_token)):
    """Save ground truth data (requires authentication)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{STORAGE_SERVICE_URL}/ground-truth",
                content=await request.body(),
                headers=dict(request.headers)
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save ground truth: {str(e)}")

@app.get("/export/{format}", dependencies=[])
async def export_data(format: str):
    """Export data in specified format"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{STORAGE_SERVICE_URL}/export/{format}")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")

@app.get("/export/{export_id}/status", dependencies=[])
async def get_export_status(export_id: str):
    """Get export status"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{STORAGE_SERVICE_URL}/export/{export_id}/status")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get export status: {str(e)}")

@app.get("/export/{export_id}/download", dependencies=[])
async def download_export(export_id: str):
    """Download exported file"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{STORAGE_SERVICE_URL}/export/{export_id}/download")
            return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download export: {str(e)}")

@app.get("/metrics")
async def get_metrics(token: dict = Depends(verify_token)):
    """Get system metrics (requires authentication)"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{STORAGE_SERVICE_URL}/metrics")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 