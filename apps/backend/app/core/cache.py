import json
import functools
import logging
from fastapi import Request, Response
from ..database import redis_client

logger = logging.getLogger(__name__)

def cache_response(expire_seconds: int = 60):
    """
    Asynchronous Redis-backed caching decorator.
    Caches JSON endpoint responses based on path and query parameters.
    Bypasses caching seamlessly if Redis is offline or experiences errors.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Attempt to extract Request object from arguments
            request: Request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            # If no Request object is passed to the route, skip caching
            if not request:
                return await func(*args, **kwargs)
            
            # Construct a unique cache key
            cache_key = f"cache:{request.url.path}:{request.url.query}"
            
            try:
                cached = await redis_client.get(cache_key)
                if cached:
                    logger.debug(f"Redis Cache HIT for key: {cache_key}")
                    data = json.loads(cached)
                    return Response(
                        content=data["content"],
                        media_type=data["media_type"],
                        headers={"X-Cache": "HIT"}
                    )
            except Exception as e:
                logger.error(f"Redis cache read error: {e}")
            
            # Cache miss - execute handler
            result = await func(*args, **kwargs)
            
            # Cache response
            try:
                # Cache only standard responses or JSON responses
                if isinstance(result, Response):
                    response_data = {
                        "content": result.body.decode("utf-8"),
                        "media_type": result.media_type
                    }
                    await redis_client.setex(
                        cache_key,
                        expire_seconds,
                        json.dumps(response_data)
                    )
                elif isinstance(result, (dict, list)):
                    response_data = {
                        "content": json.dumps(result),
                        "media_type": "application/json"
                    }
                    await redis_client.setex(
                        cache_key,
                        expire_seconds,
                        json.dumps(response_data)
                    )
            except Exception as e:
                logger.error(f"Redis cache write error: {e}")
                
            return result
        return wrapper
    return decorator
