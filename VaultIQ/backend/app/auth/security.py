import datetime
import bcrypt
import jwt
from typing import Union, Any
from app.config import JWT_SECRET_KEY, ALGORITHM

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify standard text password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], expires_delta: Union[datetime.timedelta, None] = None) -> str:
    """Generate JWT Access Token."""
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=1440) # 1 day
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Union[dict, None]:
    """Decode JWT token to retrieve sub (username or user_id) or return None if invalid/expired."""
    try:
        decoded = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        return None
