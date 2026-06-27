from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

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

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
