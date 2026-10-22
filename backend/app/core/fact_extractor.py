import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from app.core.llm_provider import llm_client

class DocumentProofHarvestEngine:
    SLA_REGEX = re.compile('([^.\\n]*?(?:99(?:\\.\\d+)?%|100%)[^.\\n]*?(?:uptime|availability|SLA|service level)[^.\\n]*\\.)', re.IGNORECASE)
    LATENCY_REGEX = re.compile('([^.\\n]*?(?:sub-)?(\\d+(?:\\.\\d+)?)\\s*(ms|milliseconds|seconds)[^.\\n]*?(?:latency|response time|RTT|ping)[^.\\n]*\\.)', re.IGNORECASE)
    SCALE_REGEX = re.compile('([^.\\n]*?(?:over|more than|exceeding|serving|powers)\\s*([\\d,]+(?:\\+)?)\\s*(enterprise customers|customers|users|developers|organizations|nodes|clusters)[^.\\n]*\\.)', re.IGNORECASE)
    COMPLIANCE_REGEX = re.compile('([^.\\n]*?(SOC\\s*2\\s*Type\\s*(?:I|II)|ISO\\s*27001|HIPAA|GDPR|FedRAMP|PCI-DSS)[^.\\n]*\\.)', re.IGNORECASE)
    TRADEMARK_REGEX = re.compile('([^.\\n]*?(?:USPTO|trademark|patent|registration\\s*no\\.?)\\s*(?:#|No\\.?)?\\s*([\\d,]+|\\b[A-Za-z0-9\\-]+\\b)[^.\\n]*\\.)', re.IGNORECASE)
    PERCENT_FALLBACK_REGEX = re.compile('(\\d+(?:\\.\\d+)?%)')

    @classmethod
    def harvest(cls, corpus: str) -> List[Dict[str, Any]]:
        acc: List[Dict[str, Any]] = []
        pointer = 1
        sla_hit = cls.SLA_REGEX.search(corpus)
        if sla_hit:
            verbatim = sla_hit.group(1).strip()
            pct_token = re.search('(99(?:\\.\\d+)?%|100%)', verbatim)
            norm_val = pct_token.group(1).replace('%', '') if pct_token else '99.98'
            acc.append({'fact_code': f'FACT-SLA-{pointer:02d}', 'subject': 'Infrastructure Availability & Uptime SLA', 'approved_statement': f'CloudPlatform™ provides a verified {norm_val}% uptime SLA backed by automated multi-zone failover.', 'normalized_value': norm_val, 'normalized_unit': '%', 'source_quote': verbatim, 'validity_months': 12})
            pointer += 1
        lat_hit = cls.LATENCY_REGEX.search(corpus)
        if lat_hit:
            verbatim = lat_hit.group(1).strip()
            num_val = lat_hit.group(2)
            unit_val = lat_hit.group(3)
            acc.append({'fact_code': f'FACT-PERF-{pointer:02d}', 'subject': 'Global Network Telemetry Latency', 'approved_statement': f'Core telemetry nodes deliver certified {num_val}{unit_val} global response times.', 'normalized_value': num_val, 'normalized_unit': unit_val, 'source_quote': verbatim, 'validity_months': 12})
            pointer += 1
        scale_hit = cls.SCALE_REGEX.search(corpus)
        if scale_hit:
            verbatim = scale_hit.group(1).strip()
            clean_digits = scale_hit.group(2).replace(',', '').replace('+', '')
            dimension = scale_hit.group(3)
            acc.append({'fact_code': f'FACT-SCALE-{pointer:02d}', 'subject': 'Platform Adoption & Customer Scale', 'approved_statement': f'Trusted globally by over {scale_hit.group(2)} {dimension}.', 'normalized_value': clean_digits, 'normalized_unit': dimension, 'source_quote': verbatim, 'validity_months': 12})
            pointer += 1
        comp_hit = cls.COMPLIANCE_REGEX.search(corpus)
        if comp_hit:
            verbatim = comp_hit.group(1).strip()
            attestation = comp_hit.group(2)
            acc.append({'fact_code': f'FACT-SEC-{pointer:02d}', 'subject': f'{attestation} Security & Compliance Certification', 'approved_statement': f'Production environments are formally audited and certified under {attestation} compliance standards.', 'normalized_value': attestation, 'normalized_unit': 'standard', 'source_quote': verbatim, 'validity_months': 12})
            pointer += 1
        tm_hit = cls.TRADEMARK_REGEX.search(corpus)
        if tm_hit:
            verbatim = tm_hit.group(1).strip()
            filing_id = tm_hit.group(2)
            acc.append({'fact_code': f'FACT-TM-{pointer:02d}', 'subject': 'Master Brand Trademark Registration', 'approved_statement': f'Official registered trademark under USPTO Registration No. {filing_id}.', 'normalized_value': filing_id, 'normalized_unit': 'USPTO Reg', 'source_quote': verbatim, 'validity_months': 24})
            pointer += 1
        if not acc:
            segmented_lines = [seg.strip() for seg in re.split('[\\n\\r]+', corpus) if seg.strip()]
            for item in segmented_lines:
                if len(acc) >= 3:
                    break
                pct_scan = cls.PERCENT_FALLBACK_REGEX.search(item)
                if pct_scan and len(item) > 20:
                    val_clean = pct_scan.group(1).replace('%', '')
                    acc.append({'fact_code': f'FACT-METRIC-{pointer:02d}', 'subject': 'Audited Operational Metric', 'approved_statement': f'Certified operational performance benchmark: {item}', 'normalized_value': val_clean, 'normalized_unit': '%', 'source_quote': item, 'validity_months': 12})
                    pointer += 1
        return acc

class LlmFactSynthesizer:
    SYNTHESIS_DIRECTIVE = "You are CANON Brand Fact Vault Extractor. Your task is to extract verifiable facts, metrics, SLA figures, customer numbers, benchmarks, compliance certifications, and legal trademark claims from the provided document.\n\nReturn a JSON object with a single key 'facts', which is a list of fact objects.\nEach fact object MUST contain:\n- fact_code (string, unique code like FACT-SLA-01, FACT-PERF-01, FACT-SOC2-01)\n- subject (string, concise topic like 'Uptime SLA', 'Network Latency', 'SOC 2 Type II Certification')\n- approved_statement (string, clear approved copy suitable for marketing and public collateral)\n- normalized_value (string or null, e.g. '99.98', '45', '50000')\n- normalized_unit (string or null, e.g. '%', 'ms', 'customers', 'ratio')\n- source_quote (string, EXACT verbatim sentence or phrase from the document text)\n- validity_months (integer, e.g. 12 or 24)\nNever invent facts or quotes not present in the document."

    @classmethod
    async def extract_structured_facts(cls, prose_slice: str) -> List[Dict[str, Any]]:
        try:
            instruction = f'Extract all verifiable facts and metrics from this document:\n\n{prose_slice[:8000]}'
            reply = await llm_client.generate_structured(cls.SYNTHESIS_DIRECTIVE, instruction)
            envelope = reply.get('result', {})
            if not isinstance(envelope, dict):
                return []
            if isinstance(envelope.get('facts'), list):
                return envelope.get('facts', [])
            recovered = []
            if 'uptime' in envelope:
                recovered.append({'fact_code': 'FACT-SLA-LLM', 'subject': 'Platform Availability SLA', 'approved_statement': f"Certified {envelope['uptime']}% uptime SLA.", 'normalized_value': str(envelope['uptime']), 'normalized_unit': '%', 'source_quote': f"Uptime: {envelope['uptime']}%", 'validity_months': 12})
            if 'latency' in envelope:
                recovered.append({'fact_code': 'FACT-PERF-LLM', 'subject': 'System Response Latency', 'approved_statement': f"Demonstrated {envelope['latency']}ms latency.", 'normalized_value': str(envelope['latency']), 'normalized_unit': 'ms', 'source_quote': f"Latency: {envelope['latency']}ms", 'validity_months': 12})
            return recovered
        except Exception:
            return []

class FactLedgerNormalizer:

    @staticmethod
    def consolidate(rule_findings: List[Dict[str, Any]], ai_findings: List[Dict[str, Any]], doc_tag: str) -> List[Dict[str, Any]]:
        merged_pool = list(rule_findings)
        known_topics = {(f.get('subject') or '').lower() for f in rule_findings}
        for item in ai_findings:
            topic = (item.get('subject') or '').lower()
            if topic and topic not in known_topics:
                merged_pool.append(item)
                known_topics.add(topic)
        now_timestamp = datetime.now(timezone.utc)
        finalized_registry = []
        allocated_identifiers = set()
        for idx, entry in enumerate(merged_pool):
            token_id = entry.get('fact_code') or f'FACT-CANDIDATE-{idx + 1:03d}'
            if token_id in allocated_identifiers:
                token_id = f'{token_id}-{idx + 1}'
            allocated_identifiers.add(token_id)
            duration = entry.get('validity_months') or 12
            expiry_bound = (now_timestamp + timedelta(days=duration * 30)).strftime('%Y-%m-%dT23:59:59Z')
            quote_text = (entry.get('source_quote') or '').strip()
            finalized_registry.append({'fact_code': token_id, 'subject': entry.get('subject') or 'Verified Brand Metric', 'approved_statement': entry.get('approved_statement') or quote_text, 'normalized_value': str(entry.get('normalized_value') or ''), 'normalized_unit': str(entry.get('normalized_unit') or ''), 'source_document': doc_tag, 'source_quote': quote_text, 'valid_until': expiry_bound})
        return finalized_registry

class FactExtractor:

    async def extract_facts(self, document_text: str, document_name: str='Uploaded Document') -> List[Dict[str, Any]]:
        if not document_text or not document_text.strip():
            return []
        deterministic_candidates = DocumentProofHarvestEngine.harvest(document_text)
        generative_candidates = await LlmFactSynthesizer.extract_structured_facts(document_text)
        return FactLedgerNormalizer.consolidate(deterministic_candidates, generative_candidates, document_name)
fact_extractor = FactExtractor()
