from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from app.db.session import get_db
from app.db.models import Session as ChatSession, Message
from app.routers.auth import get_current_user
from app.services.embedding_service import embed_text
from app.services.llm_service import generate_answer
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

class CreateSessionRequest(BaseModel):
    title: str = "New Chat"

class SendMessageRequest(BaseModel):
    content: str

@router.post("/sessions")
async def create_session(
    data: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session = ChatSession(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=data.title
    )
    db.add(session)
    await db.commit()
    return {"id": str(session.id), "title": session.title}

@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == current_user.id)
    )
    sessions = result.scalars().all()
    return [{"id": str(s.id), "title": s.title, "created_at": s.created_at} for s in sessions]

@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(Message).where(Message.session_id == uuid.UUID(session_id)).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]

@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    data: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Save user's question
    user_message = Message(
        id=uuid.uuid4(),
        session_id=uuid.UUID(session_id),
        role="user",
        content=data.content
    )
    db.add(user_message)
    await db.commit()

    # Embed the question
    question_vector = embed_text(data.content)

    # Search for similar chunks using pgvector cosine distance
    result = await db.execute(
        text("""
            SELECT content, page_number,
                   1 - (embedding <=> CAST(:vector AS vector)) AS similarity
            FROM chunks
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:vector AS vector)
            LIMIT 5
        """),
        {"vector": str(question_vector)}
    )
    rows = result.fetchall()
    context_chunks = [{"content": r[0], "page_number": r[1]} for r in rows]

    if not context_chunks:
        answer = "I couldn't find any relevant information in the uploaded manuals to answer this question."
    else:
        answer = generate_answer(data.content, context_chunks)

    # Save assistant's answer
    assistant_message = Message(
        id=uuid.uuid4(),
        session_id=uuid.UUID(session_id),
        role="assistant",
        content=answer
    )
    db.add(assistant_message)
    await db.commit()

    return {
        "answer": answer,
        "sources": [{"page_number": c["page_number"]} for c in context_chunks]
    }
