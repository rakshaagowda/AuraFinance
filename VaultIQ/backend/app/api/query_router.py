import json
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.auth.database import get_db
from app.auth.models import User, ChatMessage
from app.api.auth_router import get_current_user
from app.rag.pipeline import query_rag_pipeline

router = APIRouter(prefix="/api/query", tags=["query"])

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    document_ids: Optional[List[int]] = None

class CitationOut(BaseModel):
    source_id: int
    filename: str
    page: int
    snippet: str

class QueryResponse(BaseModel):
    answer: str
    citations: List[CitationOut]

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    sources: Optional[str] = None
    created_at: Any = None
    
    class Config:
        from_attributes = True

@router.post("/ask", response_model=QueryResponse)
def ask_document_question(
    data: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes a Q&A query across the specified PDFs (or all files if document_ids is null/empty).
    Persists user & assistant exchanges to chat history SQLite table.
    """
    # 1. Run RAG query
    try:
        pipeline_result = query_rag_pipeline(
            question=data.question,
            user_id=current_user.id,
            doc_ids=data.document_ids,
            user_openai_key=current_user.openai_key,
            user_gemini_key=current_user.gemini_key
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query execution failed: {str(e)}"
        )
        
    answer = pipeline_result["answer"]
    citations = pipeline_result["citations"]
    
    # 2. Serialize document scope for log tracking
    doc_scope = "all"
    if data.document_ids:
        doc_scope = ",".join(map(str, sorted(data.document_ids)))
        
    # 3. Save User message to SQLite
    user_msg = ChatMessage(
        user_id=current_user.id,
        document_id=doc_scope,
        role="user",
        content=data.question,
        sources=None
    )
    db.add(user_msg)
    
    # 4. Save Assistant response to SQLite
    assistant_msg = ChatMessage(
        user_id=current_user.id,
        document_id=doc_scope,
        role="assistant",
        content=answer,
        sources=json.dumps(citations)
    )
    db.add(assistant_msg)
    db.commit()
    
    return {
        "answer": answer,
        "citations": citations
    }

@router.get("/chat-history", response_model=List[MessageOut])
def get_chat_history(
    document_scope: Optional[str] = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the last 50 chat messages for the current user matching a given document scope.
    Scope can be 'all' or a comma-separated list of document IDs (e.g. '1,2').
    """
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.document_id == document_scope
    ).order_by(ChatMessage.created_at.asc()).limit(50).all()
    
    return messages

@router.delete("/chat-history", status_code=status.HTTP_200_OK)
def clear_chat_history(
    document_scope: Optional[str] = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clears conversation messages history for a given document scope."""
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.document_id == document_scope
    ).delete(synchronize_session=False)
    db.commit()
    return {"detail": "Chat history cleared successfully."}
