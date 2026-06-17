from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db, AsyncSessionLocal
from app.db.models import Document, Chunk
from app.routers.auth import get_current_user
from app.services.ingest_service import save_pdf, extract_text_from_pdf, chunk_text
from app.services.embedding_service import embed_text
import uuid

router = APIRouter(prefix="/documents", tags=["documents"])

async def process_document(document_id: str, file_path: str):
    async with AsyncSessionLocal() as db:
        pages = extract_text_from_pdf(file_path)
        chunks = chunk_text(pages)

        for idx, chunk in enumerate(chunks):
            vector = embed_text(chunk["content"])
            db_chunk = Chunk(
                id=uuid.uuid4(),
                document_id=uuid.UUID(document_id),
                chunk_index=idx,
                content=chunk["content"],
                embedding=vector,
                page_number=chunk["page_number"]
            )
            db.add(db_chunk)

        result = await db.execute(select(Document).where(Document.id == uuid.UUID(document_id)))
        document = result.scalar_one()
        document.status = "ready"

        await db.commit()

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    file_bytes = await file.read()
    document_id = uuid.uuid4()
    file_path = save_pdf(file_bytes, f"{document_id}_{file.filename}")

    document = Document(
        id=document_id,
        uploaded_by=current_user.id,
        title=file.filename,
        s3_key=file_path,
        status="processing"
    )
    db.add(document)
    await db.commit()

    background_tasks.add_task(process_document, str(document_id), file_path)

    return {"id": str(document_id), "title": file.filename, "status": "processing"}

@router.get("")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Document).where(Document.uploaded_by == current_user.id))
    documents = result.scalars().all()
    return [
        {"id": str(d.id), "title": d.title, "status": d.status, "created_at": d.created_at}
        for d in documents
    ]

@router.get("/{document_id}/status")
async def get_status(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Document).where(Document.id == uuid.UUID(document_id)))
    document = result.scalar_one_or_none()
    return {"id": str(document.id), "status": document.status}
