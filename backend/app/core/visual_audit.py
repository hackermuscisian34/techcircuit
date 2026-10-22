import io
import math
import re
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image
from app.core.deterministic import hex_to_rgb, calculate_contrast_ratio, check_wcag_contrast, match_brand_palette, validate_logo_dimensions
APPROVED_BRAND_PALETTE = ['#F97316', '#C2410C', '#FB923C', '#FFF1E6', '#FFFAF5', '#21160F', '#75665D', '#382A20', '#FFF9F3']

def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f'#{r:02x}{g:02x}{b:02x}'.upper()

class ColorQuantizer:
    TARGET_CANVAS = (150, 150)
    TOTAL_RESOLUTION = 150 * 150

    @classmethod
    def harvest_dominant_tones(cls, bitmap: Image.Image, color_cap: int=5) -> List[Dict[str, Any]]:
        scaled = bitmap.convert('RGB').resize(cls.TARGET_CANVAS)
        reduced = scaled.quantize(colors=color_cap)
        swatch_table = reduced.getpalette()[:color_cap * 3]
        histogram = reduced.getcolors()
        if not histogram or not swatch_table:
            return []
        sorted_clusters = sorted(histogram, key=lambda pair: pair[0], reverse=True)
        dominant_records = []
        for frequency, palette_idx in sorted_clusters:
            offset = palette_idx * 3
            red_val, green_val, blue_val = swatch_table[offset:offset + 3]
            hex_token = rgb_to_hex(red_val, green_val, blue_val)
            coverage_pct = round(frequency / cls.TOTAL_RESOLUTION * 100, 1)
            dominant_records.append({'hex': hex_token, 'rgb': (red_val, green_val, blue_val), 'frequency_percent': coverage_pct})
        return dominant_records[:color_cap]

def extract_dominant_colors(image: Image.Image, num_colors: int=5) -> List[Dict[str, Any]]:
    return ColorQuantizer.harvest_dominant_tones(image, num_colors)

class GeometryAuditor:

    @staticmethod
    def inspect_mark(span_x: int, span_y: int, is_identity_mark: bool) -> Tuple[float, Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        quotient = round(span_x / max(1, span_y), 2)
        if not is_identity_mark:
            return (quotient, None, [])
        specs = validate_logo_dimensions(span_x, span_y)
        issues = []
        if not specs['passes_spec']:
            if specs['is_distorted']:
                issues.append({'category': 'Visual', 'severity': 'BLOCKING', 'rule_code': 'LOGO-RATIO', 'title': 'Logo Aspect Ratio Distortion Detected', 'explanation': f"Logo dimensions ({span_x}x{span_y}, ratio {quotient}:1) deviate from approved brand spec ({specs['required_ratio']}:1).", 'confidence_tier': 'DETERMINISTIC', 'verification_status': 'VERIFIED'})
            if specs['is_undersized']:
                issues.append({'category': 'Visual', 'severity': 'WARNING', 'rule_code': 'LOGO-MIN-SIZE', 'title': 'Logo Renders Below Minimum Legible Height', 'explanation': f'Logo height ({span_y}px) is below minimum legible specification of 24px.', 'confidence_tier': 'DETERMINISTIC', 'verification_status': 'VERIFIED'})
        return (quotient, specs, issues)

class PaletteComplianceEvaluator:

    @staticmethod
    def evaluate(top_swatches: List[Dict[str, Any]], authorized_palette: List[str]) -> List[Dict[str, Any]]:
        divergent = []
        for entry in top_swatches[:3]:
            verdict = match_brand_palette(entry['hex'], authorized_palette, max_tolerance=45.0)
            if not verdict['is_approved']:
                divergent.append(entry['hex'])
        if not divergent:
            return []
        return [{'category': 'Visual', 'severity': 'WARNING', 'rule_code': 'COLOR-PALETTE-01', 'title': 'Dominant Colors Deviate From Approved Brand Palette', 'explanation': f"Image contains primary dominant color(s) {', '.join(divergent)} that exceed permissible color distance from the certified brand palette.", 'confidence_tier': 'DETERMINISTIC', 'verification_status': 'VERIFIED'}]

class ContrastAuditor:

    @staticmethod
    def evaluate_surfaces(palette_entries: List[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        if len(palette_entries) < 2:
            return (None, [])
        fore = palette_entries[0]['hex']
        back = palette_entries[1]['hex']
        audit = check_wcag_contrast(fore, back, is_large_text=False)
        issues = []
        if not audit['passes_wcag_aa']:
            issues.append({'category': 'Accessibility', 'severity': 'ADVISORY', 'rule_code': 'WCAG-CONTRAST-01', 'title': 'Low Contrast Between Primary Image Colors', 'explanation': f"Contrast ratio between top dominant colors ({fore} and {back}) is {audit['contrast_ratio']}:1, failing WCAG 2.2 AA standard threshold of {audit['required_ratio']}:1.", 'confidence_tier': 'DETERMINISTIC', 'verification_status': 'VERIFIED'})
        return (audit, issues)

class VisualAssetAuditor:

    @classmethod
    def audit_stream(cls, raw_stream: bytes, descriptor_label: str, authorized_swatches: Optional[List[str]]=None) -> Dict[str, Any]:
        palette_baseline = authorized_swatches or APPROVED_BRAND_PALETTE
        try:
            image_node = Image.open(io.BytesIO(raw_stream))
            extent_w, extent_h = image_node.size
            codec = image_node.format or 'UNKNOWN'
        except Exception as fault:
            raise ValueError(f'Failed to decode image data: {str(fault)}')
        dominant_tones = ColorQuantizer.harvest_dominant_tones(image_node, color_cap=5)
        is_mark = 'logo' in descriptor_label.lower()
        prop_ratio, mark_specs, mark_anomalies = GeometryAuditor.inspect_mark(extent_w, extent_h, is_mark)
        palette_anomalies = PaletteComplianceEvaluator.evaluate(dominant_tones, palette_baseline)
        contrast_report, contrast_anomalies = ContrastAuditor.evaluate_surfaces(dominant_tones)
        consolidated_findings = mark_anomalies + palette_anomalies + contrast_anomalies
        return {'filename': descriptor_label, 'format': codec, 'width': extent_w, 'height': extent_h, 'aspect_ratio': prop_ratio, 'is_logo': is_mark, 'dominant_colors': dominant_tones, 'logo_spec': mark_specs, 'contrast_check': contrast_report, 'visual_findings': consolidated_findings}

def analyze_image_asset(content_bytes: bytes, filename: str, approved_palette: Optional[List[str]]=None) -> Dict[str, Any]:
    return VisualAssetAuditor.audit_stream(content_bytes, filename, approved_palette)

class TextAccessibilityAuditor:
    AMBIGUOUS_ANCHOR_PATTERNS = ['\\b(?:click\\s+here|read\\s+more|learn\\s+more\\s+here|link|this\\s+link)\\b']
    SHOUTING_SEQUENCE_REGEX = re.compile('\\b[A-Z]{3,}(?:\\s+[A-Z]{3,}){2,}\\b')

    @classmethod
    def audit_prose(cls, prose_corpus: str) -> List[Dict[str, Any]]:
        anomalies = []
        for expr in cls.AMBIGUOUS_ANCHOR_PATTERNS:
            for hit in re.finditer(expr, prose_corpus, re.IGNORECASE):
                anomalies.append({'category': 'Accessibility', 'severity': 'ADVISORY', 'rule_code': 'A11Y-LINK-TEXT', 'title': 'Ambiguous Non-Descriptive Hyperlink Text', 'matched_text': hit.group(0), 'span_start': hit.start(), 'span_end': hit.end(), 'explanation': f"Hyperlink text '{hit.group(0)}' lacks context for screen readers (WCAG 2.4.4). Use descriptive link text indicating destination or purpose.", 'confidence_tier': 'DETERMINISTIC', 'verification_status': 'VERIFIED'})
        for shouting_hit in cls.SHOUTING_SEQUENCE_REGEX.finditer(prose_corpus):
            excerpt = shouting_hit.group(0)
            anomalies.append({'category': 'Accessibility', 'severity': 'ADVISORY', 'rule_code': 'A11Y-ALL-CAPS', 'title': 'Extended ALL-CAPS Passage Affects Legibility', 'matched_text': excerpt, 'span_start': shouting_hit.start(), 'span_end': shouting_hit.end(), 'explanation': f"Prolonged uppercase phrase '{excerpt}' impedes readability and may be misread by screen readers as acronyms.", 'confidence_tier': 'DETERMINISTIC', 'verification_status': 'VERIFIED'})
        return anomalies

def audit_text_accessibility(text: str) -> List[Dict[str, Any]]:
    return TextAccessibilityAuditor.audit_prose(text)
