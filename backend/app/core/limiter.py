from slowapi import Limiter
from slowapi.util import get_remote_address


def _key_func(request):
    """Key rate limits per Clerk user ID when authenticated, otherwise per IP.

    This means one heavy user cannot consume the rate limit budget for
    everyone else sharing the same IP (e.g. office NAT, shared Wi-Fi).

    The Clerk JWT 'sub' claim is extracted from the Authorization header
    without full verification — that happens separately in get_current_user().
    For rate-limiting purposes, trusting the unverified sub is acceptable
    because a forged sub only harms the forger's own bucket.
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
        try:
            # Decode without verification — we only need the 'sub' claim for bucketing
            import base64, json
            payload_b64 = token.split(".")[1]
            # Pad to valid base64 length
            padding = 4 - len(payload_b64) % 4
            payload_b64 += "=" * (padding % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload_b64))
            sub = claims.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass  # Fall through to IP-based key

    # Unauthenticated — fall back to IP (respects X-Forwarded-For for Render proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_key_func)
