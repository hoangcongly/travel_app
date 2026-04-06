import redis.asyncio as aioredis
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

async def get_redis():
    """Tạo Dependency trả về một Async Redis Connection. An toàn không chặn luồng (Non-blocking)"""
    client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.close()
