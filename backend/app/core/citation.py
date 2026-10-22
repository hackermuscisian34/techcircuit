import unicodedata
import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.db.models import Rule, Rulebook
SINGLE_QUOTE_CLEANER = re.compile('[\\u2018\\u2019\\u201A\\u201B\\u2032\\u2035]')
DOUBLE_QUOTE_CLEANER = re.compile('[\\u201C\\u201D\\u201E\\u201F\\u2033\\u2036]')
SPACE_CLEANER = re.compile('\\s+')

def normalize_source_text(text: str) -> str:
    if not text:
        return ''
    buffer = unicodedata.normalize('NFKC', text)
    buffer = SINGLE_QUOTE_CLEANER.sub("'", buffer)
    buffer = DOUBLE_QUOTE_CLEANER.sub('"', buffer)
    buffer = SPACE_CLEANER.sub(' ', buffer)
    return buffer.strip().lower()

class SpecializedCategoryValidator:

    @staticmethod
    def audit_claims(diagnostic: Dict[str, Any], corpus: str) -> Optional[Dict[str, Any]]:
        if diagnostic.get('category') != 'Claims':
            return None
        target = diagnostic.get('matched_text', '')
        if target and target not in corpus:
            return {**diagnostic, 'confidence_tier': 'ADVISORY', 'severity': 'ADVISORY', 'verification_status': 'REJECTED', 'evidence_status': 'UNVERIFIED', 'rejection_reason': 'Rejected: Claim text does not appear in submitted content.'}
        return {**diagnostic, 'confidence_tier': 'DETERMINISTIC', 'verification_status': 'VERIFIED', 'evidence_status': 'VERIFIED'}

    @staticmethod
    def audit_visual_or_a11y(diagnostic: Dict[str, Any], corpus: str) -> Optional[Dict[str, Any]]:
        if diagnostic.get('category') not in ('Visual', 'Accessibility'):
            return None
        out = dict(diagnostic)
        target = out.get('matched_text', '')
        if target and target in corpus:
            pos = corpus.find(target)
            out['span_start'] = pos
            out['span_end'] = pos + len(target)
        out['confidence_tier'] = 'DETERMINISTIC'
        out['verification_status'] = 'VERIFIED'
        out['evidence_status'] = 'VERIFIED'
        return out

class RuleResolver:

    @staticmethod
    def fetch_active_directive(db_session: Session, book_id: str, r_id: Optional[str], r_code: Optional[str]) -> Optional[Rule]:
        if r_id:
            return db_session.query(Rule).filter(Rule.id == r_id, Rule.rulebook_id == book_id, Rule.status == 'ACTIVE').first()
        if r_code:
            return db_session.query(Rule).filter(Rule.rule_code == r_code, Rule.rulebook_id == book_id, Rule.status == 'ACTIVE').first()
        return None

class SpanAdjuster:

    @staticmethod
    def reconcile_span(entry: Dict[str, Any], corpus: str) -> Optional[Dict[str, Any]]:
        target_token = entry.get('matched_text', '')
        if not target_token:
            return entry
        p_start = entry.get('span_start', 0)
        p_end = entry.get('span_end', 0)
        if corpus[p_start:p_end] == target_token:
            return entry
        discovered = corpus.find(target_token)
        if discovered != -1:
            amended = dict(entry)
            amended['span_start'] = discovered
            amended['span_end'] = discovered + len(target_token)
            return amended
        return None

class CitationVerifier:

    def __init__(self, db: Session):
        self.db = db

    def verify_finding(self, finding: Dict[str, Any], active_rulebook_id: str, content_text: str) -> Dict[str, Any]:
        item = dict(finding)
        claims_eval = SpecializedCategoryValidator.audit_claims(item, content_text)
        if claims_eval is not None:
            return claims_eval
        visual_eval = SpecializedCategoryValidator.audit_visual_or_a11y(item, content_text)
        if visual_eval is not None:
            return visual_eval
        rule_entity = RuleResolver.fetch_active_directive(self.db, active_rulebook_id, item.get('rule_id'), item.get('rule_code'))
        if not rule_entity:
            item['confidence_tier'] = 'ADVISORY'
            item['severity'] = 'ADVISORY'
            item['verification_status'] = 'DEMOTED'
            item['evidence_status'] = 'MISSING'
            item['rejection_reason'] = f"Demoted to Advisory: Rule '{item.get('rule_code') or item.get('rule_id')}' does not exist in active rulebook."
            return item
        adjusted_item = SpanAdjuster.reconcile_span(item, content_text)
        if adjusted_item is None:
            item['confidence_tier'] = 'ADVISORY'
            item['severity'] = 'ADVISORY'
            item['verification_status'] = 'REJECTED'
            item['evidence_status'] = 'UNVERIFIED'
            item['rejection_reason'] = 'Rejected: Flagged content span does not exist in submitted text.'
            return item
        item = adjusted_item
        is_deterministic = item.get('confidence_tier') == 'DETERMINISTIC'
        if not is_deterministic:
            cited_normalized = normalize_source_text(item.get('source_quote') or '')
            stored_normalized = normalize_source_text(rule_entity.source_quote)
            matched = bool(cited_normalized and (cited_normalized in stored_normalized or stored_normalized in cited_normalized))
            if not matched:
                item['confidence_tier'] = 'ADVISORY'
                item['severity'] = 'ADVISORY'
                item['verification_status'] = 'DEMOTED'
                item['evidence_status'] = 'UNVERIFIED'
                item['rejection_reason'] = f'Demoted to Advisory: Cited source quote could not be verified in stored guideline text for {rule_entity.rule_code}.'
                return item
        item['rule_id'] = rule_entity.id
        item['rule_code'] = rule_entity.rule_code
        item['source_quote'] = rule_entity.source_quote
        item['source_section'] = rule_entity.source_section
        item['confidence_tier'] = 'DETERMINISTIC' if is_deterministic else 'EVIDENCE_BACKED_AI'
        item['verification_status'] = 'VERIFIED'
        item['evidence_status'] = 'VERIFIED'
        item['rejection_reason'] = None
        return item

    def verify_all(self, findings: List[Dict[str, Any]], active_rulebook_id: str, content_text: str) -> List[Dict[str, Any]]:
        return [self.verify_finding(f, active_rulebook_id, content_text) for f in findings]
