import json
from typing import List, Dict, Any, Optional
from app.rag.vector_store import get_vector_store
from app.rag.llm_provider import generate_text

def build_chroma_filter(user_id: int, doc_ids: Optional[List[int]] = None) -> Dict[str, Any]:
    """
    Builds the metadata filter for Chroma queries.
    Restricts search to the current user's documents.
    Allows filtering by a single document or multiple documents.
    """
    base_filter = {"user_id": str(user_id)}
    
    if not doc_ids:
        # Chatting across all user's files
        return base_filter
        
    if len(doc_ids) == 1:
        # Chatting with a single document
        return {
            "$and": [
                {"user_id": {"$eq": str(user_id)}},
                {"document_id": {"$eq": str(doc_ids[0])}}
            ]
        }
    else:
        # Chatting across a specific subset of documents
        # Build an $or condition for document IDs
        doc_conditions = [{"document_id": {"$eq": str(d_id)}} for d_id in doc_ids]
        return {
            "$and": [
                {"user_id": {"$eq": str(user_id)}},
                {"$or": doc_conditions}
            ]
        }

def query_rag_pipeline(
    question: str, 
    user_id: int, 
    doc_ids: Optional[List[int]] = None,
    user_openai_key: str = "",
    user_gemini_key: str = ""
) -> Dict[str, Any]:
    """
    Executes the full RAG pipeline:
    1. Retrieval: Perform MMR search in ChromaDB filtered by user_id and optional doc_ids.
    2. Citation Extraction: Log source filenames, page numbers, and snippets.
    3. LLM Response Generation: Feed context and query to the LLM to get the final cited answer.
    """
    db = get_vector_store()
    filters = build_chroma_filter(user_id, doc_ids)
    
    # Use Maximal Marginal Relevance (MMR) search for diversity of context
    try:
        retrieved_docs = db.max_marginal_relevance_search(
            query=question,
            k=4,
            fetch_k=15,
            filter=filters
        )
    except Exception as e:
        print(f"Retrieval error: {e}. Falling back to standard similarity search...")
        # Fallback to standard similarity search if MMR fails
        retrieved_docs = db.similarity_search(
            query=question,
            k=4,
            filter=filters
        )
        
    # Compile context and citations
    context_blocks = []
    citations = []
    seen_sources = set()
    
    for i, doc in enumerate(retrieved_docs):
        filename = doc.metadata.get("source", "Unknown Document")
        page = doc.metadata.get("page", 1)
        content = doc.page_content
        
        # Add to LLM context
        context_blocks.append(f"Source [{i+1}]: {filename} (Page {page})\n---\n{content}\n")
        
        # Create citation fingerprint to avoid duplicate citations of the exact same snippet/page range
        citation_key = f"{filename}_page_{page}_{content[:30]}"
        if citation_key not in seen_sources:
            seen_sources.add(citation_key)
            citations.append({
                "source_id": i + 1,
                "filename": filename,
                "page": page,
                "snippet": content[:200] + "..." if len(content) > 200 else content
            })

    context_str = "\n\n".join(context_blocks)
    
    # Prompt engineering for strict context adherence and citation
    system_instruction = (
        "You are VaultIQ, a highly precise AI document assistant. "
        "Your task is to answer the user's question using ONLY the provided document context. "
        "If the answer cannot be found or inferred from the context, clearly state: "
        "'I cannot find the answer to this question in the uploaded documents.' "
        "Do not make up facts or use external knowledge. "
        "Crucial: Throughout your answer, cite the sources by putting their citation marker "
        "at the end of sentences where they are referenced, like [Source 1] or [Source 2] (correlating with the source list)."
    )
    
    prompt = f"""
Use the context below to answer the user's question.

CONTEXT:
{context_str}

USER QUESTION:
{question}
"""
    
    if not retrieved_docs:
        answer = "No document context found. Please make sure you have uploaded PDFs and selected them for chat."
    else:
        answer = generate_text(
            prompt=prompt,
            system_instruction=system_instruction,
            user_openai_key=user_openai_key,
            user_gemini_key=user_gemini_key
        )
        
    return {
        "answer": answer,
        "citations": citations
    }
