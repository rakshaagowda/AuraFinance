from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.auth.database import get_db
from app.auth.models import User
from app.auth.security import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserAuth(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

class UserOut(BaseModel):
    id: int
    username: str
    openai_key: Optional[str] = None
    gemini_key: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    """
    FastAPI dependency to extract and validate the JWT bearer token from the Authorization header.
    Returns the authenticated SQLAlchemy User object.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid token. Expected: Bearer <token>"
        )
    
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is expired or invalid."
        )
        
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Subject signature missing in token."
        )
        
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session is invalid. User not found."
        )
    return user

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserAuth, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken."
        )
        
    hashed_pwd = hash_password(user_data.password)
    new_user = User(username=user_data.username, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login_user(user_data: UserAuth, db: Session = Depends(get_db)):
    """Authenticate credentials and return a JWT access token."""
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )
        
    access_token = create_access_token(subject=user.username)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserOut.from_orm(user)
    }

@router.get("/me", response_model=UserOut)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return current_user

class APIKeysUpdate(BaseModel):
    openai_key: Optional[str] = None
    gemini_key: Optional[str] = None

@router.put("/keys", response_model=UserOut)
def update_api_keys(keys_data: APIKeysUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update API Keys for Gemini or OpenAI in the user profile."""
    if keys_data.openai_key is not None:
        current_user.openai_key = keys_data.openai_key.strip()
    if keys_data.gemini_key is not None:
        current_user.gemini_key = keys_data.gemini_key.strip()
        
    db.commit()
    db.refresh(current_user)
    return current_user
