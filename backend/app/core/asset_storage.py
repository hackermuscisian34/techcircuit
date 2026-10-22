import io
import os
import re
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
from PIL import Image
from app.config import settings

class FilenameFilter:
    SEPARATORS_REGEX = re.compile('[\\\\/\\0]')
    UNSAFE_CHARS_REGEX = re.compile('[^\\w\\.\\-\\_]')
    LEADING_PERIODS_REGEX = re.compile('^[.\\-]+')

    @classmethod
    def clean(cls, raw_tag: str) -> str:
        if not raw_tag:
            return 'asset.bin'
        stripped = cls.SEPARATORS_REGEX.sub('', raw_tag).strip()
        neutralized = cls.UNSAFE_CHARS_REGEX.sub('_', stripped)
        trimmed = cls.LEADING_PERIODS_REGEX.sub('', neutralized)
        return trimmed[:120] if trimmed else 'asset.bin'

def sanitize_filename(filename: str) -> str:
    return FilenameFilter.clean(filename)

class SvgSecuritySanitizer:
    SCRUB_OPERATIONS = [(re.compile('<!DOCTYPE[^>]*>', re.IGNORECASE), ''), (re.compile('<!ENTITY[^>]*>', re.IGNORECASE), ''), (re.compile('<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>', re.IGNORECASE), ''), (re.compile('<foreignObject\\b[^<]*(?:(?!<\\/foreignObject>)<[^<]*)*<\\/foreignObject>', re.IGNORECASE), ''), (re.compile('\\bon\\w+\\s*=\\s*(?:\'[^\']*\'|\\"[^\\"]*\\"|[^\\s>]+)', re.IGNORECASE), ''), (re.compile('href\\s*=\\s*[\\"\']javascript:[^\\"\']*[\\"\']', re.IGNORECASE), 'href="#"'), (re.compile('xlink:href\\s*=\\s*[\\"\']javascript:[^\\"\']*[\\"\']', re.IGNORECASE), 'xlink:href="#"')]

    @classmethod
    def purify(cls, raw_vector_bytes: bytes) -> bytes:
        try:
            markup_prose = raw_vector_bytes.decode('utf-8', errors='replace')
        except Exception:
            return raw_vector_bytes
        processed = markup_prose
        for pattern_re, substitute_val in cls.SCRUB_OPERATIONS:
            processed = pattern_re.sub(substitute_val, processed)
        return processed.encode('utf-8')

def sanitize_svg(content_bytes: bytes) -> bytes:
    return SvgSecuritySanitizer.purify(content_bytes)

class StorageLocator:

    @staticmethod
    def resolve_destination(tenant_id: str, resource_key: str, leaf_filename: str) -> Path:
        safe_tenant = FilenameFilter.clean(tenant_id)
        safe_leaf = FilenameFilter.clean(leaf_filename)
        tenant_envelope = Path(settings.STORAGE_DIR) / 'assets' / safe_tenant
        tenant_envelope.mkdir(parents=True, exist_ok=True)
        return tenant_envelope / f'{resource_key}_{safe_leaf}'

def get_asset_storage_path(workspace_id: str, asset_id: str, filename: str) -> Path:
    return StorageLocator.resolve_destination(workspace_id, asset_id, filename)

class RasterAndVectorMetadataInspector:
    VIEWBOX_REGEX = re.compile('viewBox\\s*=\\s*["\\\']([\\d\\.\\s\\-]+)["\\\']', re.IGNORECASE)
    WIDTH_REGEX = re.compile('width\\s*=\\s*["\\\'](\\d+(?:\\.\\d+)?)["\\\']', re.IGNORECASE)
    HEIGHT_REGEX = re.compile('height\\s*=\\s*["\\\'](\\d+(?:\\.\\d+)?)["\\\']', re.IGNORECASE)

    @classmethod
    def _inspect_svg(cls, byte_payload: bytes, format_indicator: str) -> Dict[str, Any]:
        info: Dict[str, Any] = {'width': None, 'height': None, 'aspect_ratio': None, 'format': format_indicator.upper()}
        try:
            markup = byte_payload.decode('utf-8', errors='replace')
            box_hit = cls.VIEWBOX_REGEX.search(markup)
            if box_hit:
                tokens = [float(p) for p in box_hit.group(1).split() if p.strip()]
                if len(tokens) == 4 and tokens[3] > 0:
                    info['width'] = int(tokens[2])
                    info['height'] = int(tokens[3])
                    info['aspect_ratio'] = round(tokens[2] / tokens[3], 2)
                    return info
            dim_w = cls.WIDTH_REGEX.search(markup)
            dim_h = cls.HEIGHT_REGEX.search(markup)
            if dim_w and dim_h:
                val_w = float(dim_w.group(1))
                val_h = float(dim_h.group(1))
                if val_h > 0:
                    info['width'] = int(val_w)
                    info['height'] = int(val_h)
                    info['aspect_ratio'] = round(val_w / val_h, 2)
        except Exception:
            pass
        return info

    @classmethod
    def _inspect_raster(cls, byte_payload: bytes, fallback_type: str) -> Dict[str, Any]:
        info: Dict[str, Any] = {'width': None, 'height': None, 'aspect_ratio': None, 'format': fallback_type.upper()}
        try:
            with Image.open(io.BytesIO(byte_payload)) as bitmap_source:
                w_span, h_span = bitmap_source.size
                info['width'] = w_span
                info['height'] = h_span
                info['format'] = bitmap_source.format or fallback_type.upper()
                if h_span > 0:
                    info['aspect_ratio'] = round(w_span / h_span, 2)
        except Exception:
            pass
        return info

    @classmethod
    def inspect(cls, byte_stream: bytes, file_ext: str) -> Dict[str, Any]:
        if file_ext.lower() == 'svg':
            return cls._inspect_svg(byte_stream, file_ext)
        return cls._inspect_raster(byte_stream, file_ext)

def extract_image_metadata(content_bytes: bytes, ext: str) -> Dict[str, Any]:
    return RasterAndVectorMetadataInspector.inspect(content_bytes, ext)

class WcagLuminanceMath:

    @staticmethod
    def parse_hex_to_triplet(hex_literal: str) -> Tuple[int, int, int]:
        unprefixed = hex_literal.strip().lstrip('#')
        if len(unprefixed) == 3:
            unprefixed = ''.join((char_node * 2 for char_node in unprefixed))
        if len(unprefixed) != 6:
            return (0, 0, 0)
        try:
            return (int(unprefixed[0:2], 16), int(unprefixed[2:4], 16), int(unprefixed[4:6], 16))
        except ValueError:
            return (0, 0, 0)

    @classmethod
    def compute_luminance(cls, channel_triplet: Tuple[int, int, int]) -> float:
        scales = [c / 255.0 for c in channel_triplet]
        linearized = [val / 12.92 if val <= 0.03928 else ((val + 0.055) / 1.055) ** 2.4 for val in scales]
        return 0.2126 * linearized[0] + 0.7152 * linearized[1] + 0.0722 * linearized[2]

    @classmethod
    def contrast(cls, hex_a: str, hex_b: str) -> float:
        lum_a = cls.compute_luminance(cls.parse_hex_to_triplet(hex_a))
        lum_b = cls.compute_luminance(cls.parse_hex_to_triplet(hex_b))
        upper_bound = max(lum_a, lum_b)
        lower_bound = min(lum_a, lum_b)
        return round((upper_bound + 0.05) / (lower_bound + 0.05), 2)

def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    return WcagLuminanceMath.parse_hex_to_triplet(hex_str)

def calculate_relative_luminance(rgb: Tuple[int, int, int]) -> float:
    return WcagLuminanceMath.compute_luminance(rgb)

def calculate_contrast_ratio(hex1: str, hex2: str) -> float:
    return WcagLuminanceMath.contrast(hex1, hex2)

class ColorAccessibilityEvaluator:

    @classmethod
    def assess(cls, swatch_hex: str) -> Dict[str, Any]:
        rgb_tuple = WcagLuminanceMath.parse_hex_to_triplet(swatch_hex)
        contrast_white = WcagLuminanceMath.contrast(swatch_hex, '#FFFFFF')
        contrast_dark = WcagLuminanceMath.contrast(swatch_hex, '#201815')
        optimal_backing = '#FFFFFF' if contrast_white >= contrast_dark else '#201815'
        peak_contrast = max(contrast_white, contrast_dark)
        passes_aa_standard = peak_contrast >= 4.5
        passes_aa_header = peak_contrast >= 3.0
        passes_aaa_standard = peak_contrast >= 7.0
        if passes_aaa_standard:
            badge = 'AAA'
        elif passes_aa_standard:
            badge = 'AA'
        elif passes_aa_header:
            badge = 'AA Large'
        else:
            badge = 'FAIL'
        return {'rgb': f'rgb({rgb_tuple[0]}, {rgb_tuple[1]}, {rgb_tuple[2]})', 'rgb_values': list(rgb_tuple), 'contrast_on_white': contrast_white, 'contrast_on_dark': contrast_dark, 'recommended_bg': optimal_backing, 'best_contrast_ratio': peak_contrast, 'passes_aa_normal': passes_aa_standard, 'passes_aa_large': passes_aa_header, 'passes_aaa': passes_aaa_standard, 'wcag_rating': badge}

def evaluate_color_accessibility(hex_val: str) -> Dict[str, Any]:
    return ColorAccessibilityEvaluator.assess(hex_val)
