# 🛡️ AEGIS O2O AI Agent — Báo Cáo Backend Toàn Diện
### *Technical Specification — Dành cho AI Frontend Development*

> **Framework:** FastAPI (Python 3.11+) | **Version:** 1.0.0  
> **Base URL Dev:** `http://localhost:8000`  
> **Swagger UI:** `http://localhost:8000/docs`  
> **ReDoc:** `http://localhost:8000/redoc`

---

## 📌 TỔNG QUAN HỆ THỐNG

**AEGIS** là một **Context-Aware O2O (Online-to-Offline) AI Agent Platform** — hệ thống kết hợp 5 domain thông minh:

| Domain | Mô tả | AI Tech |
|--------|-------|---------|
| 🧠 **Agent** | Conversational AI gateway, tự động routing | Gemini 2.5 Flash + Function Calling |
| 🗺️ **Spatial** | Bản đồ, tìm địa điểm, tối ưu lộ trình | PostGIS + OSRM + KMeans |
| 🎭 **Culture** | Kể chuyện địa danh, review | Gemini 2.5 Flash (story gen) |
| 📦 **Inventory** | Giỏ hàng, soft-lock tồn kho | Redis + PostgreSQL 4-Phase Lock |
| 👁️ **Vision** | Tìm sản phẩm qua ảnh chụp | CLIP ViT-B/32 + pgvector |

---

## 🏗️ KIẾN TRÚC TỔNG THỂ

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (Client)                        │
│              Mobile App / Web SPA / PWA                      │
└──────────────────────┬───────────────────────────────────────┘
                       │  HTTP / REST / multipart
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              FASTAPI APPLICATION  (Port 8000)                │
│                                                              │
│  /api/v1/agent    /api/v1/spatial    /api/v1/culture         │
│  /api/v1/inventory               /api/v1/vision              │
└────┬──────────────────────┬──────────────────────┬───────────┘
     │                      │                      │
     ▼                      ▼                      ▼
┌──────────┐         ┌────────────┐        ┌──────────────────┐
│PostgreSQL│         │   Redis    │        │  Celery Workers  │
│+ PostGIS │         │  7-alpine  │        │  (RabbitMQ)      │
│+ pgvector│         │  Port 6379 │        │  - AI Vision     │
│  Port5432│         └────────────┘        │  - Inv. Sweep    │
└──────────┘                               └──────────────────┘
                                                    │
                                      ┌─────────────┴──────────┐
                                      │   External Services    │
                                      │  • Gemini 2.5 Flash    │
                                      │  • Open-Meteo API      │
                                      │  • OSRM Routing        │
                                      └────────────────────────┘
```

---

## 🗄️ DATABASE SCHEMA

**PostgreSQL 15** + Extensions: `PostGIS 3.4` · `pgvector` · `pg_trgm`

### 📍 Table `places` — Địa danh (~1.7M records)
| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | INTEGER PK | Auto increment |
| `place_id` | VARCHAR(50) UNIQUE | ID từ Google Maps / OSM |
| `place_type` | VARCHAR(50) | Loại hình địa điểm |
| `name` | VARCHAR(255) | Tên hiển thị |
| `category` | VARCHAR(100) | restaurant, museum, lake, church... |
| `address` | TEXT | Địa chỉ đầy đủ |
| `lat` | NUMERIC | Vĩ độ |
| `lon` | NUMERIC | Kinh độ |
| `geom` | GEOMETRY(POINT,4326) | **GIST indexed** — spatial queries |
| `phone` | VARCHAR(50) NULLABLE | Số điện thoại |
| `rating` | NUMERIC(3,1) NULLABLE | 0.0 – 5.0 |
| `review_count` | INTEGER NULLABLE | Số lượt đánh giá |
| `image_url` | TEXT NULLABLE | URL ảnh đại diện |

### ⭐ Table `reviews` — Đánh giá
| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | INTEGER PK | |
| `place_id` | VARCHAR(50) INDEX | FK → places.place_id |
| `author_name` | VARCHAR(100) | |
| `rating` | INTEGER | 1–5 sao |
| `text` | TEXT | Nội dung review |
| `time_posted` | VARCHAR(100) | ISO 8601 string |

### 🏪 Table `stores` — Cửa hàng
| Column | Type | Ghi chú |
|--------|------|---------|
| `store_id` | INTEGER PK | |
| `place_id` | VARCHAR(50) NULLABLE | Liên kết với địa danh |
| `name` | VARCHAR(255) | |
| `category` | VARCHAR(100) NULLABLE | Loại hình kinh doanh |
| `address` | TEXT NULLABLE | |
| `lat` | NUMERIC NULLABLE | |
| `lon` | NUMERIC NULLABLE | |
| `geom` | GEOMETRY(POINT,4326) NULLABLE | |
| `phone` | VARCHAR(50) NULLABLE | |
| `rating` | NUMERIC(3,1) NULLABLE | |

### 🛍️ Table `products` — Sản phẩm
| Column | Type | Ghi chú |
|--------|------|---------|
| `product_id` | INTEGER PK | |
| `name` | VARCHAR(255) | |
| `description` | TEXT NULLABLE | |
| `price` | INTEGER | Giá bán (VNĐ) |
| `original_price` | INTEGER NULLABLE | Giá gốc → tính % giảm giá |
| `image_url` | TEXT NULLABLE | |
| `embedding` | VECTOR(512) NULLABLE | **CLIP AI Vector** — dùng cho visual search |
| `created_at` | TIMESTAMP(tz) | |

### 📊 Table `inventory` — Tồn kho
| Column | Type | Ghi chú |
|--------|------|---------|
| `inventory_id` | INTEGER PK | |
| `store_id` | INTEGER FK | → stores.store_id |
| `product_id` | INTEGER FK | → products.product_id |
| `stock` | INTEGER | Tổng tồn kho |
| `version` | INTEGER | Optimistic lock version |
| `locked_stock` | INTEGER | Số đang bị soft-lock |

### 🔒 Table `inventory_locks` — Giỏ hàng / Lock
| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | INTEGER PK | |
| `product_id` | INTEGER FK | |
| `user_id` | INTEGER INDEX | |
| `quantity` | INTEGER | Số lượng đặt giữ |
| `locked_at` | TIMESTAMP(tz) | Thời điểm lock |
| `expires_at` | TIMESTAMP(tz) INDEX\* | Hết hạn (locked_at + 15 phút) |
| `status` | VARCHAR(50) | `soft_locked` \| `active` \| `expired` |

> **\*Partial Index:** `idx_active_locks` chỉ index expires_at cho status IN ('soft_locked', 'active') — sweep siêu nhanh.

### 🔍 Table `vision_tasks` — AI Scan Queue
| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | INTEGER PK | |
| `task_id` | VARCHAR(255) UNIQUE INDEX | UUID Celery task |
| `image_path` | VARCHAR(1000) | Đường dẫn file đã upload |
| `status` | VARCHAR(50) | `processing` \| `completed` \| `failed` |
| `detected_objects` | JSONB NULLABLE | Metadata AI: `{"type":"clip_image_search","confidence":0.99}` |
| `matched_product_ids` | JSONB NULLABLE | Array product_id: `[42, 17, 83]` |
| `created_at` | TIMESTAMP(tz) | |

### 👗 Table `virtual_closets` — Tủ đồ ảo
| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | INTEGER PK | |
| `user_id` | INTEGER INDEX | Chủ sở hữu |
| `image_path` | VARCHAR(1000) | |
| `vector_embedding` | VECTOR(512) NULLABLE | CLIP 512D vector |
| `created_at` | TIMESTAMP(tz) | |

---

## 🔌 API REFERENCE — Toàn Bộ 13 Endpoints

### 🏥 System

---

#### `GET /health`
Không cần auth. Kiểm tra server.

```json
// Response 200
{
  "status": "AEGIS System is running",
  "version": "1.0.0"
}
```

---

## 🧠 Domain: AGENT — AI Orchestrator

**Prefix:** `/api/v1/agent` | **Tags:** `Agent & AI Orchestrator`

---

#### `POST /api/v1/agent/chat`

Điểm nhập duy nhất của AI. Người dùng gõ câu tự nhiên, AEGIS tự động nhận diện intent, gọi tools nội bộ, trả lời bằng tiếng Việt.

**Auth:** Không cần.

**Request Body:**
```json
{
  "query": "Ở Hà Nội trời có mưa không? Gợi ý cho tôi vài địa điểm",
  "current_lat": 21.0285,   // optional - vĩ độ người dùng
  "current_lon": 105.8542   // optional - kinh độ người dùng
}
```

**Response 200:**
```json
{
  "answer": "Hiện tại Hà Nội đang mưa nhẹ, nhiệt độ 24°C 🌧️. Tôi gợi ý bạn ghé Hồ Hoàn Kiếm (cách đây 320m)...",
  "internal_actions": [
    "search_culture({'keyword': 'Hà Nội'})",
    "check_weather({'lat': 21.03, 'lon': 105.85})"
  ]
}
```

**⚙️ Luồng Agent (Agentic Loop — tối đa 5 vòng):**
```
[1] Gọi Gemini 2.5 Flash kèm tools + system prompt
    │
    ▼
[2] Gemini quyết định:
    ├─→ functionCall: "search_culture" → Backend query DB ilike
    └─→ functionCall: "check_weather"  → Backend gọi Open-Meteo
    │
    ▼
[3] Backend trả functionResponse → Lại gọi Gemini
    │
    ▼
[4] Gemini tổng hợp text answer cuối cùng
    │
    ▼
[5] Return { answer, internal_actions }
```

**🔧 Tools đã khai báo:**
| Tool | Input | Output | Mô tả |
|------|-------|--------|-------|
| `search_culture` | `{ keyword: string }` | `{ places: [{id, name, lat, lon}] }` | Tìm tối đa 3 địa danh khớp |
| `check_weather` | `{ lat: number, lon: number }` | `{ temperature, condition, windspeed }` | Thời tiết real-time |

**🌤️ Weather condition mapping:**
| WMO Code | Condition (EN) | Condition (VI) |
|----------|---------------|---------------|
| 0 | Clear | Quang đãng |
| 1, 2, 3 | Cloudy | Nhiều mây |
| 61,63,65,80,81,82 | Rainy | Trời mưa |
| 95,96,99 | Storm | Có bão sấm sét |

**💡 Frontend UX hint:**
- Hiển thị `internal_actions` như "chain of thought" — expandable chip list
- Typing indicator animation trong khi gọi API (thường 2–8 giây)
- Parse địa danh từ `answer` → clickable, mở trên map
- Dynamic background theo `condition` từ weather tool

---

## 🗺️ Domain: SPATIAL — Bản Đồ & Định Tuyến

**Prefix:** `/api/v1/spatial` | **Tags:** `Spatial & Maps`
**Auth:** Không cần.

---

#### `GET /api/v1/spatial/nearby-places`

Tìm địa điểm xung quanh người dùng bằng PostGIS (ST_DWithin + ST_Distance).

**Query Parameters:**
| Param | Type | Required | Default | Mô tả |
|-------|------|:--------:|:-------:|-------|
| `lat` | float | ✅ | — | Vĩ độ |
| `lon` | float | ✅ | — | Kinh độ |
| `radius` | int | ❌ | `2000` | Bán kính (mét), tối đa đề xuất 5000 |

**Response 200:**
```json
{
  "user_location": { "lat": 10.7769, "lon": 106.7009 },
  "search_radius_meters": 2000,
  "total_found": 15,
  "places": [
    {
      "id": 1,
      "place_id": "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
      "name": "Nhà thờ Đức Bà",
      "category": "church",
      "address": "1 Công xã Paris, Bến Nghé, Quận 1, TP.HCM",
      "lat": 10.7797,
      "lon": 106.6993,
      "distance_meters": 320.55,   // Khoảng cách thực theo geodesic
      "phone": "028 3829 4822",
      "rating": 4.7,
      "review_count": 15842,
      "image_url": "https://..."
    }
    // ...tối đa 50 items, sorted by distance ASC
  ]
}
```

**💡 Frontend UX hint:**
- Render map với markers, cluster khi > 10 điểm
- Bottom sheet swipeable danh sách places
- Highlight marker theo khoảng cách (< 500m = xanh, < 2km = vàng, > 2km = đỏ)

---

#### `POST /api/v1/spatial/cluster-stores`

Gom cụm địa danh + cửa hàng bằng KMeans (2–5 clusters). Dùng để hiển thị "khu vực mua sắm" gợi ý.

**Request Body:**
```json
{
  "place_ids": [1, 5, 8, 12]
}
```

**Response 200:**
```json
{
  "clusters": [
    {
      "cluster_id": 1,
      "center": { "lat": 10.7797, "lon": 106.6993 },
      "places": [
        {
          "id": 1, "place_id": "ChIJ...", "name": "Nhà thờ Đức Bà",
          "category": "church", "lat": 10.7797, "lon": 106.6993,
          "address": "...", "distance_meters": null,
          "phone": null, "rating": 4.7, "review_count": 15842, "image_url": "..."
        }
      ],
      "stores": [
        {
          "store_id": 42, "place_id": null, "name": "Phúc Long Coffee",
          "category": "cafe", "address": "123 Đồng Khởi, Q1",
          "lat": 10.781, "lon": 106.701,
          "phone": "028...", "rating": 4.5
        }
      ]
    }
    // ...2–5 clusters
  ]
}
```

**⚙️ Backend logic:**
1. Tính bounding box từ place_ids (± 0.01° ≈ ±1km padding)
2. Query stores trong bbox bằng GIST index (cực nhanh)
3. KMeans: `n_clusters = min(max(2, len(places)), 5)`
4. Group places + stores theo cluster label

**💡 Frontend UX hint:**
- Hiển thị polygon vùng mỗi cluster trên map (convex hull)
- Color-code: mỗi cluster một màu riêng
- Tap cluster → zoom vào + hiện danh sách stores

---

#### `POST /api/v1/spatial/route-plan`

Tính lộ trình tối ưu đến nhiều cửa hàng, tích hợp thời tiết real-time.

⚠️ **Async endpoint** — Mất 1–4 giây (gọi song song OSRM + Open-Meteo).

**Request Body:**
```json
{
  "current_lat": 10.7769,
  "current_lon": 106.7009,
  "store_ids": [1, 5, 8, 12]
}
```

**Response 200:**
```json
{
  "total_distance_meters": 4850.3,
  "waypoints": [
    // Raw OSRM waypoints: [{hint, distance, name, location:[lon,lat]}]
  ],
  "polyline": "kfivEny{yEwDoF...",  // Google Encoded Polyline. NULL nếu OSRM timeout
  "optimized_order": [5, 1, 12, 8], // store_id theo thứ tự tối ưu (TSP Greedy)
  "weather_context": {
    "temperature": 32.5,    // °C tại điểm xuất phát
    "condition": "Rainy",   // "Clear"|"Cloudy"|"Rainy"|"Storm"|"Unknown"
    "code": 63              // WMO weather code raw
  }
}
```

**⚙️ Backend logic pipeline:**
```
1. fetch_real_weather(lat, lon)      ← Open-Meteo (timeout 2s)
2. calculate_tsp_greedy(stores)      ← Sắp xếp thứ tự tham lam (Euclidean)
3. OSRM: GET /route/v1/driving/{coords}?overview=full&geometries=polyline
4. Return merged result

Fallback nếu OSRM timeout:
→ polyline: null
→ waypoints: []
→ total_distance_meters: 0.0
→ optimized_order: vẫn có (từ TSP step)
```

**💡 Frontend UX hint:**
```javascript
// Decode polyline (npm: @mapbox/polyline)
import polyline from '@mapbox/polyline';
const latLngs = polyline.decode(response.polyline);
// → [[lat, lng], [lat, lng], ...]

// Nếu polyline === null → vẽ dashed straight-line giữa centers
if (!response.polyline) {
  drawDashedFallback(optimized_order);
}

// Weather overlay card on map
if (response.weather_context.condition === "Rainy") {
  showBanner("🌧️ Trời đang mưa. Nhớ mang ô!");
}

// Hiển thị badge distance
`${(response.total_distance_meters / 1000).toFixed(1)} km`
```

**Error responses:**
| Status | Detail |
|--------|--------|
| 400 | "Không có Data Cửa hàng khớp với store_ids" |
| 500 | "Lỗi Routing OSRM: ..." |

---

## 🎭 Domain: CULTURE — Kể Chuyện & Đánh Giá

**Prefix:** `/api/v1/culture` | **Tags:** `Culture & Storytelling`
**Auth:** Không cần.

---

#### `GET /api/v1/culture/places/search`

Full-text search địa danh (ilike, case-insensitive, max 20 kết quả).

**Query Parameters:**
| Param | Type | Required |
|-------|------|:--------:|
| `q` | string | ✅ |

**Example:** `GET /api/v1/culture/places/search?q=hoàn kiếm`

**Response 200:** `List[PlaceResponse]`
```json
[
  {
    "id": 1,
    "place_id": "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
    "name": "Hồ Hoàn Kiếm",
    "category": "lake",
    "address": "Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội",
    "lat": 21.0285,
    "lon": 105.8542,
    "distance_meters": null,
    "phone": null,
    "rating": 4.8,
    "review_count": 52341,
    "image_url": "https://..."
  }
  // ...max 20 items
]
```

---

#### `GET /api/v1/culture/places/{id}/story`

AI kể chuyện về địa danh bằng Gemini 2.5 Flash (timeout 3s, có fallback cứng).

**Path Params:** `id` (integer)

**Response 200:**
```json
{
  "id": 1,
  "place_id": "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
  "name": "Hồ Hoàn Kiếm",
  "category": "lake",
  "address": "Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội",
  "lat": 21.0285,
  "lon": 105.8542,
  "ai_story": "Hồ Hoàn Kiếm, hay còn gọi là Hồ Gươm, là trái tim linh thiêng của Hà Nội. Tương truyền rằng..."
}
```

**Response 404:** `{"detail": "Không tìm thấy địa điểm"}`

**⚙️ Backend logic:**
```
1. Query Place từ DB
2. Prompt Gemini: "Bạn là hướng dẫn viên du lịch, kể câu chuyện 100 từ về {name}..."
3. Timeout 3s → fallback: "[{name}] là biểu tượng nổi bật thuộc nhóm {category}..."
4. Return story
```

**💡 Frontend UX hint:**
- Typewriter animation khi render `ai_story`
- Nút "🔄 Kể lại" để gọi lại API lấy story mới
- Skeleton loading 1–3s
- Story card với gradient background theo `category`

---

#### `POST /api/v1/culture/places/{id}/reviews`

Thêm đánh giá cho địa danh.

**Path Params:** `id` (integer)

**Request Body:**
```json
{
  "author_name": "Nguyễn Văn A",
  "rating": 5,       // 1–5
  "text": "Nơi này rất đẹp và yên bình, tôi rất thích!"
}
```

**Response 200:**
```json
{
  "id": 42,
  "place_id": "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
  "author_name": "Nguyễn Văn A",
  "rating": 5,
  "text": "Nơi này rất đẹp và yên bình!",
  "time_posted": "2026-04-06T15:30:00.123456"
}
```

**Response 404:** `{"detail": "Không tìm thấy địa điểm"}`

---

#### `GET /api/v1/culture/places/{id}/reviews`

Lấy tất cả reviews của địa danh.

**Response 200:** `List[ReviewResponse]` (same schema như trên)

---

## 📦 Domain: INVENTORY — Tồn Kho & Giỏ Hàng

**Prefix:** `/api/v1/inventory` | **Tags:** `Inventory & Locking`

🔐 **Authentication (Mock JWT):**
- Header: `Authorization: Bearer user-{user_id}`
- Ví dụ: `Bearer user-7` → user_id = 7
- **Production:** Thay bằng `python-jose` JWT RS256/HS256

---

#### `GET /api/v1/inventory/products/{id}`

**Auth:** Không cần.

**Response 200:**
```json
{
  "product_id": 1,
  "name": "Áo dài Huế thêu hoa sen",
  "price": 850000,
  "original_price": 1200000,   // null nếu không có giảm giá
  "description": "Áo dài lụa cao cấp, thêu tay hoàn toàn...",
  "image_url": "https://..."
}
```

**💡 Frontend:** `discount = ((original_price - price) / original_price * 100).toFixed(0) + "%"`

---

#### `GET /api/v1/inventory/stores/{store_id}/products`

**Auth:** Không cần. Max 50 sản phẩm.

**Response 200:** `List[ProductResponse]`

---

#### `POST /api/v1/inventory/lock`

🔐 **Cần Auth.** Soft-lock sản phẩm vào giỏ hàng — 15 phút.

**Request Body:**
```json
{
  "product_id": 42,
  "quantity": 1
}
```

**Response 200:**
```json
{
  "message": "Đã chặn (Soft-lock) thành công trong 15 phút đa Server",
  "lock_id": 123,
  "expires_at": "2026-04-06T16:00:00+00:00"
}
```

**Error Responses:**
| Status | Condition | Detail |
|--------|-----------|--------|
| 409 | Redis đã lock bởi user khác | "Sản phẩm này đang nằm trong giỏ của người khác! Vui lòng thử lại sau." |
| 404 | Không có inventory record | "Sản phẩm không có thông tin tồn kho hoặc đã hết." |
| 400 | Không đủ stock | "Không đủ hàng. Tồn kho còn: {X}" |
| 503 | Redis SET thất bại | "Hệ thống đang có sự cố. Vui lòng thử lại." |

**⚙️ AEGIS 4-Phase Lock Protocol:**
```
PHASE 1: Redis Gate (< 1ms)
  └── GET lock:prod:{id}
  └── Nếu locked & owner ≠ user → 409 CONFLICT (trả về ngay)

PHASE 2: PostgreSQL Row Lock
  └── SELECT inventory WHERE product_id = X  FOR UPDATE
  └── Tính total_available = Σ(stock - locked_stock) tất cả stores
  └── Nếu total_available < quantity → 400

PHASE 3: Ghi DB + SET Redis TTL 900s
  └── inventory.locked_stock += quantity
  └── INSERT inventory_locks (status="soft_locked")
  └── REDIS SET lock:prod:{id} = user_id  EX 900

PHASE 4: Commit + Refresh → Return
```

---

#### `GET /api/v1/inventory/locks`

🔐 **Cần Auth.** Lấy giỏ hàng hiện tại của user (kèm TTL real-time từ Redis).

**Response 200:**
```json
[
  {
    "id": 123,
    "product_id": 42,
    "quantity": 1,
    "status": "soft_locked",
    "ttl_seconds": 720,          // ⬅️ Còn bao nhiêu giây (Redis TTL live)
    "expires_at": "2026-04-06T16:00:00+00:00"
  }
]
```

**💡 Frontend UX countdown:**
```javascript
// Mỗi item trong cart có countdown real-time
const timer = setInterval(() => {
  item.ttl_seconds--;
  if (item.ttl_seconds <= 0) removeFromCart(item);
  if (item.ttl_seconds <= 60) showRedWarning(item); // ⚠️ Sắp hết hạn!
}, 1000);
```

---

#### `POST /api/v1/inventory/trigger-release`

**Auth:** Không cần. (Gọi từ Cronjob nội bộ mỗi 5 phút)

**Response 200:**
```json
{
  "message": "Hệ thống đã tự động hoàn trả tồn kho cho 3 giao dịch không thanh toán."
}
```

---

## 👁️ Domain: VISION — AI Nhận Diện Hình Ảnh

**Prefix:** `/api/v1/vision` | **Tags:** `Vision & AI Matching`

**Upload constraints:**
- Max size: **10 MB**
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`

---

#### `POST /api/v1/vision/scan`

Upload ảnh → AI tìm sản phẩm tương tự (non-blocking, trả `task_id` ngay).

**Auth:** Không cần.
**Content-Type:** `multipart/form-data`
**Form field:** `file` (binary image)

**Response 200:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Ảnh đang được AI xử lý. Dùng task_id để polling kết quả."
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 415 | "Chỉ chấp nhận ảnh JPEG/PNG/WebP. Bạn đã gửi: {mime}" |
| 413 | "File vượt giới hạn 10MB. Kích thước thực: {X}MB" |

**⚙️ Async Pipeline (Celery Worker):**
```
Upload → validate → save to uploads/scans/
        → INSERT vision_tasks (status="processing")
        → Return task_id ngay

[Celery Worker - nền]:
  1. Pillow: Load image
  2. CLIP(clip-ViT-B-32): img → Vector 512D float32
  3. pgvector cosine search:
     SELECT * FROM products
     ORDER BY embedding <=> img_vector LIMIT 3
  4. UPDATE vision_tasks:
       status = "completed"
       matched_product_ids = [42, 17, 83]
       detected_objects = {"type":"clip_image_search","confidence":0.99}
```

---

#### `GET /api/v1/vision/tasks/{task_id}`

**Polling endpoint** — Gọi mỗi 2–3 giây sau khi upload.

**Response 200 (processing):**
```json
{
  "task_id": "550e8400-...",
  "status": "processing",
  "detected_objects": null,
  "matched_product_ids": null,
  "image_path": "uploads/scans/photo.jpg",
  "created_at": "2026-04-06T15:30:00+00:00"
}
```

**Response 200 (completed):**
```json
{
  "task_id": "550e8400-...",
  "status": "completed",
  "detected_objects": { "type": "clip_image_search", "confidence": 0.99 },
  "matched_product_ids": [42, 17, 83],
  "image_path": "uploads/scans/photo.jpg",
  "created_at": "2026-04-06T15:30:00+00:00"
}
```

**Response 404:** `{"detail": "Task không tồn tại"}`

**💡 Frontend Polling Pattern:**
```javascript
async function pollUntilDone(taskId, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    await sleep(2000);
    const res = await fetch(`/api/v1/vision/tasks/${taskId}`);
    const data = await res.json();
    
    if (data.status === 'completed') {
      // Fetch product details for each matched ID
      const products = await Promise.all(
        data.matched_product_ids.map(id =>
          fetch(`/api/v1/inventory/products/${id}`).then(r => r.json())
        )
      );
      showProductGrid(products); // Show with stagger animation
      return;
    }
    if (data.status === 'failed') {
      showError("AI không nhận diện được ảnh này.");
      return;
    }
    updateProgress(i / maxRetries); // Progress ring UI
  }
  showError("Hết thời gian chờ. Vui lòng thử lại.");
}
```

---

#### `POST /api/v1/vision/closet`

🔐 **Cần Auth.** Upload trang phục vào Tủ đồ ảo cá nhân.

**Content-Type:** `multipart/form-data` | **Form field:** `file`

**Response 200:**
```json
{
  "id": 7,
  "user_id": 3,
  "image_path": "uploads/closet/dress.jpg",
  "created_at": "2026-04-06T15:30:00+00:00"
}
```

**⚙️ Backend:** CLIP encode ảnh → lưu vector 512D vào `virtual_closets.vector_embedding` (qua Celery task).

---

#### `GET /api/v1/vision/closet`

🔐 **Cần Auth.** Lấy toàn bộ tủ đồ của user.

**Response 200:** `List[ClosetItemResponse]` (same schema)

---

## 🔐 AUTHENTICATION

| Field | Value |
|-------|-------|
| Type | HTTP Bearer Token |
| Header | `Authorization: Bearer user-{id}` |
| Ví dụ | `Authorization: Bearer user-7` → user_id = 7 |
| Response 401 | `{"detail": "Token bảo mật Authentication không hợp lệ hoặc đã hết hạn"}` |

**Protected endpoints:**
- `POST /api/v1/inventory/lock`
- `GET /api/v1/inventory/locks`  
- `POST /api/v1/vision/closet`
- `GET /api/v1/vision/closet`

---

## ⚙️ HẠ TẦNG & DỊCH VỤ

### Docker Services
| Service | Image | Port (host:container) | Mô tả |
|---------|-------|-----------------------|-------|
| `aegis_postgres` | `postgis/postgis:15-3.4` | `5432:5432` | Database chính |
| `aegis_redis` | `redis:7-alpine` | `6379:6379` | Cache + TTL lock |
| `aegis_rabbitmq` | `rabbitmq:3.12-management-alpine` | `5672:5672` \| `15672:15672` | Message broker + Management UI |
| `aegis_osrm` | `osrm/osrm-backend:latest` | `5000:5000` | Private routing engine |

### Celery Workers
| Worker Module | Task Name | Trigger |
|---------------|-----------|---------|
| `ai_worker` | `process_image` | POST /vision/scan |
| `ai_worker` | `process_closet_image` | POST /vision/closet |
| `context_worker` | Background sweep | Cronjob |

### External API Calls
| Service | Endpoint | Timeout | Fallback |
|---------|----------|---------|----------|
| **Gemini 2.5 Flash** | `generativelanguage.googleapis.com/v1beta` | Agent: 10s / Story: 3s | Template cứng tiếng Việt |
| **Open-Meteo** | `api.open-meteo.com/v1/forecast` | 2s | `{condition:"Unknown",code:-1}` |
| **OSRM Public** | `router.project-osrm.org/route/v1/driving` | 3s | `{polyline:null, waypoints:[]}` |

### AI Model (Celery Worker)
```
Model: CLIP ViT-B/32 (via sentence-transformers)
Package: sentence-transformers >= 2.2.0
Load strategy: Singleton on worker startup (tải 1 lần, dùng mãi)
Output dimension: 512D float32 vector
Use case 1: /vision/scan → cosine similarity với products.embedding
Use case 2: /vision/closet → lưu vector vào virtual_closets.vector_embedding
```

---

## 🌐 CORS

```
Allowed origins: ["http://localhost:3000", "http://localhost:8080"]
Allowed methods: GET, POST, PUT, DELETE
Allowed headers: Authorization, Content-Type
Allow credentials: true
```

---

## 🔑 ENVIRONMENT VARIABLES

| Variable | Default | Mô tả |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://aegis_user:aegis_secret@localhost:5432/aegis_db` | |
| `REDIS_URL` | `redis://localhost:6379/0` | |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672//` | |
| `GEMINI_API_KEY` | `""` | **Bắt buộc** |
| `ALLOWED_ORIGINS` | `["http://localhost:3000","http://localhost:8080"]` | |
| `MAX_UPLOAD_SIZE_MB` | `10` | |
| `ALLOWED_IMAGE_TYPES` | `["image/jpeg","image/png","image/webp"]` | |
| `INVENTORY_LOCK_TTL` | `900` | Giây (= 15 phút) |

---

## 🗺️ LUỒNG O2O HOÀN CHỈNH

```
User mở app
    │
    ▼ 1. KHÁM PHÁ (Discover)
POST /agent/chat
"Tôi ở Hà Nội, trời có mưa không? Gợi ý địa điểm đẹp"
→ AI gọi search_culture + check_weather nội bộ
→ "Hà Nội đang mưa nhẹ 24°C, gợi ý Hồ Hoàn Kiếm..."
    │
    ▼ 2. TÌM KIẾM (Find)
GET /spatial/nearby-places?lat=21.03&lon=105.85&radius=3000
→ 15 địa điểm, sorted by distance
    │
    ▼ 3. THU THẬP CÂU CHUYỆN (Story)
GET /culture/places/5/story
→ AI kể chuyện về Hồ Hoàn Kiếm (typewriter effect)
    │
    ▼ 4. GOM CỤM MUA SẮM (Cluster)
POST /spatial/cluster-stores { place_ids: [5,8,12] }
→ 2 clusters gợi ý khu mua sắm
    │
    ▼ 5. LỘ TRÌNH (Route)
POST /spatial/route-plan { store_ids: [1,5,8] }
→ polyline + weather context "Rainy → mang ô!"
    │
    ▼ 6. NHẬN DIỆN SẢN PHẨM (Scan)
POST /vision/scan [ảnh áo len]
→ task_id → poll GET /vision/tasks/{id}
→ matched_product_ids: [42, 17, 83]
→ Fetch → hiển thị grid 3 sản phẩm tương tự
    │
    ▼ 7. GIỮ HÀNG (Lock)
POST /inventory/lock { product_id: 42 }
→ Soft-lock 15 phút + countdown timer
    │
    ▼ 8. ĐÁNH GIÁ (Review)
POST /culture/places/5/reviews
GET /culture/places/5/reviews
→ Feedback loop → AI learning
```

---

## 🎨 GỢI Ý UI/UX CHO FRONTEND AI

### Screens & Components
| Screen | API calls chính | UX đặc trưng |
|--------|----------------|-------------|
| **AI Chat** | `/agent/chat` | Glassmorphism bubbles, typing dots, chain-of-thought chips |
| **Map Explorer** | `/spatial/nearby-places` | Full-screen map, bottom-sheet swipeable, distance badges |
| **Place Detail** | `/culture/places/{id}/story` | Hero image, typewriter story, star reviews |
| **Cluster View** | `/spatial/cluster-stores` | Color-coded polygon areas, store cards |
| **Smart Route** | `/spatial/route-plan` | Animated polyline draw, weather banner, step list |
| **AI Scanner** | `/vision/scan` + poll | Camera FAB, progress ring, product match grid |
| **My Cart** | `/inventory/locks` | Countdown timers per item, urgency colors |
| **Virtual Closet** | `/vision/closet` | Mosaic photo grid, "AI processing" badge |
| **Search** | `/culture/places/search` | Instant search debounce 300ms, map pin preview |

### UX Error Handling
| Error | Message hiển thị | Action |
|-------|-----------------|--------|
| 409 Conflict | "⚡ Hàng hot! Người khác vừa đặt. Thử lại?" | Retry button |
| 400 Out of stock | Badge "Hết hàng" | Disabled button |
| 415/413 Vision | "Chỉ nhận ảnh JPG/PNG/WebP dưới 10MB" | Re-upload |
| 404 Place | "Không tìm thấy địa điểm" | Empty state + search CTA |
| Agent timeout | "🔄 AI đang bận. Thử lại sau ít giây" | Auto-retry 3s |
| polyline null | Vẽ dashed straight-line | Silent fallback |

### Real-time Features
```
Cart countdown:   Poll không cần — dùng client-side setInterval(1s)
Vision polling:   GET /tasks/{id} mỗi 2s, max 30s
Weather context:  Lấy 1 lần từ route-plan, cache local
```

### Recommended Frontend Stack
```
Framework:  React Native (mobile) / Next.js 14 (web)
Map:        Mapbox GL JS / react-native-maps
Polyline:   @mapbox/polyline
HTTP:       axios / fetch API
State:      Zustand / Jotai
Animation:  Framer Motion / Reanimated 3
UI:         Nativewind / Tailwind + shadcn/ui
```

---

*Tài liệu được tạo từ source code AEGIS Backend v1.0.0*  
*📅 2026-04-06 | Aegis O2O AI Agent Platform*
