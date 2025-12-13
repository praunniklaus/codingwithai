"""FastAPI server for job application assistant frontend.

This provides REST API endpoints for the frontend to interact with the agents.
"""

import os
import sys
import logging
import tempfile
import shutil
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .cv_crafter_agent import CVCrafterAgent, CVCrafterConfig
from .job_database_client import JobDatabaseClient
from .job_llm_providers import JobLLMProviderManager
from .cv_parser_agent import handle_cv_parse


# Default to a broadly available Anthropic model; allow override via env.
ANTHROPIC_DEFAULT_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)


# Request/Response models
class CreateApplicationRequest(BaseModel):
    user_id: str
    job_id: int
    notes: Optional[str] = None
    status: str = "draft"  # Default to draft so CV Crafter picks it up


class GenerateCVRequest(BaseModel):
    user_id: str
    job_id: int
    format: str = "markdown"


class GenerateCoverLetterRequest(BaseModel):
    user_id: str
    job_id: int
    tone: str = "professional"


# Global instances
db_client: Optional[JobDatabaseClient] = None
llm_manager: Optional[JobLLMProviderManager] = None
cv_crafter: Optional[CVCrafterAgent] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources."""
    global db_client, llm_manager, cv_crafter
    
    # Load environment
    database_url = os.environ.get("DATABASE_URL")
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
    grok_api_key = os.environ.get("GROK_API_KEY") or os.environ.get("XAI_API_KEY")
    
    if not database_url:
        raise RuntimeError("DATABASE_URL not set")
    
    # Initialize database client
    db_client = JobDatabaseClient(database_url)
    await db_client.connect()
    
    # Initialize LLM manager
    llm_manager = JobLLMProviderManager(
        openai_api_key=openai_api_key,
        anthropic_api_key=anthropic_api_key,
        grok_api_key=grok_api_key,
    )
    
    # Initialize CV Crafter agent (for on-demand CV generation)
    cv_crafter_config = CVCrafterConfig(
        name="CV Crafter API",
        agent_id="cv-crafter-api",
        database_url=database_url,
        llm_provider="anthropic",
        llm_api_key=anthropic_api_key,
        llm_model=ANTHROPIC_DEFAULT_MODEL,
        target_user_id="",  # Will be set per request
    )
    cv_crafter = CVCrafterAgent(cv_crafter_config, llm_manager, use_sandbox=False)
    await cv_crafter.connect()
    
    print("API Server initialized")
    
    yield
    
    # Cleanup
    if cv_crafter:
        await cv_crafter.disconnect()
    if db_client:
        await db_client.disconnect()
    print("API Server shutdown")


app = FastAPI(title="Job Application Assistant API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite/React default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/api/cv/parse")
async def parse_cv(file: UploadFile = File(...)):
    """Upload a CV file and return extracted fields using sandboxed parser."""
    tmp_path = None
    try:
        logger.info(f"[CV Parse] Received file upload: {file.filename}")
        
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix="_cv_" + (file.filename or "uploaded")) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        
        logger.info(f"[CV Parse] Saved to temp: {tmp_path}")
        
        # Parse CV
        data = handle_cv_parse(tmp_path)
        logger.info(f"[CV Parse] Parsing succeeded, extracted keys: {list(data.keys())}")
        
        return {"extracted": data}
    except Exception as e:
        logger.error(f"[CV Parse] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@app.post("/api/applications")
async def create_application(request: CreateApplicationRequest):
    """Create a new job application."""
    try:
        # Create application using database client
        result = await db_client.create_application(
            request.user_id,
            request.job_id,
            request.status,
            request.notes,
        )
        
        return {
            "id": result["id"],
            "user_id": result["user_id"],
            "job_id": result["job_id"],
            "status": result["status"],
            "notes": result["notes"],
            "applied_date": result["applied_date"].isoformat() if result.get("applied_date") else None,
            "created_at": result["created_at"].isoformat() if result.get("created_at") else None,
            "updated_at": result["updated_at"].isoformat() if result.get("updated_at") else None,
        }
    except Exception as e:
        import traceback
        print(f"Error creating application: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to create application: {str(e)}")


@app.post("/api/generate-cv")
async def generate_cv(request: GenerateCVRequest):
    """Generate a CV for a specific job application on-demand."""
    try:
        logger.info(f"Generating CV for user {request.user_id}, job {request.job_id}")
        
        # Get user profile
        user_profile = await db_client.get_user_profile(request.user_id)
        if not user_profile:
            logger.warning(f"User profile not found: {request.user_id}")
            raise HTTPException(status_code=404, detail="User profile not found")
        
        logger.info(f"Found user profile: {user_profile.get('name')}")
        
        # Get job details
        job = await db_client.get_job_by_id(request.job_id)
        if not job:
            logger.warning(f"Job not found: {request.job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        logger.info(f"Found job: {job.get('title')} at {job.get('company')}")
        
        # Generate CV using LLM
        logger.info("Generating CV with LLM...")
        cv_result = llm_manager.generate_cv(
            "anthropic",  # Use Claude for CV generation
            ANTHROPIC_DEFAULT_MODEL,
            user_profile,
            job,
        )
        
        logger.info(f"CV generated, length: {len(cv_result.content)} chars")
        
        # Save CV to database
        saved_cv = await db_client.save_cv(
            request.user_id,
            request.job_id,
            cv_result.content,
            request.format,
        )
        
        logger.info(f"CV saved to database, id: {saved_cv['id']}")
        
        return {
            "id": saved_cv["id"],
            "user_id": saved_cv["user_id"],
            "job_id": saved_cv["job_id"],
            "content": saved_cv["content"],
            "format": saved_cv["format"],
            "version": saved_cv["version"],
            "created_at": saved_cv["created_at"].isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error generating CV: {str(e)}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to generate CV: {str(e)}")


@app.post("/api/generate-cover-letter")
async def generate_cover_letter(request: GenerateCoverLetterRequest):
    """Generate a cover letter for a specific job application on-demand."""
    try:
        # Get user profile
        user_profile = await db_client.get_user_profile(request.user_id)
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Get job details
        job = await db_client.get_job_by_id(request.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Generate cover letter using LLM
        cover_letter_result = llm_manager.generate_cover_letter(
            "anthropic",  # Use Claude for cover letter generation
            ANTHROPIC_DEFAULT_MODEL,
            user_profile,
            job,
            request.tone,
        )
        
        # Save cover letter to database
        saved_cover_letter = await db_client.save_cover_letter(
            request.user_id,
            request.job_id,
            cover_letter_result.content,
            request.tone,
        )
        
        return {
            "id": saved_cover_letter["id"],
            "user_id": saved_cover_letter["user_id"],
            "job_id": saved_cover_letter["job_id"],
            "content": saved_cover_letter["content"],
            "tone": saved_cover_letter["tone"],
            "version": saved_cover_letter["version"],
            "created_at": saved_cover_letter["created_at"].isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate cover letter: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
