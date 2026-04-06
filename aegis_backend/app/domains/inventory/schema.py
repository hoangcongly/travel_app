from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProductResponse(BaseModel):
    product_id: int
    name: str
    price: float
    original_price: Optional[int] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    class Config:
        from_attributes = True

class LockRequest(BaseModel):
    product_id: int
    quantity: int = 1

class LockResponseItem(BaseModel):
    id: int
    product_id: int
    quantity: int
    status: str
    ttl_seconds: int
    expires_at: datetime
    class Config:
        from_attributes = True
