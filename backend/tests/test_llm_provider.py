import pytest
import os
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.llm_provider import clean_json_response, LLMProvider
from app.config import settings

def test_clean_json_response_plain():
    data = '{"purpose": "brand governance", "status": "active"}'
    assert clean_json_response(data) == {"purpose": "brand governance", "status": "active"}

def test_clean_json_response_markdown_fence():
    data = '```json\n{"must_keep_facts": ["SLA 99.98%"]}\n```'
    assert clean_json_response(data) == {"must_keep_facts": ["SLA 99.98%"]}

def test_clean_json_response_surrounding_text():
    data = 'Here is the analysis:\n{"claims": [{"claim_text": "fastest"}]}\nHope this assists.'
    assert clean_json_response(data) == {"claims": [{"claim_text": "fastest"}]}

def test_clean_json_response_list_format():
    data = '```json\n[{"rule_code": "TONE-01"}]\n```'
    assert clean_json_response(data) == [{"rule_code": "TONE-01"}]

@pytest.mark.asyncio
async def test_llm_provider_heuristic_fallback():
    provider = LLMProvider()
    resp = await provider.generate_structured("Analyze intent", "This text is for Apex Core")
    assert "result" in resp
    assert "disclosure" in resp
    disc = resp["disclosure"]
    assert "provider" in disc
    assert "model" in disc
    assert "latency_ms" in disc

@pytest.mark.asyncio
async def test_llm_provider_huggingface_mock_flow():
    with patch("huggingface_hub.AsyncInferenceClient") as MockClient:
        mock_instance = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = '{"purpose": "Enterprise Governance", "target_audience": "B2B"}'
        mock_resp = MagicMock()
        mock_resp.choices = [mock_choice]
        mock_instance.chat.completions.create = AsyncMock(return_value=mock_resp)
        MockClient.return_value = mock_instance

        with patch.object(settings, "LLM_PROVIDER", "huggingface"), \
             patch.object(settings, "HF_TOKEN", "hf_test_token_12345"), \
             patch.object(settings, "HF_MODEL", "Qwen/Qwen2.5-7B-Instruct"), \
             patch.object(settings, "HF_REGION", "us-east-1"):
            
            provider = LLMProvider()
            resp = await provider.generate_structured("System instruction", "User text")
            
            assert resp["result"] == {"purpose": "Enterprise Governance", "target_audience": "B2B"}
            assert resp["disclosure"]["provider"] == "Hugging Face Cloud Inference"
            assert resp["disclosure"]["model"] == "Qwen/Qwen2.5-7B-Instruct"
            assert resp["disclosure"]["region"] == "us-east-1"
            assert resp["disclosure"]["is_local"] is False

def test_health_check_endpoint_contains_llm_metadata(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "llm_provider" in data
    assert "llm_model" in data
    assert "llm_region" in data
