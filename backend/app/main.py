from fastapi import FastAPI
from app.api import ingest, generate
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer
import os
import logging
import sys

# Configure logging to work with uvicorn
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Set log level for our modules
logging.getLogger('utils.file_reader').setLevel(logging.INFO)
logging.getLogger('api.ingest').setLevel(logging.INFO)

security = HTTPBearer()
app = FastAPI(title="Simple Agentic RAG API", swagger_ui_parameters={"persistAuthorization": True})


app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],  # For testing; restrict this in production
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )


app.include_router(ingest.router, prefix="/api", tags=["Ingest"])
app.include_router(generate.router, prefix="/api", tags=["Generate"])

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/")
def display_page():
    return "FAstAPI code running"