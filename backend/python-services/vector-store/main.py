from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
import asyncio
import json
import logging
from datetime import datetime, timedelta
import uuid
import numpy as np
from pathlib import Path
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VAL Vector Store Service", version="1.0.0")

class Document(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any]
    client_id: str
    document_type: str  # meeting, research, task, chat
    created_at: str

class QueryRequest(BaseModel):
    client_id: str
    query: str
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None

class QueryResult(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    query_time: float
    documents_found: int

class EmbeddingRequest(BaseModel):
    texts: List[str]

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int

class MockEmbeddingEngine:
    """Mock embedding service for demonstration"""

    def __init__(self, embedding_dim: int = 384):
        self.embedding_dim = embedding_dim

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate mock embeddings for texts"""
        logger.info(f"Generating embeddings for {len(texts)} texts")

        # Simulate processing time
        await asyncio.sleep(0.5)

        # Generate deterministic but unique embeddings based on text content
        embeddings = []
        for text in texts:
            # Create a pseudo-random but consistent embedding
            hash_val = hash(text) % 10000
            base_embedding = np.random.RandomState(hash_val).normal(0, 1, self.embedding_dim)
            embeddings.append(base_embedding.tolist())

        return embeddings

class VectorStore:
    """In-memory vector store for demonstration"""

    def __init__(self):
        self.documents = {}  # doc_id -> Document
        self.embeddings = {}  # doc_id -> embedding
        self.client_indices = {}  # client_id -> [doc_ids]
        self.embedding_engine = MockEmbeddingEngine()
        self.storage_dir = Path("vector_store")
        self.storage_dir.mkdir(exist_ok=True)

    async def add_document(self, document: Document) -> bool:
        """Add document to vector store"""
        try:
            # Generate embedding
            embedding = await self.embedding_engine.embed_texts([document.content])
            self.embeddings[document.id] = embedding[0]
            self.documents[document.id] = document

            # Update client index
            if document.client_id not in self.client_indices:
                self.client_indices[document.client_id] = []
            self.client_indices[document.client_id].append(document.id)

            logger.info(f"Added document {document.id} to vector store")
            return True

        except Exception as e:
            logger.error(f"Failed to add document: {str(e)}")
            return False

    async def search(self, query: str, client_id: str, top_k: int = 5, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        try:
            if client_id not in self.client_indices:
                return []

            # Generate query embedding
            query_embedding = await self.embedding_engine.embed_texts([query])
            query_vec = np.array(query_embedding[0])

            # Get candidate documents
            candidate_ids = self.client_indices[client_id]
            if not candidate_ids:
                return []

            # Calculate similarities
            results = []
            for doc_id in candidate_ids:
                if doc_id not in self.documents or doc_id not in self.embeddings:
                    continue

                doc = self.documents[doc_id]
                doc_embedding = np.array(self.embeddings[doc_id])

                # Apply filters if provided
                if filters:
                    match = True
                    for key, value in filters.items():
                        if key not in doc.metadata or doc.metadata[key] != value:
                            match = False
                            break
                    if not match:
                        continue

                # Calculate cosine similarity
                similarity = np.dot(query_vec, doc_embedding) / (
                    np.linalg.norm(query_vec) * np.linalg.norm(doc_embedding)
                )

                results.append({
                    "document": doc,
                    "similarity": float(similarity),
                    "doc_id": doc_id
                })

            # Sort by similarity and return top_k
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]

        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            return []

    def get_client_documents(self, client_id: str) -> List[Document]:
        """Get all documents for a client"""
        if client_id not in self.client_indices:
            return []

        documents = []
        for doc_id in self.client_indices[client_id]:
            if doc_id in self.documents:
                documents.append(self.documents[doc_id])

        return documents

    def save_to_disk(self):
        """Save vector store to disk"""
        try:
            data = {
                "documents": {k: v.dict() for k, v in self.documents.items()},
                "embeddings": self.embeddings,
                "client_indices": self.client_indices
            }

            with open(self.storage_dir / "vector_store.pkl", "wb") as f:
                pickle.dump(data, f)

            logger.info("Vector store saved to disk")
        except Exception as e:
            logger.error(f"Failed to save vector store: {str(e)}")

    def load_from_disk(self):
        """Load vector store from disk"""
        try:
            file_path = self.storage_dir / "vector_store.pkl"
            if file_path.exists():
                with open(file_path, "rb") as f:
                    data = pickle.load(f)

                self.documents = {k: Document(**v) for k, v in data["documents"].items()}
                self.embeddings = data["embeddings"]
                self.client_indices = data["client_indices"]

                logger.info("Vector store loaded from disk")
        except Exception as e:
            logger.error(f"Failed to load vector store: {str(e)}")

class RAGEngine:
    """Retrieval-Augmented Generation engine"""

    def __init__(self):
        self.mock_responses = {
            "meeting": "Based on our meeting transcripts, I found that you discussed {topic} in your last meeting on {date}. The key points were {summary}.",
            "research": "According to the research data I have, {company} is a {industry} company with {size} employees. Key information includes {details}.",
            "task": "There are {count} tasks related to this query. The most relevant one is '{task_title}' assigned to {assignee}, due on {due_date}.",
            "general": "Based on the available information, I can provide insights about {query}. The most relevant data suggests {summary}."
        }

    async def generate_response(self, query: str, retrieved_docs: List[Dict[str, Any]]) -> str:
        """Generate response based on retrieved documents"""
        if not retrieved_docs:
            return "I don't have specific information about that in my current knowledge base. Could you provide more context or check back after we've gathered more data?"

        # Analyze query and retrieved documents to determine response type
        query_lower = query.lower()
        response_templates = []

        # Extract key information from retrieved documents
        doc_contents = [doc["document"].content for doc in retrieved_docs]
        doc_types = [doc["document"].document_type for doc in retrieved_docs]

        # Generate contextual response
        if "meeting" in query_lower or "discuss" in query_lower:
            if "meeting" in doc_types:
                meeting_doc = next((doc for doc in retrieved_docs if doc["document"].document_type == "meeting"), None)
                if meeting_doc:
                    return f"Based on our meeting transcripts, in your recent discussions you covered topics related to {query}. The meeting highlighted important points about operational challenges and potential solutions. Key participants included various stakeholders from different departments."

        if "task" in query_lower or "todo" in query_lower or "pending" in query_lower:
            if "task" in doc_types:
                return f"I found several relevant tasks in your system. There are currently pending items that require attention, including project deliverables and follow-up actions. The highest priority task involves preparing documentation for the next phase of the project."

        if "client" in query_lower or "company" in query_lower:
            if "research" in doc_types:
                return f"Based on the research data I have, this client is in the technology sector with a focus on enterprise solutions. They've shown consistent growth and recently secured significant funding. The company is expanding operations and investing in new technologies."

        # Default response
        return f"Based on the available information from your meetings, research, and current tasks, I can see that there's ongoing activity related to {query}. The data suggests continued engagement and progress on multiple fronts. Would you like me to focus on any specific aspect?"

vector_store = VectorStore()
rag_engine = RAGEngine()

# Initialize with some sample data
async def initialize_sample_data():
    """Initialize vector store with sample data"""
    sample_documents = [
        Document(
            id="doc-1",
            content="Initial discovery call with client to discuss operational challenges including data silos and communication issues between departments.",
            metadata={"meeting_title": "Initial Discovery Call", "date": "2024-01-15", "participants": ["CEO", "CTO"]},
            client_id="acme-corp",
            document_type="meeting",
            created_at="2024-01-15T10:00:00Z"
        ),
        Document(
            id="doc-2",
            content="Technical requirements review meeting focusing on microservices architecture and cloud migration strategy.",
            metadata={"meeting_title": "Technical Review", "date": "2024-01-22", "participants": ["CTO", "Lead Developer"]},
            client_id="acme-corp",
            document_type="meeting",
            created_at="2024-01-22T14:00:00Z"
        ),
        Document(
            id="doc-3",
            content="Acme Corporation is a leading technology company specializing in enterprise software solutions with 1000-5000 employees.",
            metadata={"source": "company_website", "category": "company_info"},
            client_id="acme-corp",
            document_type="research",
            created_at="2024-01-10T09:00:00Z"
        ),
        Document(
            id="doc-4",
            content="Task: Prepare project proposal draft for Phase 1 implementation. High priority, assigned to John Smith, due January 20th.",
            metadata={"task_title": "Project Proposal", "priority": "high", "assignee": "John Smith"},
            client_id="acme-corp",
            document_type="task",
            created_at="2024-01-16T11:00:00Z"
        ),
        Document(
            id="doc-5",
            content="Client expressed satisfaction with initial discussions and requested detailed proposal for budget approval.",
            metadata={"chat_type": "follow_up", "sentiment": "positive"},
            client_id="acme-corp",
            document_type="chat",
            created_at="2024-01-23T16:30:00Z"
        )
    ]

    for doc in sample_documents:
        await vector_store.add_document(doc)

    logger.info("Sample data initialized in vector store")

@app.on_event("startup")
async def startup_event():
    """Initialize the service"""
    vector_store.load_from_disk()
    await initialize_sample_data()

@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on shutdown"""
    vector_store.save_to_disk()

@app.post("/embed", response_model=EmbeddingResponse)
async def create_embeddings(request: EmbeddingRequest):
    """Create embeddings for texts"""
    try:
        embeddings = await vector_store.embedding_engine.embed_texts(request.texts)
        return EmbeddingResponse(
            embeddings=embeddings,
            dimension=len(embeddings[0]) if embeddings else 0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding creation failed: {str(e)}")

@app.post("/add-document")
async def add_document(document: Document):
    """Add a document to the vector store"""
    success = await vector_store.add_document(document)
    if success:
        return {"success": True, "message": "Document added successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to add document")

@app.post("/query", response_model=QueryResult)
async def query_documents(request: QueryRequest):
    """Query documents using semantic search"""
    start_time = datetime.now()

    try:
        # Retrieve relevant documents
        retrieved_docs = await vector_store.search(
            query=request.query,
            client_id=request.client_id,
            top_k=request.top_k,
            filters=request.filters
        )

        # Generate response using RAG
        response = await rag_engine.generate_response(request.query, retrieved_docs)

        # Format sources
        sources = []
        for doc in retrieved_docs:
            sources.append({
                "type": doc["document"].document_type,
                "name": doc["document"].metadata.get("meeting_title",
                       doc["document"].metadata.get("task_title",
                       doc["document"].metadata.get("source", "Document"))),
                "similarity": round(doc["similarity"], 3),
                "snippet": doc["document"].content[:100] + "..." if len(doc["document"].content) > 100 else doc["document"].content
            })

        query_time = (datetime.now() - start_time).total_seconds()

        return QueryResult(
            response=response,
            sources=sources,
            query_time=query_time,
            documents_found=len(retrieved_docs)
        )

    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.get("/documents/{client_id}")
async def get_client_documents(client_id: str, document_type: Optional[str] = None):
    """Get all documents for a client"""
    documents = vector_store.get_client_documents(client_id)

    if document_type:
        documents = [doc for doc in documents if doc.document_type == document_type]

    return {
        "client_id": client_id,
        "document_count": len(documents),
        "documents": [doc.dict() for doc in documents]
    }

@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document from the vector store"""
    try:
        if document_id not in vector_store.documents:
            raise HTTPException(status_code=404, detail="Document not found")

        doc = vector_store.documents[document_id]
        client_id = doc.client_id

        # Remove from storage
        del vector_store.documents[document_id]
        if document_id in vector_store.embeddings:
            del vector_store.embeddings[document_id]

        # Remove from client index
        if client_id in vector_store.client_indices:
            vector_store.client_indices[client_id] = [
                doc_id for doc_id in vector_store.client_indices[client_id]
                if doc_id != document_id
            ]

        return {"success": True, "message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@app.get("/status")
async def get_status():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "vector-store",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "total_documents": len(vector_store.documents),
        "clients": list(vector_store.client_indices.keys()),
        "embedding_dimension": vector_store.embedding_engine.embedding_dim
    }

@app.post("/reset")
async def reset_vector_store():
    """Reset the vector store (for testing)"""
    vector_store.documents.clear()
    vector_store.embeddings.clear()
    vector_store.client_indices.clear()
    await initialize_sample_data()
    return {"success": True, "message": "Vector store reset and reinitialized"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)