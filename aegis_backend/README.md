# AEGIS O2O Backend

Hệ thống Backend O2O (Online-to-Offline) phục vụ du lịch & mua sắm, xây dựng trên FastAPI + DDD.

## Tính năng chính
- 🗺️ **Spatial**: Tìm kiếm lân cận PostGIS, gom cụm KMeans, định tuyến OSRM (TSP Greedy)
- 🛍️ **Inventory**: Khóa hàng phân tầng Redis + Postgres Row Lock, chống Race Condition
- 🎭 **Culture**: Tìm kiếm 1.7M địa danh OSM, AI Storytelling với Gemini
- 👁️ **Vision**: Upload ảnh, Celery background worker, Tủ đồ ảo pgvector 512D

## Khởi động nhanh

```bash
# 1. Cài dependencies
pip install -r requirements.txt

# 2. Copy và điền biến môi trường
cp .env.example .env

# 3. Khởi động hạ tầng
cd infrastructure && docker-compose up -d

# 4. Chạy API Server
uvicorn app.main:app --reload --port 8001

# 5. Chạy tests
pytest tests/ -v
```

## API Docs
Truy cập `http://localhost:8001/docs` sau khi khởi động.

## Tech Stack
FastAPI · PostgreSQL + PostGIS + pgvector · Redis · Celery + RabbitMQ · scikit-learn · OSRM · Google Gemini
