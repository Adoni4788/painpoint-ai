from slowapi import Limiter
from slowapi.util import get_remote_address


def _key_func(request):
    """Use X-Forwarded-For when behind a proxy (e.g. Render)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_key_func)
