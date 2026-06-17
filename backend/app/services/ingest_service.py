import fitz  # PyMuPDF
import os

UPLOAD_DIR = "uploads"

def save_pdf(file_bytes: bytes, filename: str) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    return file_path

def extract_text_from_pdf(file_path: str) -> list[dict]:
    """Returns list of {page_number, text} dicts"""
    doc = fitz.open(file_path)
    pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            pages.append({"page_number": page_num + 1, "text": text})
    doc.close()
    return pages

def chunk_text(pages: list[dict], chunk_size: int = 500, overlap: int = 100) -> list[dict]:
    """Splits pages into overlapping word-based chunks. Returns list of {content, page_number}"""
    chunks = []
    for page in pages:
        words = page["text"].split()
        i = 0
        while i < len(words):
            chunk_words = words[i:i + chunk_size]
            chunks.append({
                "content": " ".join(chunk_words),
                "page_number": page["page_number"]
            })
            i += chunk_size - overlap
    return chunks
