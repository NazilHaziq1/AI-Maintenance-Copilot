from google import genai
from app.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_answer(question: str, context_chunks: list[dict]) -> str:
    context = "\n\n".join([
        f"[Page {c['page_number']}]: {c['content']}" for c in context_chunks
    ])

    prompt = f"""You are a maintenance assistant for industrial engineers.
Answer the question using ONLY the manual excerpts below.
If the answer isn't in the excerpts, say so clearly.
Always mention which page number you found the answer on.

Manual excerpts:
{context}

Question: {question}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text
