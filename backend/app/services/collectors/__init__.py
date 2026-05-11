from .reddit import RedditCollector
from .hackernews import HackerNewsCollector
from .amazon import AmazonCollector
from .g2 import G2Collector
from .youtube import YouTubeCollector
from .facebook import FacebookCollector
from .stackoverflow import StackOverflowCollector
from .github import GitHubIssuesCollector
from .trustpilot import TrustpilotCollector
from .capterra import CapterraCollector
from .base import BaseCollector

__all__ = [
    "RedditCollector",
    "HackerNewsCollector",
    "AmazonCollector",
    "G2Collector",
    "YouTubeCollector",
    "FacebookCollector",
    "StackOverflowCollector",
    "GitHubIssuesCollector",
    "TrustpilotCollector",
    "CapterraCollector",
    "BaseCollector",
]
