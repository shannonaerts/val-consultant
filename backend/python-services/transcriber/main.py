from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
import logging
from datetime import datetime, timedelta
import uuid
import os
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VAL Transcriber Service", version="1.0.0")

class TranscribeRequest(BaseModel):
    audio_path: str
    client_id: str
    language: str = "en"
    speaker_diarization: bool = True

class TranscribeResult(BaseModel):
    success: bool
    transcript_url: str
    transcript_data: Dict[str, Any]
    processing_time: float
    message: str

class TranscriptSegment(BaseModel):
    speaker: str
    text: str
    timestamp: str
    confidence: float

class TranscriptData(BaseModel):
    segments: List[TranscriptSegment]
    summary: str
    duration: str
    word_count: int
    speaker_count: int
    language: str

class MockTranscriptionEngine:
    """Mock transcription service for demonstration"""

    def __init__(self):
        self.transcription_templates = {
            "initial_discovery": {
                "segments": [
                    {
                        "speaker": "client",
                        "text": "Thanks for taking the time to meet with us today. We're really excited about the possibility of working together.",
                        "timestamp": "00:00:15",
                        "confidence": 0.95
                    },
                    {
                        "speaker": "val",
                        "text": "The pleasure is all ours. We've been looking forward to this discussion. Can you start by telling us a bit about what prompted you to reach out?",
                        "timestamp": "00:00:25",
                        "confidence": 0.97
                    },
                    {
                        "speaker": "client",
                        "text": "Absolutely. We've been growing rapidly over the past year, and our current systems are really starting to show the strain. We're having issues with data silos, inefficient communication between departments, and a lack of real-time insights into our operations.",
                        "timestamp": "00:00:45",
                        "confidence": 0.94
                    },
                    {
                        "speaker": "val",
                        "text": "That sounds like a classic growth challenge that many of our clients face. Can you give me some specific examples of how these issues are impacting your day-to-day operations?",
                        "timestamp": "00:01:15",
                        "confidence": 0.96
                    },
                    {
                        "speaker": "client",
                        "text": "Sure. Just last week, we had a major client meeting where the sales team promised features that the engineering team had no idea about. That's a communication breakdown that cost us credibility. And our leadership team sometimes has to wait days for basic performance reports that should be available in real-time.",
                        "timestamp": "00:01:40",
                        "confidence": 0.93
                    },
                    {
                        "speaker": "val",
                        "text": "I see. Those are significant issues that can really impact business growth and client relationships. Based on what you've described, I believe we have several solutions that could help. Have you considered implementing an integrated platform that can break down these silos?",
                        "timestamp": "00:02:15",
                        "confidence": 0.95
                    }
                ],
                "summary": "Client expressed interest in operational efficiency solutions. Main challenges identified: data silos, inter-departmental communication issues, and lack of real-time insights. Specific examples included miscommunication between sales and engineering teams, and delayed reporting for leadership.",
                "duration": "45 minutes",
                "word_count": 285,
                "speaker_count": 2,
                "language": "en"
            },
            "technical_review": {
                "segments": [
                    {
                        "speaker": "client",
                        "text": "Let's dive into the technical requirements. Our current stack is primarily Python and React, with PostgreSQL as our main database.",
                        "timestamp": "00:00:30",
                        "confidence": 0.96
                    },
                    {
                        "speaker": "val",
                        "text": "Great, that aligns well with our expertise. Can you walk me through your current architecture and where you see the main pain points?",
                        "timestamp": "00:00:45",
                        "confidence": 0.94
                    },
                    {
                        "speaker": "client",
                        "text": "We have a monolithic application that's becoming increasingly difficult to maintain. Deployment times are getting longer, and different teams are stepping on each other's toes during development.",
                        "timestamp": "00:01:10",
                        "confidence": 0.95
                    },
                    {
                        "speaker": "val",
                        "text": "That sounds like a perfect candidate for microservices architecture. We could help you break down the monolith into manageable services. What's your team's experience with containerization and orchestration?",
                        "timestamp": "00:01:40",
                        "confidence": 0.97
                    },
                    {
                        "speaker": "client",
                        "text": "Some of our engineers have worked with Docker, but we haven't implemented Kubernetes at scale. We're concerned about the learning curve and operational overhead.",
                        "timestamp": "00:02:05",
                        "confidence": 0.94
                    },
                    {
                        "speaker": "val",
                        "text": "Those are valid concerns. We typically recommend a phased approach - start with a few non-critical services to build expertise, then gradually expand. We can also provide managed Kubernetes services to reduce operational burden.",
                        "timestamp": "00:02:35",
                        "confidence": 0.96
                    }
                ],
                "summary": "Technical discussion focused on modernizing monolithic application to microservices architecture. Current stack: Python, React, PostgreSQL. Main concerns: deployment complexity, team coordination, containerization learning curve. Proposed phased migration approach with managed Kubernetes support.",
                "duration": "60 minutes",
                "word_count": 198,
                "speaker_count": 2,
                "language": "en"
            },
            "demo_presentation": {
                "segments": [
                    {
                        "speaker": "val",
                        "text": "Good morning everyone, and thank you for joining us today. I'm excited to walk you through our proposed solution for your operational challenges.",
                        "timestamp": "00:00:20",
                        "confidence": 0.95
                    },
                    {
                        "speaker": "client",
                        "text": "We're looking forward to seeing what you've put together. The initial proposals looked promising.",
                        "timestamp": "00:00:35",
                        "confidence": 0.93
                    },
                    {
                        "speaker": "val",
                        "text": "Great. Let me start by sharing my screen and walking you through the three main components of our solution: the unified data platform, the real-time analytics dashboard, and the automated workflow engine.",
                        "timestamp": "00:01:00",
                        "confidence": 0.96
                    },
                    {
                        "speaker": "client",
                        "text": "This looks impressive. How quickly can we expect to see results once implementation begins?",
                        "timestamp": "00:15:30",
                        "confidence": 0.94
                    },
                    {
                        "speaker": "val",
                        "text": "We typically see initial benefits within 4-6 weeks, with full implementation taking about 3-4 months depending on the scope. The phased approach allows you to start seeing value quickly while we build out the complete solution.",
                        "timestamp": "00:16:00",
                        "confidence": 0.95
                    }
                ],
                "summary": "Demo presentation of proposed solution covering unified data platform, real-time analytics, and workflow automation. Client expressed interest in implementation timeline. Expected initial benefits: 4-6 weeks, full implementation: 3-4 months using phased approach.",
                "duration": "90 minutes",
                "word_count": 342,
                "speaker_count": 4,
                "language": "en"
            }
        }

    async def transcribe_audio(self, audio_path: str, meeting_type: str = "general") -> TranscriptData:
        """Simulate audio transcription process"""
        logger.info(f"Starting transcription for: {audio_path}")

        # Simulate processing time based on audio length
        processing_time = 5.0
        await asyncio.sleep(processing_time)

        # Select appropriate template based on meeting type
        if "discovery" in audio_path.lower() or "initial" in audio_path.lower():
            template = self.transcription_templates["initial_discovery"]
        elif "technical" in audio_path.lower() or "review" in audio_path.lower():
            template = self.transcription_templates["technical_review"]
        elif "demo" in audio_path.lower() or "presentation" in audio_path.lower():
            template = self.transcription_templates["demo_presentation"]
        else:
            template = self.transcription_templates["initial_discovery"]

        # Create transcript data
        transcript_data = TranscriptData(
            segments=[TranscriptSegment(**seg) for seg in template["segments"]],
            summary=template["summary"],
            duration=template["duration"],
            word_count=template["word_count"],
            speaker_count=template["speaker_count"],
            language=template["language"]
        )

        logger.info(f"Transcription completed for: {audio_path}")
        return transcript_data

class TranscriptionManager:
    """Manage transcription jobs and storage"""

    def __init__(self):
        self.transcriptions_dir = Path("transcriptions")
        self.transcriptions_dir.mkdir(exist_ok=True)
        self.engine = MockTranscriptionEngine()

    async def process_audio(self, request: TranscribeRequest) -> TranscribeResult:
        """Process audio file and return transcription"""
        start_time = datetime.now()

        try:
            # Generate unique ID for this transcription
            transcription_id = str(uuid.uuid4())

            # Transcribe the audio
            transcript_data = await self.engine.transcribe_audio(
                request.audio_path,
                "discovery"  # Default meeting type
            )

            # Save transcript to file
            transcript_file = self.transcriptions_dir / f"{transcription_id}.json"

            transcript_dict = {
                "id": transcription_id,
                "client_id": request.client_id,
                "audio_path": request.audio_path,
                "created_at": datetime.now().isoformat(),
                "transcript": transcript_data.dict()
            }

            with open(transcript_file, 'w') as f:
                json.dump(transcript_dict, f, indent=2)

            processing_time = (datetime.now() - start_time).total_seconds()

            return TranscribeResult(
                success=True,
                transcript_url=f"/transcripts/{transcription_id}",
                transcript_data=transcript_data.dict(),
                processing_time=processing_time,
                message=f"Transcription completed in {processing_time:.2f} seconds"
            )

        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    async def get_transcript(self, transcript_id: str) -> Dict[str, Any]:
        """Retrieve saved transcript"""
        transcript_file = self.transcriptions_dir / f"{transcript_id}.json"

        if not transcript_file.exists():
            raise HTTPException(status_code=404, detail="Transcript not found")

        with open(transcript_file, 'r') as f:
            return json.load(f)

manager = TranscriptionManager()

@app.post("/transcribe", response_model=TranscribeResult)
async def transcribe_audio(request: TranscribeRequest, background_tasks: BackgroundTasks):
    """Transcribe audio file"""

    if not os.path.exists(request.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    return await manager.process_audio(request)

@app.post("/transcribe-upload")
async def transcribe_uploaded_file(
    file: UploadFile = File(...),
    client_id: str = "",
    language: str = "en"
):
    """Transcribe uploaded audio file"""

    try:
        # Save uploaded file
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)

        file_path = upload_dir / f"{uuid.uuid4()}_{file.filename}"

        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Process transcription
        request = TranscribeRequest(
            audio_path=str(file_path),
            client_id=client_id,
            language=language
        )

        return await manager.process_audio(request)

    except Exception as e:
        logger.error(f"File upload transcription failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.get("/transcripts/{transcript_id}")
async def get_transcript(transcript_id: str):
    """Get transcript by ID"""
    try:
        transcript = await manager.get_transcript(transcript_id)
        return transcript
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve transcript: {str(e)}")

@app.get("/status")
async def get_status():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "transcriber",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "supported_formats": ["mp3", "wav", "m4a", "mp4"],
        "supported_languages": ["en", "es", "fr", "de"]
    }

@app.get("/transcripts")
async def list_transcripts(client_id: Optional[str] = None):
    """List all transcripts, optionally filtered by client"""

    transcripts = []

    for file_path in manager.transcriptions_dir.glob("*.json"):
        try:
            with open(file_path, 'r') as f:
                transcript = json.load(f)
                if client_id is None or transcript.get("client_id") == client_id:
                    transcripts.append({
                        "id": transcript["id"],
                        "client_id": transcript["client_id"],
                        "created_at": transcript["created_at"],
                        "duration": transcript["transcript"]["duration"],
                        "word_count": transcript["transcript"]["word_count"],
                        "speaker_count": transcript["transcript"]["speaker_count"]
                    })
        except Exception as e:
            logger.warning(f"Failed to read transcript file {file_path}: {str(e)}")

    # Sort by creation date (newest first)
    transcripts.sort(key=lambda x: x["created_at"], reverse=True)

    return {"transcripts": transcripts}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)