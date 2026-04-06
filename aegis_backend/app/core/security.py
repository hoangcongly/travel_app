from fastapi import Security, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> int:
    """
    Hệ thống Giải mã JWT / Token nội bộ.
    Hiện tại Mock Authentication: Truyền "Bearer user-X" (Với X là ID) 
    Ví dụ: Authorization: Bearer user-7 => Nhận dạng user_id = 7
    Trong Production: Thay thế bằng `python-jose` để parse thuật toán RS256/HS256.
    """
    token = credentials.credentials
    if token.startswith("user-"):
        try:
            user_id = int(token.split("-")[1])
            return user_id
        except ValueError:
            pass
            
    logger.warning(f"Cố gắng xâm nhập trái phép với token: {token}")
    raise HTTPException(
        status_code=401,
        detail="Token bảo mật Authentiation không hợp lệ hoặc đã hết hạn"
    )
