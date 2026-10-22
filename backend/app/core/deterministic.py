import math
import re
from typing import List, Dict, Any, Tuple, Optional
PERMITTED_DOMAINS = frozenset({'Terminology', 'Claims', 'Formatting', 'Brand Naming', 'Brand Naming & Trademarks', 'Logo & Identity', 'Logo & Visual Identity', 'Logo Usage', 'Packaging', 'Trademark', 'Color & Visual', 'Visual', 'Brand Voice', 'Product Claims'})
STATIC_DIRECTIVE_PATTERNS = {'TERM-01': '\\b(?:Legacy\\s+Cloud|Apex\\s+Cloud)\\b', 'TERM-02': '\\b(?:100%\\s+uptime\\s+guaranteed|guaranteed\\s+100%\\s+uptime)\\b', 'NAME-01': '\\b(?:cloudplatform|Cloud\\s+platform|cloud\\s+platform|apexdynamics|Apex\\s+dynamics|apex\\s+dynamics)\\b', 'TM-01': '\\b(?:CloudPlatform|ApexDynamics|Apex\\s+Core)(?![®™\\u00AE\\u2122])\\b', 'CLAIM-01': '\\b(?:fastest\\s+platform\\s+in\\s+the\\s+world|undisputed\\s+leader)\\b', 'LOGO-01': '\\b(?:crowded\\s+logo|unapproved\\s+logo\\s+variant|altered\\s+logomark)\\b', 'LOGO-02': '\\b(?:distorted\\s+logo|recolored\\s+logo|drop\\s+shadow\\s+on\\s+logo)\\b'}

class TerminologyPatternCompiler:

    @staticmethod
    def resolve_expression(rule: Dict[str, Any]) -> Tuple[Optional[str], int]:
        pattern = rule.get('pattern')
        code = rule.get('rule_code')
        if not pattern and code in STATIC_DIRECTIVE_PATTERNS:
            pattern = STATIC_DIRECTIVE_PATTERNS[code]
        if not pattern:
            blob = f"{rule.get('title', '')} {rule.get('description', '')}"
            quotes = re.findall('[\'\\"]([^\'\\"]{3,40})[\'\\"]', blob)
            pass_text = rule.get('pass_example', '')
            prohibited = [q for q in quotes if q.lower() not in pass_text.lower()]
            if prohibited:
                pattern = f"\\b(?:{'|'.join((re.escape(p.strip()) for p in prohibited))})\\b"
            else:
                fail_ex = rule.get('fail_example', '')
                if fail_ex and len(fail_ex.strip()) <= 40:
                    pattern = f'\\b{re.escape(fail_ex.strip())}\\b'
        flags = 0 if code == 'NAME-01' else re.IGNORECASE
        return (pattern, flags)

class TerminologyScanner:

    @staticmethod
    def find_substitute(rule: Dict[str, Any]) -> Optional[str]:
        default_sub = rule.get('pass_example') or None
        composite = f"{rule.get('title', '')} {rule.get('description', '')} {rule.get('pass_example', '')}"
        candidates = re.findall('[\'\\"]([^\'\\"]{3,40})[\'\\"]', composite)
        approved = [c for c in candidates if c.lower() in (rule.get('pass_example') or '').lower()]
        return approved[0] if approved else default_sub

    @classmethod
    def execute_rule(cls, text_corpus: str, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        if rule.get('enforcement_type') != 'DETERMINISTIC':
            return []
        category = rule.get('category', '')
        if category and category not in PERMITTED_DOMAINS:
            return []
        pattern, flags = TerminologyPatternCompiler.resolve_expression(rule)
        if not pattern:
            return []
        outcomes = []
        try:
            compiled_re = re.compile(pattern, flags)
            for m in compiled_re.finditer(text_corpus):
                suggestion = cls.find_substitute(rule)
                outcomes.append({'rule_id': rule.get('id'), 'rule_code': rule.get('rule_code'), 'category': rule.get('category'), 'severity': rule.get('severity', 'BLOCKING'), 'span_start': m.start(), 'span_end': m.end(), 'matched_text': m.group(0), 'source_quote': rule.get('source_quote'), 'source_section': rule.get('source_section'), 'explanation': f"Found prohibited terminology '{m.group(0)}'. Guideline requires: {rule.get('description')}", 'evidence_status': 'VERIFIED', 'confidence_tier': 'DETERMINISTIC', 'suggested_correction': suggestion, 'verification_status': 'VERIFIED'})
        except Exception:
            return []
        return outcomes

def check_terminology_rules(text: str, rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    hits = []
    for r in rules:
        hits.extend(TerminologyScanner.execute_rule(text, r))
    return hits

class WcagColorMetrics:

    @staticmethod
    def parse_hex(hex_val: str) -> Tuple[int, int, int]:
        sanitized = hex_val.lstrip('#')
        if len(sanitized) == 3:
            sanitized = ''.join((ch * 2 for ch in sanitized))
        if len(sanitized) != 6:
            raise ValueError(f'Invalid hex color: {hex_val}')
        return (int(sanitized[0:2], 16), int(sanitized[2:4], 16), int(sanitized[4:6], 16))

    @classmethod
    def relative_luminance(cls, triplet: Tuple[int, int, int]) -> float:
        components = [val / 255.0 for val in triplet]
        adjusted = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in components]
        return 0.2126 * adjusted[0] + 0.7152 * adjusted[1] + 0.0722 * adjusted[2]

    @classmethod
    def contrast(cls, fg: str, bg: str) -> float:
        l1 = cls.relative_luminance(cls.parse_hex(fg))
        l2 = cls.relative_luminance(cls.parse_hex(bg))
        return round((max(l1, l2) + 0.05) / (min(l1, l2) + 0.05), 2)

    @classmethod
    def distance(cls, h1: str, h2: str) -> float:
        r1, g1, b1 = cls.parse_hex(h1)
        r2, g2, b2 = cls.parse_hex(h2)
        return math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)

def hex_to_rgb(hex_code: str) -> Tuple[int, int, int]:
    return WcagColorMetrics.parse_hex(hex_code)

def get_relative_luminance(rgb: Tuple[int, int, int]) -> float:
    return WcagColorMetrics.relative_luminance(rgb)

def calculate_contrast_ratio(hex1: str, hex2: str) -> float:
    return WcagColorMetrics.contrast(hex1, hex2)

def check_wcag_contrast(fg_hex: str, bg_hex: str, is_large_text: bool=False) -> Dict[str, Any]:
    score = WcagColorMetrics.contrast(fg_hex, bg_hex)
    bound = 3.0 if is_large_text else 4.5
    valid = score >= bound
    return {'foreground': fg_hex, 'background': bg_hex, 'contrast_ratio': score, 'required_ratio': bound, 'passes_wcag_aa': valid, 'level': 'AA' if valid else 'FAIL'}

def color_distance_rgb(hex1: str, hex2: str) -> float:
    return WcagColorMetrics.distance(hex1, hex2)

def match_brand_palette(target_hex: str, approved_palette: List[str], max_tolerance: float=35.0) -> Dict[str, Any]:
    scored = [(WcagColorMetrics.distance(target_hex, app), app) for app in approved_palette]
    if not scored:
        return {'target_color': target_hex, 'closest_approved': None, 'distance': float('inf'), 'is_exact_match': False, 'is_approved': False}
    dist_val, closest = min(scored, key=lambda x: x[0])
    return {'target_color': target_hex, 'closest_approved': closest, 'distance': round(dist_val, 2), 'is_exact_match': dist_val == 0.0, 'is_approved': dist_val <= max_tolerance}

class TextReadabilityEngine:

    @staticmethod
    def count_word_syllables(token: str) -> int:
        cleaned = token.lower().strip('.:;?!')
        if not cleaned:
            return 0
        if len(cleaned) <= 3:
            return 1
        filtered = re.sub('(?:[^laeiouy]|ed|es|e)$', '', cleaned)
        filtered = re.sub('^y', '', filtered)
        matches = re.findall('[aeiouy]{1,2}', filtered)
        return max(1, len(matches))

    @classmethod
    def analyze(cls, text: str) -> Dict[str, Any]:
        sentence_nodes = [s.strip() for s in re.split('[.!?]+', text) if s.strip()]
        token_nodes = re.findall("\\b[A-Za-z0-9\\'-]+\\b", text)
        n_sent = max(1, len(sentence_nodes))
        n_words = max(1, len(token_nodes))
        total_syllables = sum((cls.count_word_syllables(w) for w in token_nodes))
        word_len_avg = n_words / n_sent
        syllable_avg = total_syllables / n_words
        flesch = round(max(0.0, min(100.0, 206.835 - 1.015 * word_len_avg - 84.6 * syllable_avg)), 1)
        level = 'Easy' if flesch >= 70 else 'Standard' if flesch >= 50 else 'Difficult'
        return {'word_count': n_words, 'sentence_count': n_sent, 'average_sentence_length': round(word_len_avg, 1), 'flesch_reading_ease': flesch, 'reading_level': level}

def count_syllables(word: str) -> int:
    return TextReadabilityEngine.count_word_syllables(word)

def calculate_readability_metrics(text: str) -> Dict[str, Any]:
    return TextReadabilityEngine.analyze(text)

def validate_logo_dimensions(width: float, height: float, required_ratio: float=4.0, ratio_tolerance: float=0.05, min_height_px: int=24) -> Dict[str, Any]:
    if height <= 0:
        return {'valid': False, 'reason': 'Logo height must be greater than zero.'}
    actual = round(width / height, 2)
    distorted = abs(actual - required_ratio) > ratio_tolerance
    undersized = height < min_height_px
    return {'width': width, 'height': height, 'actual_ratio': actual, 'required_ratio': required_ratio, 'is_distorted': distorted, 'is_undersized': undersized, 'passes_spec': not distorted and (not undersized), 'clearspace_margin_px': round(height * 0.5, 1)}

def check_trademark_compliance(text: str, master_brand: str='ApexDynamics', product_lines: Optional[List[str]]=None) -> List[Dict[str, Any]]:
    lines = product_lines or ['Apex Core', 'Apex Pulse', 'Apex Studio']
    anomalies = []
    m_hits = list(re.finditer(f'\\b{re.escape(master_brand)}\\b', text))
    if m_hits:
        first = m_hits[0]
        tail = text[first.end():first.end() + 2]
        if '®' not in tail:
            anomalies.append({'rule_code': 'TM-01', 'brand_name': master_brand, 'span_start': first.start(), 'span_end': first.end(), 'explanation': f"First mention of '{master_brand}' requires registered trademark symbol: '{master_brand}®'.", 'suggested_correction': f'{master_brand}®'})
    for line_name in lines:
        p_hits = list(re.finditer(f'\\b{re.escape(line_name)}\\b', text))
        if p_hits:
            lead = p_hits[0]
            tail = text[lead.end():lead.end() + 2]
            if '™' not in tail and '®' not in tail:
                anomalies.append({'rule_code': 'TM-02', 'brand_name': line_name, 'span_start': lead.start(), 'span_end': lead.end(), 'explanation': f"First mention of product line '{line_name}' requires trademark symbol: '{line_name}™'.", 'suggested_correction': f'{line_name}™'})
    return anomalies
