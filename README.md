# 🔧 AI Maintenance Copilot

An AI-powered assistant that lets industrial engineers query PDF maintenance manuals using natural language. Built with a full RAG (Retrieval-Augmented Generation) pipeline.

## Problem

Industrial engineers waste hours searching through hundreds of pages of maintenance manuals to find torque specs, safety procedures, or troubleshooting steps. This copilot lets them ask questions in plain English and get cited answers in seconds.

## Demo

Ask: "What is the torque spec for bolt M12 on pump model X?"

Get: "According to the manual on Page 47, the torque specification for bolt M12 is 85 Nm..."

## Tech Stack

- Frontend: React, Vite, Axios
- Backend: FastAPI, Python, Async
- Database: PostgreSQL + pgvector
- Embeddings: Qwen3-Embedding-0.6B (local, privacy-preserving)
- LLM: Groq API with Llama 3.1 8B Instant
- Auth: JWT + bcrypt
- PDF Parsing: PyMuPDF

## Key Design Decisions

Local embeddings over OpenAI: Qwen3-Embedding-0.6B runs entirely on-device. Sensitive maintenance manuals never leave the engineer's machine.

pgvector over a dedicated vector DB: Keeps the storage layer to a single PostgreSQL instance. Simplifies ops at early scale.

Sliding window chunking: 500-word chunks with 100-word overlap ensures answers that span section boundaries are never lost.

Background ingestion: PDF processing runs as a FastAPI background task. Upload returns immediately with status: processing.

## Database Schema

- users: auth, engineer accounts
- documents: uploaded manuals, processing status
- chunks: text chunks with Vector(1024) embeddings
- sessions: chat conversation sessions
- messages: full message history with source citations

## RAG Pipeline

Ingest (runs once per document):
1. PDF uploaded and saved
2. PyMuPDF extracts text page by page
3. Sliding window chunking (500 words, 100 overlap)
4. Each chunk embedded via Qwen3-Embedding-0.6B
5. Chunk and vector stored in PostgreSQL via pgvector
6. Document status updated to ready

Query (runs on every question):
1. Question embedded via same Qwen3 model
2. pgvector cosine similarity search returns top 5 chunks
3. Chunks injected into prompt with page citations
4. Groq generates grounded answer
5. Answer and source page numbers returned to frontend
6. Message saved to chat history

## API Endpoints

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/documents/upload
GET  /api/v1/documents
GET  /api/v1/documents/{id}/status
POST /api/v1/chat/sessions
GET  /api/v1/chat/sessions
GET  /api/v1/chat/sessions/{id}/messages
POST /api/v1/chat/sessions/{id}/messages

## Running Locally

Prerequisites: Python 3.10+, Node.js 18+, PostgreSQL 17+ with pgvector

Backend:
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

Frontend:
cd frontend
npm install
npm run dev

Environment variables in backend/.env:
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/maintenance_copilot
JWT_SECRET_KEY=your-secret-key
GROQ_API_KEY=your-groq-key

## Future Improvements

- MinIO/S3 object storage for production file persistence
- Cross-encoder reranking for improved retrieval precision
- Streaming responses via Server-Sent Events
- Multi-document filtering per chat session
- Docker Compose for one-command deployment

## Author

Muhammad Nazil Haziq bin Mohd Nizar
Computer Engineering, Universiti Teknologi PETRONAS
GitHub: https://github.com/NazilHaziq1
