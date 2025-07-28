from datetime import datetime, timedelta
from typing import Optional, Union
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from models import User, UserRole
import os

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token security
security = HTTPBearer()

# Mock user database (replace with real database in production)
users_db = {
    "admin": {
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": pwd_context.hash("admin123"),
        "role": UserRole.ADMIN,
        "is_active": True
    },
    "editor": {
        "username": "editor",
        "email": "editor@example.com",
        "hashed_password": pwd_context.hash("editor123"),
        "role": UserRole.EDITOR,
        "is_active": True
    },
    "viewer": {
        "username": "viewer",
        "email": "viewer@example.com",
        "hashed_password": pwd_context.hash("viewer123"),
        "role": UserRole.VIEWER,
        "is_active": True
    }
}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def get_user(username: str) -> Optional[User]:
    """Get user by username"""
    if username in users_db:
        user_data = users_db[username]
        return User(
            username=user_data["username"],
            email=user_data["email"],
            role=user_data["role"],
            is_active=user_data["is_active"]
        )
    return None

def authenticate_user(username: str, password: str) -> Optional[User]:
    """Authenticate a user"""
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, users_db[username]["hashed_password"]):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(required_role: UserRole):
    """Decorator to require specific user role"""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role != required_role and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

def verify_token(token: str) -> Optional[User]:
    """Verify JWT token and return user"""
    try:
        print(f"DEBUG: Verifying token: {token[:20]}...")
        print(f"DEBUG: Using SECRET_KEY: {SECRET_KEY[:10]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"DEBUG: Token payload: {payload}")
        username: Optional[str] = payload.get("sub")
        if username is None:
            print("DEBUG: No username in payload")
            return None
        user = get_user(username)
        print(f"DEBUG: Found user: {user}")
        return user
    except JWTError as e:
        print(f"DEBUG: JWT Error: {e}")
        return None
    except Exception as e:
        print(f"DEBUG: Unexpected error: {e}")
        return None 