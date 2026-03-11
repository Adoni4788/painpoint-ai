"""
Unit tests for G2 collector normalization and integration.
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch

from app.services.collectors.g2 import G2Collector, _normalize_review
from app.services.collectors.base import CollectedPost


class TestNormalizeReview:
    """Tests for _normalize_review function."""

    def test_combines_cons_pros_recommendations_benefits(self):
        attrs = {
            "answers": {
                "hate": {"text": "What do you dislike?", "value": "The UI is confusing and support is slow."},
                "love": {"text": "What do you like best?", "value": "Good integrations."},
                "recommendations": {"text": "Recommendations?", "value": "Improve onboarding."},
                "benefits": {"text": "Benefits?", "value": "Saved time."},
            },
            "title": "Solid but has issues",
            "url": "https://www.g2.com/products/foo/reviews/bar",
            "product_name": "TestProduct",
            "user": {"name": "Jane D."},
            "submitted_at": "2024-01-15T10:00:00-05:00",
        }
        result = _normalize_review(attrs, "TestProduct")
        assert result is not None
        assert result.source == "g2"
        assert "[Cons]" in result.text
        assert "UI is confusing" in result.text
        assert "[Pros]" in result.text
        assert "Good integrations" in result.text
        assert "[Recommendations]" in result.text
        assert "onboarding" in result.text
        assert result.author == "Jane D."
        assert result.url == "https://www.g2.com/products/foo/reviews/bar"
        assert result.title == "Solid but has issues"

    def test_prioritizes_cons_over_pros(self):
        attrs = {
            "answers": {
                "hate": {"value": "Major bug with export feature."},
                "love": {"value": "Nice design."},
            },
            "product_name": "AppX",
        }
        result = _normalize_review(attrs, "AppX")
        assert result is not None
        assert result.text.index("[Cons]") < result.text.index("[Pros]")

    def test_returns_none_for_too_short(self):
        attrs = {
            "answers": {"hate": {"value": "Ok"}},
            "product_name": "X",
        }
        result = _normalize_review(attrs, "X")
        assert result is None

    def test_handles_missing_answers(self):
        attrs = {"answers": {}, "product_name": "Y"}
        result = _normalize_review(attrs, "Y")
        assert result is None

    def test_handles_string_values(self):
        attrs = {
            "answers": {
                "hate": "Broken sync.",
                "love": "Fast.",
            },
            "product_name": "Z",
        }
        result = _normalize_review(attrs, "Z")
        assert result is not None
        assert "Broken sync" in result.text

    def test_truncates_text_to_2000(self):
        long_cons = "x" * 2500
        attrs = {
            "answers": {"hate": {"value": long_cons}},
            "product_name": "Long",
        }
        result = _normalize_review(attrs, "Long")
        assert result is not None
        assert len(result.text) <= 2000

    def test_uses_product_name_for_title_when_missing(self):
        attrs = {
            "answers": {"hate": {"value": "Something bad about the product."}},
            "product_name": "MySoftware",
        }
        result = _normalize_review(attrs, "MySoftware")
        assert result is not None
        assert result.title == "Review of MySoftware"


@pytest.mark.asyncio
class TestG2Collector:
    """Integration-style tests for G2Collector (mocked HTTP)."""

    async def test_returns_empty_when_no_api_key(self):
        with patch("app.services.collectors.g2.get_settings") as mock_settings:
            mock_settings.return_value.g2_api_key = ""
            collector = G2Collector()
            result = await collector.collect("email marketing software", limit=10)
            assert result == []

    async def test_collects_reviews_when_mocked(self):
        """Test collect() orchestration by mocking _search_products and _fetch_reviews."""
        sample_post = CollectedPost(
            source="g2",
            title="Review of Mailchimp",
            text="[Cons] Deliverability issues and spam folder problems. [Pros] Easy to use.",
            author="Alex T.",
            url="https://www.g2.com/products/mailchimp/reviews/1",
            timestamp=None,
        )

        async def mock_search(self, _client, query, limit):
            return ["prod-123"]

        async def mock_fetch(self, _client, product_id, per_product):
            return [sample_post]

        with patch("app.services.collectors.g2.get_settings") as mock_settings:
            mock_settings.return_value.g2_api_key = "test-token"

            with patch.object(G2Collector, "_search_products", mock_search), patch.object(
                G2Collector, "_fetch_reviews", mock_fetch
            ):
                collector = G2Collector()
                result = await collector.collect("mailchimp", limit=10)

                assert len(result) >= 1
                assert all(isinstance(p, CollectedPost) for p in result)
                assert all(p.source == "g2" for p in result)
                assert "Deliverability" in result[0].text or "deliverability" in result[0].text.lower()
