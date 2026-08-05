import asyncio
import json
import os
import re
import sys


source_dir = os.environ.get("TIKTOKAPI_SOURCE_DIR", "")
if source_dir and os.path.isdir(source_dir):
    sys.path.insert(0, source_dir)

from TikTokApi import TikTokApi  # noqa: E402


KEYWORDS = [
    item.strip()
    for item in os.environ.get(
        "TIKTOKAPI_KEYWORDS",
        "beauty creator,skincare creator,makeup creator,haircare creator,self care creator,personal care creator,lifestyle creator,beauty products",
    ).split(",")
    if item.strip()
]
MIN_FOLLOWERS = int(os.environ.get("TIKTOKAPI_MIN_FOLLOWERS", "2000"))
MAX_FOLLOWERS = int(os.environ.get("TIKTOKAPI_MAX_FOLLOWERS", "20000"))
MAX_TOTAL = int(os.environ.get("TIKTOKAPI_MAX_TOTAL", "120"))
COUNT_PER_KEYWORD = int(os.environ.get("TIKTOKAPI_COUNT_PER_KEYWORD", "20"))
MS_TOKEN = os.environ.get("TIKTOK_MS_TOKEN") or os.environ.get("ms_token")


def clean(value):
    return str(value or "").strip()


def compact_number(value):
    value = int(value or 0)
    if value >= 1_000_000:
        return f"{value / 1_000_000:.1f}M".replace(".0M", "M")
    if value >= 1_000:
        return f"{value / 1_000:.1f}K".replace(".0K", "K")
    return str(value)


def detect_category(text):
    value = text.lower()
    rules = [
        ("Haircare", ["hair", "haircare", "hair care", "wash day", "scalp", "curls"]),
        ("Skincare", ["skin", "skincare", "skin care", "sunscreen", "cleanser", "serum"]),
        ("Cosmetics", ["makeup", "cosmetics", "lip", "foundation", "glam"]),
        ("Personal Care", ["body care", "bodycare", "personal care", "deodorant", "bath"]),
        ("Self Care", ["self care", "selfcare", "self-care", "wellness"]),
        ("Beauty", ["beauty", "glow", "routine", "beauty products"]),
        ("Lifestyle", ["lifestyle", "daily", "daily routine", "vlog", "grwm", "fashion"]),
    ]
    for category, terms in rules:
        if any(term in value for term in terms):
            return category
    return "Beauty"


def extract_email(text):
    match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I)
    return match.group(0) if match else ""


def creator_from_info(info):
    user = info.get("userInfo", {}).get("user", {}) or info.get("user", {}) or {}
    stats = info.get("userInfo", {}).get("stats", {}) or info.get("stats", {}) or {}
    username = clean(user.get("uniqueId") or user.get("unique_id"))
    follower_count = int(stats.get("followerCount") or stats.get("follower_count") or 0)
    following_count = int(stats.get("followingCount") or stats.get("following_count") or 0)
    likes_count = int(stats.get("heartCount") or stats.get("diggCount") or stats.get("likes_count") or 0)
    bio = clean(user.get("signature"))
    return {
        "creatorId": clean(user.get("id") or user.get("uid") or username),
        "name": clean(user.get("nickname")) or username,
        "username": username.lower(),
        "tiktokLink": f"https://www.tiktok.com/@{username}" if username else "",
        "followers": compact_number(follower_count),
        "followerCount": follower_count,
        "following": compact_number(following_count) if following_count else "",
        "followingCount": following_count,
        "likes": compact_number(likes_count) if likes_count else "",
        "likesCount": likes_count,
        "category": detect_category(bio),
        "email": extract_email(bio),
        "location": "",
        "city": "",
        "state": "",
        "country": "United States",
        "bio": bio,
        "website": clean(user.get("bioLink", {}).get("link") if isinstance(user.get("bioLink"), dict) else ""),
        "instagram": "",
        "youtube": "",
        "profilePicture": clean(user.get("avatarLarger") or user.get("avatarMedium") or user.get("avatarThumb")),
        "lastUpdated": os.environ.get("TODAY", ""),
        "confidence": 76,
    }


async def main():
    if not MS_TOKEN:
        raise RuntimeError("TIKTOK_MS_TOKEN is required for TikTokApi direct search.")

    creators = {}
    async with TikTokApi() as api:
        await api.create_sessions(
            ms_tokens=[MS_TOKEN],
            num_sessions=1,
            sleep_after=3,
            browser=os.environ.get("TIKTOK_BROWSER", "chromium"),
            headless=True,
            allow_partial_sessions=True,
            min_sessions=1,
        )
        for keyword in KEYWORDS:
            async for user in api.search.users(keyword, count=COUNT_PER_KEYWORD):
                if len(creators) >= MAX_TOTAL:
                    break
                try:
                    info = await user.info()
                    creator = creator_from_info(info)
                    if (
                        creator["username"]
                        and MIN_FOLLOWERS <= creator["followerCount"] <= MAX_FOLLOWERS
                    ):
                        creators[creator["username"]] = creator
                except Exception as error:
                    print(f"skip {getattr(user, 'username', '')}: {error}", file=sys.stderr)
            if len(creators) >= MAX_TOTAL:
                break

    print(json.dumps({"creators": list(creators.values())}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
