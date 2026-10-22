import difflib
import re
from typing import Dict, Any, List, Optional
from app.core.llm_provider import llm_client
CTA_TRIGGERS = '(?:visit|check out|sign up|join|contact|discover|get started|register|learn more)[^\\.\\!\\n]+[\\.\\!\\n]?'
ENTITY_PATTERN = '\\b[A-Z][a-zA-Z0-9]+(?:\\s+[A-Z][a-zA-Z0-9]+)?\\b'
NUMERIC_PATTERN = '\\b\\d+(?:[\\.,]\\d+)?%?\\b'
STOP_KEYWORDS = frozenset({'with', 'from', 'that', 'this'})

class IntentHeuristics:

    @staticmethod
    def discern_cta(raw_corpus: str) -> str:
        matches = re.findall(CTA_TRIGGERS, raw_corpus, re.IGNORECASE)
        return matches[-1].strip() if matches else 'Explore the platform'

    @staticmethod
    def discern_entities(raw_corpus: str) -> List[str]:
        tokens = re.findall(ENTITY_PATTERN, raw_corpus)
        return list(dict.fromkeys(tokens))[:5]

    @staticmethod
    def discern_numerics(raw_corpus: str) -> List[str]:
        return list(dict.fromkeys(re.findall(NUMERIC_PATTERN, raw_corpus)))[:5]

class DiffHtmlFormatter:
    TAG_TEMPLATES = {'equal': lambda s1, s2, i1, i2, j1, j2: ' '.join(s1[i1:i2]), 'delete': lambda s1, s2, i1, i2, j1, j2: f"""<del class="bg-red-100 text-red-800 line-through px-1 rounded mx-0.5">{' '.join(s1[i1:i2])}</del>""", 'insert': lambda s1, s2, i1, i2, j1, j2: f"""<ins class="bg-emerald-100 text-emerald-800 font-medium px-1 rounded mx-0.5 no-underline">{' '.join(s2[j1:j2])}</ins>""", 'replace': lambda s1, s2, i1, i2, j1, j2: f"""<del class="bg-red-100 text-red-800 line-through px-1 rounded mx-0.5">{' '.join(s1[i1:i2])}</del> <ins class="bg-emerald-100 text-emerald-800 font-medium px-1 rounded mx-0.5 no-underline">{' '.join(s2[j1:j2])}</ins>"""}

    @classmethod
    def render_markup(cls, baseline: str, revised: str) -> str:
        tok_orig = baseline.split()
        tok_rev = revised.split()
        matcher = difflib.SequenceMatcher(None, tok_orig, tok_rev)
        segments = [cls.TAG_TEMPLATES[tag](tok_orig, tok_rev, i1, i2, j1, j2) for tag, i1, i2, j1, j2 in matcher.get_opcodes()]
        return ' '.join(segments)

class SurgicalPatchEngine:

    @classmethod
    def patch_source(cls, source_copy: str, diagnostic_hits: List[Dict[str, Any]]) -> Dict[str, Any]:
        applicable = [hit for hit in diagnostic_hits if hit.get('suggested_correction') and hit.get('span_end', 0) > hit.get('span_start', 0)]
        applicable.sort(key=lambda item: item.get('span_start', 0), reverse=True)
        working_buffer = source_copy
        applied_delta = []
        for issue in applicable:
            left_pos = issue['span_start']
            right_pos = issue['span_end']
            replacement_val = issue['suggested_correction']
            original_slice = working_buffer[left_pos:right_pos]
            working_buffer = working_buffer[:left_pos] + replacement_val + working_buffer[right_pos:]
            applied_delta.append({'rule_code': issue.get('rule_code'), 'original': original_slice, 'replacement': replacement_val})
        diff_view = DiffHtmlFormatter.render_markup(source_copy, working_buffer)
        return {'suggested_text': working_buffer, 'corrections_applied': applied_delta, 'diff_html': diff_view}

class IntentPreservationAuditor:

    @staticmethod
    def audit_compliance(baseline: str, amended: str, spec: Dict[str, Any]) -> Dict[str, Any]:
        violations = []
        action_statement = spec.get('call_to_action', '').lower().strip()
        focal_tokens = [w for w in re.findall('\\b[a-zA-Z]{4,}\\b', action_statement) if w not in STOP_KEYWORDS]
        amended_lower = amended.lower()
        cta_intact = True
        if focal_tokens:
            present_focal = [token for token in focal_tokens if token in amended_lower]
            if not present_focal:
                cta_intact = False
                violations.append('Call to action intent was lost or altered in suggested edit.')
        baseline_digits = set(re.findall(NUMERIC_PATTERN, baseline))
        amended_digits = set(re.findall(NUMERIC_PATTERN, amended))
        mandatory_figures = set(spec.get('numerical_claims', []))
        omitted_figures = mandatory_figures - amended_digits
        if omitted_figures:
            violations.append(f"Required numerical facts missing in suggestion: {', '.join(omitted_figures)}")
        verdict = 'PASSED'
        if not cta_intact:
            verdict = 'FAILED'
        elif omitted_figures:
            verdict = 'NEEDS_REVIEW'
        return {'status': verdict, 'cta_preserved': cta_intact, 'facts_preserved': len(omitted_figures) == 0, 'reasons': violations}

class IntentLockEngine:
    ANALYST_DIRECTIVE = "You are the CANON Intent Analyzer. Analyze the draft content and extract its core intent. Return a JSON object with keys: 'purpose' (string), 'target_audience' (string), 'call_to_action' (string), 'must_keep_facts' (list of strings), 'product_names' (list of strings), 'numerical_claims' (list of strings), 'tone_constraints' (list of strings)."

    async def build_intent_card(self, content_text: str) -> Dict[str, Any]:
        task_query = f'Analyze the following content:\n\n{content_text}'
        resp = await llm_client.generate_structured(self.ANALYST_DIRECTIVE, task_query)
        payload = resp.get('result', {})
        return {'purpose': payload.get('purpose') or 'Inform and engage target audience', 'target_audience': payload.get('target_audience') or 'Prospective and active users', 'call_to_action': payload.get('call_to_action') or IntentHeuristics.discern_cta(content_text), 'must_keep_facts': payload.get('must_keep_facts') or [], 'product_names': payload.get('product_names') or IntentHeuristics.discern_entities(content_text), 'numerical_claims': payload.get('numerical_claims') or IntentHeuristics.discern_numerics(content_text), 'tone_constraints': payload.get('tone_constraints') or ['Authoritative', 'Helpful', 'Transparent'], 'preservation_status': 'PASSED'}

    def generate_minimal_suggestion(self, original_text: str, findings: List[Dict[str, Any]]) -> Dict[str, Any]:
        return SurgicalPatchEngine.patch_source(original_text, findings)

    def verify_intent_preservation(self, original_text: str, corrected_text: str, intent_card: Dict[str, Any]) -> Dict[str, Any]:
        return IntentPreservationAuditor.audit_compliance(original_text, corrected_text, intent_card)
intent_lock = IntentLockEngine()
