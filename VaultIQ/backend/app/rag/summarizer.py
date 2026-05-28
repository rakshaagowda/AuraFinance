from typing import List
from langchain_core.documents import Document as LCDocument
from app.rag.llm_provider import generate_text

def generate_document_summary(documents: List[LCDocument], user_openai_key: str = "", user_gemini_key: str = "") -> str:
    """
    Analyzes document pages, creates a representative text sample (handling very large PDFs),
    and calls the LLM to generate a structured markdown summary.
    """
    if not documents:
        return "No text content found in document to summarize."
        
    # Collate text. If document is massive, take the first 4 pages and last 2 pages
    max_pages_to_summarize = 6
    sampled_pages = []
    
    if len(documents) <= max_pages_to_summarize:
        sampled_pages = documents
    else:
        # First 4 pages
        sampled_pages.extend(documents[:4])
        # Last 2 pages
        sampled_pages.extend(documents[-2:])
        
    full_text = "\n\n--- PAGE BREAK ---\n\n".join([doc.page_content for doc in sampled_pages])
    
    # Cap text length to prevent LLM prompt overflow (approx 12,000 characters)
    if len(full_text) > 12000:
        full_text = full_text[:12000] + "\n...[Text Truncated for Summary Input]..."

    system_instruction = (
        "You are an expert document analyst. Provide a professional, structured summary "
        "of the following document text in clean Markdown formatting."
    )
    
    prompt = f"""
Please analyze this document text and generate a structured document intelligence report.
Use the following format:

## Executive Summary
[A concise 2-3 sentence overview of what this document is about, its purpose, and target audience]

## Key Highlights & Takeaways
* [Key point 1]
* [Key point 2]
* [Key point 3]

## Action Items & Important Dates
* [List any deadlines, dates, values, limits, or action items. If none, write 'No specific action items or dates identified.']

## Metadata Insights
* **Inferred Document Type**: [e.g., Financial Report, Company Policy, Legal Agreement, Research Paper]
* **Tone**: [e.g., Formal, Technical, Informative]

---
DOCUMENT TEXT:
{full_text}
"""
    
    summary = generate_text(
        prompt=prompt,
        system_instruction=system_instruction,
        user_openai_key=user_openai_key,
        user_gemini_key=user_gemini_key
    )
    
    return summary
