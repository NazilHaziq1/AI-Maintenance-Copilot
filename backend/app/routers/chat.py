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

async def get_owned_session(session_id: str, db: AsyncSession, user) -> ChatSession:
    """Fetch a chat session, ensuring it belongs to the given user."""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_uuid,
            ChatSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

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
    await db.refresh(session)
    return {"id": str(session.id), "title": session.title, "created_at": session.created_at}

@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [{"id": str(s.id), "title": s.title, "created_at": s.created_at} for s in sessions]

@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    session = await get_owned_session(session_id, db, current_user)
    result = await db.execute(
        select(Message).where(Message.session_id == session.id).order_by(Message.created_at)
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
    session = await get_owned_session(session_id, db, current_user)

    # Save user's question
    user_message = Message(
        id=uuid.uuid4(),
        session_id=session.id,
        role="user",
        content=data.content
    )
    db.add(user_message)
    await db.commit()

    # Embed the question
    question_vector = embed_text(data.content)

    # Search for similar chunks using pgvector cosine distance,
    # restricted to documents uploaded by the current user
    result = await db.execute(
        text("""
            SELECT c.content, c.page_number,
                   1 - (c.embedding <=> CAST(:vector AS vector)) AS similarity
            FROM chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.embedding IS NOT NULL
              AND d.uploaded_by = :user_id
            ORDER BY c.embedding <=> CAST(:vector AS vector)
            LIMIT 5
        """),
        {"vector": str(question_vector), "user_id": str(current_user.id)}
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
        session_id=session.id,
        role="assistant",
        content=answer
    )
    db.add(assistant_message)
    await db.commit()

    return {
        "answer": answer,
        "sources": [{"page_number": c["page_number"]} for c in context_chunks]
    }
