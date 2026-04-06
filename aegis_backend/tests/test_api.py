import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone

from app.main import app
from app.db.session import get_db
from app.db.redis_client import get_redis

# Giả lập Database & Redis để Test Client độc lập
def override_get_db():
    yield MagicMock()

async def override_get_redis():
    yield AsyncMock()

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_redis] = override_get_redis

client = TestClient(app)

# ==== 1. TEST DOMAIN CULTURE ====
def test_culture_search_places():
    with patch("app.domains.culture.service.search_places_by_name") as mock_search:
        mock_search.return_value = [
            {"id": 1, "place_id": 100, "name": "Văn Miếu", "category": "Di tích", "address": "HN", "lat": 21.0, "lon": 105.8, "distance_meters": 0.0}
        ]
        response = client.get("/api/v1/culture/places/search?q=Mieu")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Văn Miếu"

def test_culture_ai_story():
    with patch("app.domains.culture.service.generate_place_story") as mock_story:
        mock_story.return_value = {"id": 1, "place_id": 100, "name": "Hồ Gươm", "category": "Hồ", "address": "", "lat": 0, "lon": 0, "ai_story": "Một câu chuyện huyền thoại"}
        response = client.get("/api/v1/culture/places/1/story")
        assert response.status_code == 200
        assert "ai_story" in response.json()

# ==== 2. TEST DOMAIN SPATIAL ====
def test_spatial_cluster_stores():
    with patch("app.domains.spatial.service.cluster_stores_around_places") as mock_cluster:
        mock_cluster.return_value = {"clusters": [{"cluster_id": 1, "center": {"lat": 10, "lon": 10}, "places": [], "stores": []}]}
        response = client.post("/api/v1/spatial/cluster-stores", json={"place_ids": [1]})
        assert response.status_code == 200
        assert response.json()["clusters"][0]["cluster_id"] == 1

def test_spatial_route_plan():
    with patch("app.domains.spatial.service.plan_route_osrm", new_callable=AsyncMock) as mock_route:
        mock_route.return_value = {"total_distance_meters": 1500, "waypoints": [], "polyline": "encoded_poly", "optimized_order": [5]}
        response = client.post("/api/v1/spatial/route-plan", json={"current_lat": 10.0, "current_lon": 106.0, "store_ids": [5]})
        assert response.status_code == 200
        assert response.json()["total_distance_meters"] == 1500

# ==== 3. TEST DOMAIN INVENTORY ====
def test_inventory_create_lock():
    with patch("app.domains.inventory.service.create_lock", new_callable=AsyncMock) as mock_lock:
        mock_lock_obj = MagicMock()
        mock_lock_obj.id = 888
        mock_lock_obj.expires_at = datetime.now(timezone.utc)
        mock_lock.return_value = mock_lock_obj
        
        response = client.post("/api/v1/inventory/lock", json={"product_id": 1, "quantity": 1})
        assert response.status_code == 200
        assert response.json()["lock_id"] == 888
        assert "Đã chặn" in response.json()["message"]

# ==== 4. TEST DOMAIN VISION ====
def test_vision_closet_upload():
    with patch("app.domains.vision.service.add_to_closet") as mock_closet:
        mock_item = MagicMock()
        mock_item.id = 7
        mock_item.user_id = 1
        mock_item.image_path = "uploads/closet/test.png"
        mock_item.created_at = datetime.now(timezone.utc)
        mock_closet.return_value = mock_item
        
        response = client.post("/api/v1/vision/closet", files={"file": ("test.png", b"dummy_image_bytes", "image/png")})
        assert response.status_code == 200
        assert response.json()["image_path"] == "uploads/closet/test.png"
