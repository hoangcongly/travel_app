import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env
load_dotenv()

# Lấy URL kết nối Database
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("Chưa cấu hình DATABASE_URL trong file .env!")

# Khởi tạo Engine (Bộ máy giao tiếp với Postgres)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True, # Tự động kiểm tra kết nối xem DB có bị sập không
    pool_size=10,       # Cho phép 10 kết nối đồng thời (tốt cho Production)
    max_overflow=20     # Cho phép dôi dư thêm 20 kết nối khi quá tải
)

# Tạo SessionFactory để tạo ra các session (phiên làm việc) riêng biệt cho mỗi Request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class để các Model (như Store, Place) kế thừa
Base = declarative_base()

# Hàm Dependency dùng trong FastAPI (Mỗi lần có người gọi API sẽ mở 1 kết nối và đóng lại khi xong)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()