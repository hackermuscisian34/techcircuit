import re
from typing import List, Dict, Any
from app.core.llm_provider import llm_client
VAGUE_TERMS = frozenset({'clean', 'modern', 'high quality', 'premium', 'dynamic', 'nice', 'engaging', 'cool', 'exciting', 'innovative', 'user friendly', 'sleek'})
FORBIDDEN_TRIGGERS = ('never use', 'do not', 'avoid', 'always use', 'prohibited', 'banned')
NOMENCLATURE_TRIGGERS = ('word', 'term', 'name', 'call')

class RuleCalibrator:

    @staticmethod
    def evaluate_ambiguity(desc_lower: str, has_pass: bool, has_fail: bool) -> str:
        if 'never' in desc_lower and 'always' in desc_lower:
            return 'CONFLICTING'
        if not (has_pass and has_fail) or any((term in desc_lower for term in VAGUE_TERMS)):
            return 'AMBIGUOUS'
        return 'CLEAR'

    @classmethod
    def audit_entry(cls, spec: Dict[str, Any], corpus_lower: str) -> Dict[str, Any]:
        output = dict(spec)
        excerpt = output.get('source_quote', '').strip()
        explanation = output.get('description', '').lower()
        status_calc = cls.evaluate_ambiguity(explanation, bool(output.get('pass_example')), bool(output.get('fail_example')))
        output['ambiguity_status'] = output.get('ambiguity_status') or status_calc
        output['evidence_status'] = 'VERIFIED' if not excerpt or excerpt.lower() in corpus_lower else 'UNVERIFIED'
        return output

class HeuristicHarvester:

    @staticmethod
    def slice_directive(raw_segment: str, seq: int) -> Dict[str, Any]:
        cleaned = raw_segment.strip()
        lowered = cleaned.lower()
        domain = 'Terminology' if any((k in lowered for k in NOMENCLATURE_TRIGGERS)) else 'Tone'
        is_blocking = 'never' in lowered or 'prohibited' in lowered
        return {'rule_code': f'{domain[:4].upper()}-{seq:02d}', 'title': f'{cleaned[:60]}...' if len(cleaned) > 60 else cleaned, 'category': domain, 'description': cleaned, 'source_quote': cleaned, 'source_section': 'General Guidelines', 'severity': 'BLOCKING' if is_blocking else 'WARNING', 'enforcement_type': 'DETERMINISTIC' if domain == 'Terminology' else 'SEMANTIC_AI', 'pass_example': 'Compliant approved wording', 'fail_example': cleaned.split(':')[-1].strip() if ':' in cleaned else 'Non-compliant phrasing', 'ambiguity_status': 'CLEAR'}

    @classmethod
    def harvest(cls, raw_stream: str) -> List[Dict[str, Any]]:
        valid_lines = [ln.strip() for ln in raw_stream.splitlines() if len(ln.strip()) >= 15 and any((t in ln.lower() for t in FORBIDDEN_TRIGGERS))]
        return [cls.slice_directive(line, idx + 1) for idx, line in enumerate(valid_lines)]

class GuidelineCompiler:
    SYS_PROMPT = "You are the CANON Guideline Compiler. Your job is to convert brand guidelines into atomic, testable rules. For every rule, you MUST identify an EXACT quote from the guideline text. Never invent a rule or quote not in the text.\n\nReturn a JSON object with a single key 'rules', which is a list of rule objects. Each rule object MUST have:\n- rule_code (string, e.g. TONE-01, TERM-01, CLAIM-01)\n- title (string)\n- category (string: Tone, Terminology, Claims, Visual, or Accessibility)\n- description (string: clear directive)\n- source_quote (string: exact verbatim excerpt from input)\n- source_section (string: e.g. Section 2.1 or Page 4)\n- severity (string: BLOCKING, WARNING, or ADVISORY)\n- enforcement_type (string: DETERMINISTIC or SEMANTIC_AI)\n- pass_example (string: sample text that complies)\n- fail_example (string: sample text that violates)\n- ambiguity_status (string: CLEAR, AMBIGUOUS, or CONFLICTING)"

    async def compile_guideline(self, guideline_text: str) -> List[Dict[str, Any]]:
        query = f'Extract all actionable brand rules from this text:\n\n{guideline_text}'
        payload = await llm_client.generate_structured(self.SYS_PROMPT, query)
        raw_candidates = payload.get('result', {}).get('rules') or HeuristicHarvester.harvest(guideline_text)
        normalized_corpus = guideline_text.lower()
        return [RuleCalibrator.audit_entry(candidate, normalized_corpus) for candidate in raw_candidates]
compiler = GuidelineCompiler()
