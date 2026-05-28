import os
import google.generativeai as genai
from openai import OpenAI
from app.config import OPENAI_API_KEY, GEMINI_API_KEY

def generate_text(prompt: str, system_instruction: str = None, user_openai_key: str = "", user_gemini_key: str = "") -> str:
    """
    Unified text generator that resolves API keys, routes to the appropriate model provider,
    and returns generated text. Includes a detailed mock fallback if no keys are found.
    """
    # 1. Resolve keys (User override > Environment variables)
    g_key = (user_gemini_key or "").strip() or (GEMINI_API_KEY or "").strip()
    o_key = (user_openai_key or "").strip() or (OPENAI_API_KEY or "").strip()
    
    # 2. Try Gemini first (cost-effective and powerful)
    if g_key:
        try:
            genai.configure(api_key=g_key)
            model_name = "gemini-1.5-flash"
            
            # Configure generative model options if system instruction exists
            if system_instruction:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=system_instruction
                )
            else:
                model = genai.GenerativeModel(model_name)
                
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            err_msg = f"Gemini API Error: {str(e)}"
            print(err_msg)
            # If OpenAI key exists, fall through to try OpenAI, otherwise return error
            if not o_key:
                return f"Error using Gemini API: {str(e)}. Please check your key in Settings."

    # 3. Try OpenAI
    if o_key:
        try:
            client = OpenAI(api_key=o_key)
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.2
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error using OpenAI API: {str(e)}. Please check your key in Settings."

    # 4. Fallback Mock response for out-of-the-box demonstration
    mock_msg = f"""### ⚙️ VaultIQ LLM Key Notice

**No API Keys Configured**: VaultIQ is currently operating in **Mock Mode** because no Gemini or OpenAI API Key was provided in `.env` or user settings.

> [!TIP]
> Go to **Settings** in the navbar, paste your Gemini or OpenAI API key, and save. VaultIQ will immediately start generating live answers from your documents!

---

### [Mock Response for Demo]
You queried: *"{prompt[:80]}..."*

**RAG Pipeline Insights:**
- **Vector DB Status**: ChromaDB is running locally. Text chunks have been indexed using HuggingFace embeddings (`all-MiniLM-L6-v2`) on your CPU.
- **Data Isolation**: Chunks are secured by user metadata, preventing cross-user exposure.
- **Citation Metadata**: In live mode, VaultIQ extracts exact pages (e.g. *Page 2*) and displays clickable highlighted citations in the chat.
"""
    return mock_msg
