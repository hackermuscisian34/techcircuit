from datetime import datetime, timezone
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import Fact, ExtractedClaim
from app.core.llm_provider import llm_client
HYPERBOLE_EXPRESSIONS = ("\\b(?:world\\'?s\\s+)?(best|fastest|cheapest|greatest|most\\s+powerful|#1|leading|unmatched|unrivaled)\\b", '\\b(guaranteed\\s+(?:100%|always))\\b', '\\b(only\\s+platform\\s+that)\\b')

class LexicalScorer:

    @staticmethod
    def rank_fact_alignment(query_tokens: set, target_subject: str) -> int:
        subject_tokens = set(target_subject.lower().split())
        return len(query_tokens.intersection(subject_tokens))

class AssertionEvaluator:

    @staticmethod
    def check_hyperbole(assertion: str, tag: str) -> Optional[Dict[str, Any]]:
        if tag != 'SUPERLATIVE':
            return None
        return {'claim_text': assertion, 'claim_type': tag, 'matched_fact_id': None, 'status': 'NEEDS_PROOF', 'reasoning': f"Unsubstantiated superlative '{assertion}' requires certified evidence document before publication."}

    @staticmethod
    def check_temporal_freshness(claim_text: str, tag: str, anchor: Fact, reference_epoch: datetime) -> Optional[Dict[str, Any]]:
        horizon = anchor.valid_until if anchor.valid_until.tzinfo else anchor.valid_until.replace(tzinfo=timezone.utc)
        if horizon >= reference_epoch:
            return None
        return {'claim_text': claim_text, 'claim_type': tag, 'matched_fact_id': anchor.id, 'status': 'STALE', 'reasoning': f"Approved fact '{anchor.fact_code}' expired on {anchor.valid_until.strftime('%Y-%m-%d')}. Owner: {anchor.owner_name} ({anchor.owner_email})."}

    @staticmethod
    def check_metric_discrepancy(claim_text: str, tag: str, anchor: Fact) -> Optional[Dict[str, Any]]:
        if not anchor.normalized_value:
            return None
        extracted_digits = re.findall('\\d+(?:\\.\\d+)?', claim_text)
        if extracted_digits and anchor.normalized_value not in extracted_digits:
            return {'claim_text': claim_text, 'claim_type': tag, 'matched_fact_id': anchor.id, 'status': 'CONTRADICTED', 'reasoning': f"Claim states '{', '.join(extracted_digits)}' but approved fact {anchor.fact_code} specifies certified value of '{anchor.normalized_value}{anchor.normalized_unit or ''}'."}
        return None

class VaultCorroborator:

    @classmethod
    def corroborate_statement(cls, item: Dict[str, Any], corpus: List[Fact], epoch: datetime) -> Dict[str, Any]:
        text_body = item.get('claim_text', '')
        kind = item.get('claim_type', 'FACTUAL')
        hyperbole_flag = AssertionEvaluator.check_hyperbole(text_body, kind)
        if hyperbole_flag:
            return hyperbole_flag
        words = set(text_body.lower().split())
        candidates = [(LexicalScorer.rank_fact_alignment(words, f.subject), f) for f in corpus]
        sorted_candidates = sorted(candidates, key=lambda x: x[0], reverse=True)
        top_score, top_anchor = sorted_candidates[0] if sorted_candidates and sorted_candidates[0][0] > 0 else (0, None)
        if not top_anchor or top_score == 0:
            return {'claim_text': text_body, 'claim_type': kind, 'matched_fact_id': None, 'status': 'UNSUPPORTED', 'reasoning': 'No matching approved fact found in the Approved Fact Vault.'}
        stale_flag = AssertionEvaluator.check_temporal_freshness(text_body, kind, top_anchor, epoch)
        if stale_flag:
            return stale_flag
        contradiction_flag = AssertionEvaluator.check_metric_discrepancy(text_body, kind, top_anchor)
        if contradiction_flag:
            return contradiction_flag
        return {'claim_text': text_body, 'claim_type': kind, 'matched_fact_id': top_anchor.id, 'status': 'SUPPORTED', 'reasoning': f'Verified against approved fact {top_anchor.fact_code} ({top_anchor.source_document}).'}

class ClaimLedgerEngine:
    PROMPT_INSTRUCTION = "You are the CANON Claim Extractor. Identify any promotional claims, numerical figures, superlatives (e.g. 'fastest', 'best'), or comparative statements in the text. Return a JSON object with key 'claims', containing a list of objects with: 'claim_text' (string), 'claim_type' ('NUMERICAL', 'SUPERLATIVE', 'COMPARATIVE', 'FACTUAL'), and 'normalized_value' (string or null)."

    async def extract_claims(self, text: str) -> List[Dict[str, Any]]:
        query = f'Extract all claims from:\n\n{text}'
        payload = await llm_client.generate_structured(self.PROMPT_INSTRUCTION, query)
        aggregated = payload.get('result', {}).get('claims', [])
        existing_texts = {c.get('claim_text') for c in aggregated}
        for pattern in HYPERBOLE_EXPRESSIONS:
            for hit in re.finditer(pattern, text, re.IGNORECASE):
                segment = hit.group(0)
                if segment not in existing_texts:
                    aggregated.append({'claim_text': segment, 'claim_type': 'SUPERLATIVE', 'normalized_value': None})
                    existing_texts.add(segment)
        return aggregated

    def verify_claims_against_vault(self, db: Session, workspace_id: str, claims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        active_facts = db.query(Fact).filter(Fact.workspace_id == workspace_id).all()
        now_utc = datetime.now(timezone.utc)
        return [VaultCorroborator.corroborate_statement(entry, active_facts, now_utc) for entry in claims]
claim_ledger = ClaimLedgerEngine()
