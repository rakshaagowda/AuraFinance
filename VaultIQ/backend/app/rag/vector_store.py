import os
from typing import List
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LCDocument
from app.config import CHROMA_DIR
import chromadb

def get_embeddings():
    """
    Load SentenceTransformers embeddings model locally on CPU.
    """
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"}
    )

def get_vector_store():
    """
    Get the Chroma vector store instance.
    """
    embeddings = get_embeddings()
    return Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=embeddings,
        collection_name="vaultiq_documents"
    )

def add_document_to_store(user_id: int, doc_id: int, documents: List[LCDocument]):
    """
    Chunks PDF pages, annotates each chunk with user and document metadata,
    and indexes them into the Chroma vector store.
    """
    # Chunk size of 750 characters with 150 overlap provides balanced semantic density
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=750,
        chunk_overlap=150
    )
    
    chunks = splitter.split_documents(documents)
    
    # Inject metadata for multi-user isolation and citations
    for chunk in chunks:
        chunk.metadata["user_id"] = str(user_id)
        chunk.metadata["document_id"] = str(doc_id)
        chunk.metadata["page"] = int(chunk.metadata.get("page", 1))
        # Ensure source is string
        chunk.metadata["source"] = str(chunk.metadata.get("source", "Unknown"))
        
    db = get_vector_store()
    db.add_documents(chunks)

def delete_document_from_store(user_id: int, doc_id: int):
    """
    Deletes all vector embeddings associated with a specific user and document.
    """
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = client.get_or_create_collection("vaultiq_documents")
    collection.delete(
        where={
            "$and": [
                {"user_id": {"$eq": str(user_id)}},
                {"document_id": {"$eq": str(doc_id)}}
            ]
        }
    )
