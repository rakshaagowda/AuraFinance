import os
from typing import List
from langchain_core.documents import Document as LCDocument
import pdfplumber
from pypdf import PdfReader

def extract_pdf_pages(file_path: str, original_filename: str) -> List[LCDocument]:
    """
    Extracts text and tables page-by-page from a PDF file.
    Returns a list of LangChain Document objects with rich page metadata.
    """
    documents = []
    
    # Try pdfplumber first because it handles layouts and tables much better
    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                if not text:
                    text = ""
                
                # Check for tables and format them as Markdown table strings
                try:
                    tables = page.extract_tables()
                    if tables:
                        table_text = "\n\n### Extracted Table Data:\n"
                        for table in tables:
                            for row in table:
                                # Clean cells and join by pipes
                                row_str = " | ".join([str(cell).replace("\n", " ").strip() if cell is not None else "" for cell in row])
                                table_text += f"| {row_str} |\n"
                        text += table_text
                except Exception as table_err:
                    print(f"Table extraction error on page {page_num}: {table_err}")
                
                # Skip empty pages
                if not text.strip():
                    continue
                
                documents.append(LCDocument(
                    page_content=text,
                    metadata={
                        "source": original_filename,
                        "file_path": file_path,
                        "page": page_num
                    }
                ))
    except Exception as e:
        print(f"pdfplumber failed for {file_path}: {e}. Falling back to PyPDF...")
        # Fallback to PyPDF
        try:
            reader = PdfReader(file_path)
            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text()
                if not text or not text.strip():
                    continue
                
                documents.append(LCDocument(
                    page_content=text,
                    metadata={
                        "source": original_filename,
                        "file_path": file_path,
                        "page": page_num
                    }
                ))
        except Exception as pypdf_err:
            print(f"PyPDF fallback also failed: {pypdf_err}")
            
    return documents
