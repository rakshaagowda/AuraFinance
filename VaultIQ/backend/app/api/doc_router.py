import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.auth.database import get_db
from app.auth.models import User, Document, Folder
from app.api.auth_router import get_current_user
from app.config import UPLOAD_DIR
from app.rag.document_loader import extract_pdf_pages
from app.rag.vector_store import add_document_to_store, delete_document_from_store
from app.rag.summarizer import generate_document_summary
from app.rag.llm_provider import generate_text

router = APIRouter(prefix="/api/docs", tags=["documents"])

# Pydantic schemas
class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class FolderOut(BaseModel):
    id: int
    name: str
    created_at: Any = None
    class Config:
        from_attributes = True

class DocumentOut(BaseModel):
    id: int
    folder_id: Optional[int] = None
    filename: str
    original_name: str
    file_size: int
    summary: Optional[str] = None
    created_at: Any = None
    class Config:
        from_attributes = True

class DocumentMove(BaseModel):
    folder_id: Optional[int] = None

class DocumentCompareReq(BaseModel):
    doc_id_1: int
    doc_id_2: int

# FOLDER ENDPOINTS
@router.post("/folders", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(folder_data: FolderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new folder for document organization."""
    new_folder = Folder(user_id=current_user.id, name=folder_data.name)
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@router.get("/folders", response_model=List[FolderOut])
def list_folders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all folders owned by the current user."""
    return db.query(Folder).filter(Folder.user_id == current_user.id).all()

@router.delete("/folders/{folder_id}", status_code=status.HTTP_200_OK)
def delete_folder(folder_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a folder. Associated documents are moved back to the root (folder_id is set to null)."""
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    
    # SQLAlchemy relationship triggers cascades or SET NULL.
    # In models.py we have ondelete='SET NULL' for document.folder_id, which automatically updates child docs!
    db.delete(folder)
    db.commit()
    return {"detail": "Folder deleted successfully. Associated files moved to root."}

# DOCUMENT ENDPOINTS
@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handles PDF uploading, text/table parsing, local filesystem storage,
    indexing chunks into ChromaDB, and automatic AI summary generation.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. VaultIQ only supports PDF documents."
        )
        
    # Check folder validity if provided
    if folder_id is not None:
        folder_exists = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == current_user.id).first()
        if not folder_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target folder not found."
            )
            
    # Save file with unique UUID prefix
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file to local storage: {str(e)}"
        )
        
    file_size = os.path.getsize(file_path)
    
    # 1. Create document record in SQLite
    new_doc = Document(
        user_id=current_user.id,
        folder_id=folder_id,
        filename=unique_filename,
        original_name=file.filename,
        file_size=file_size,
        summary="Generating summary..." # Temporary status
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    try:
        # 2. Extract pages using pypdf/pdfplumber
        extracted_pages = extract_pdf_pages(file_path, file.filename)
        
        if not extracted_pages:
            # Clean up on extraction failure
            db.delete(new_doc)
            db.commit()
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="PDF appears to be empty or unscannable."
            )
            
        # 3. Add chunks to ChromaDB vector database
        add_document_to_store(user_id=current_user.id, doc_id=new_doc.id, documents=extracted_pages)
        
        # 4. Generate AI summary
        summary = generate_document_summary(
            documents=extracted_pages,
            user_openai_key=current_user.openai_key,
            user_gemini_key=current_user.gemini_key
        )
        
        # Update SQLite with generated summary
        new_doc.summary = summary
        db.commit()
        db.refresh(new_doc)
        
    except Exception as process_err:
        # Robust cleanup if indexing fails
        db.delete(new_doc)
        db.commit()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document parsing/indexing failed: {str(process_err)}"
        )
        
    return new_doc

@router.get("", response_model=List[DocumentOut])
def list_documents(folder_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all documents belonging to the user. Optionally filter by folder ID."""
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if folder_id is not None:
        query = query.filter(Document.folder_id == folder_id)
    return query.all()

@router.delete("/{doc_id}", status_code=status.HTTP_200_OK)
def delete_document(doc_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Deletes a document from disk, removes its vector embeddings, and deletes the database record."""
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        
    # 1. Remove vector embeddings from ChromaDB
    try:
        delete_document_from_store(user_id=current_user.id, doc_id=doc.id)
    except Exception as e:
        print(f"Error removing embeddings during deletion: {e}")
        
    # 2. Delete local PDF file
    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file from disk: {e}")
            
    # 3. Delete DB record
    db.delete(doc)
    db.commit()
    return {"detail": "Document and all vector embeddings deleted successfully."}

@router.put("/{doc_id}/move", response_model=DocumentOut)
def move_document(doc_id: int, move_data: DocumentMove, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Moves a document to another folder (or to root by setting folder_id to null)."""
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        
    if move_data.folder_id is not None:
        folder = db.query(Folder).filter(Folder.id == move_data.folder_id, Folder.user_id == current_user.id).first()
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target folder not found.")
            
    doc.folder_id = move_data.folder_id
    db.commit()
    db.refresh(doc)
    return doc

@router.post("/compare")
def compare_documents(data: DocumentCompareReq, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Compare two documents side-by-side. 
    Accepts two doc IDs, grabs their AI summaries, and instructs the LLM 
    to output a beautiful side-by-side analysis (similarities, structural differences, core metrics).
    """
    doc1 = db.query(Document).filter(Document.id == data.doc_id_1, Document.user_id == current_user.id).first()
    doc2 = db.query(Document).filter(Document.id == data.doc_id_2, Document.user_id == current_user.id).first()
    
    if not doc1 or not doc2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both documents do not exist or belong to another user."
        )
        
    system_instruction = (
        "You are an expert systems analyst. Compare two documents based on their summaries "
        "and metadata, and produce a beautiful Markdown document showing their comparative analysis."
    )
    
    prompt = f"""
Please compare the following two documents side-by-side.

Document 1: {doc1.original_name}
Summary 1:
{doc1.summary}

Document 2: {doc2.original_name}
Summary 2:
{doc2.summary}

Generate a comparison report in clean Markdown. Include the following sections:
1. **Side-by-Side Comparison Table**: Compare their basic metadata (name, size, document type, core scope).
2. **Key Commonalities**: What aspects do they share?
3. **Key Differences**: What are the major differences in contents, terms, values, policies, or goals?
4. **Conclusion/Recommendation**: A summary of how they relate (e.g., is Document 2 an updated version of Document 1? Are they contrasting policies?).
"""
    
    comparison_result = generate_text(
        prompt=prompt,
        system_instruction=system_instruction,
        user_openai_key=current_user.openai_key,
        user_gemini_key=current_user.gemini_key
    )
    
    return {
        "doc1_name": doc1.original_name,
        "doc2_name": doc2.original_name,
        "comparison_report": comparison_result
    }
