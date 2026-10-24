# 🧪 FIDELIS / CANON &mdash; Test Suite & Expected Outputs Guide

This guide details every test fixture in the [`test files/`](file:///c:/Users/bijuf/techcircuit/test%20files) directory, which UI screen to test it on, how to test it, and the **exact expected output**.

---

## 📂 Quick Summary of Test Files

| File | Format | Target UI Route | Primary Scenario Tested |
| :--- | :--- | :--- | :--- |
| **`01_Aurora_Brand_Guidelines`** | `.pdf` / `.txt` | [`/rulebook`](http://localhost:3000/rulebook) | AI Rule Compilation & Test Suite Generation |
| **`02_Aurora_Approved_Facts`** | `.pdf` / `.txt` | [`/facts`](http://localhost:3000/facts) | 1-Click Fact Extraction & Brand Vault Certification |
| **`03_Aurora_Marketing_Draft_Intentionally_Bad`** | `.pdf` / `.txt` | [`/review`](http://localhost:3000/review) | Adversarial Violations, Claim Contradiction & 1-Click Fixes |
| **`06_Aurora_Compliant_Campaign_Draft`** | `.pdf` / `.txt` | [`/review`](http://localhost:3000/review) | Benchmark 100% Compliant Pass (0 Blocking Flags) |
| **`04_Aurora_Visual_Asset_Standards`** | `.pdf` / `.txt` | [`/assets`](http://localhost:3000/assets) | Palette Ingestion, WCAG Contrast & Logo Spacing Rules |
| **`05_Aurora_Accessibility_Checklist`** | `.pdf` / `.txt` | [`/guide`](http://localhost:3000/guide) | Operational Checklist & Accessibility Rule Reference |
| **`07_Aurora_Logo_Compliant.png`** | `.png` (300x300) | [`/assets`](http://localhost:3000/assets) | Compliant 1:1 Aspect Ratio Vector Logo Asset |
| **`08_Aurora_Logo_Distorted_Stretched.png`** | `.png` (520x140) | [`/assets`](http://localhost:3000/assets) or [`/review`](http://localhost:3000/review) | Visual Audit Warning for Aspect Ratio Distortion |
| **`09_Aurora_Compliant_Campaign_Draft_CERTIFIED.txt`** | `.txt` | [`/review`](http://localhost:3000/review) & [`/approvals`](http://localhost:3000/approvals) | Approved Document with Cryptographic SHA-256 Security Header |
| **`09_Aurora_Tamper_Proof_Certificate.json`** | `.json` | [`/approvals`](http://localhost:3000/approvals) & [`/audit`](http://localhost:3000/audit) | Machine-Verifiable Cryptographic Brand Attestation Certificate |
| **`10_Aurora_Audit_Ledger_Export.json`** | `.json` | [`/audit`](http://localhost:3000/audit) | Complete Immutable HMAC-SHA256 Audit Trail Export |

---

## 1. Test Scenario A: Compile Brand Guidelines

* **Target Page**: [`http://localhost:3000/rulebook`](http://localhost:3000/rulebook)
* **Persona**: `Brand Manager` (`sebin`) or `Admin` (`alfred`)
* **Test File**: `01_Aurora_Brand_Guidelines.pdf` (or paste `01_Aurora_Brand_Guidelines.txt`)

### How to Execute:
1. Open [`/rulebook`](http://localhost:3000/rulebook).
2. Under **"AI Guideline Ingestion Engine"**, upload `01_Aurora_Brand_Guidelines.pdf` (or paste the text into the manual input box).
3. Click **"Analyze & Compile Guidelines"**.
4. Review the extracted candidate rules table.
5. Click **"Certify & Publish Rulebook"**.

### ✅ Expected Output:
* **Compiled Candidate Rules**: The system parses the document and extracts structured rule cards:
  * **Rule 1 (Voice)**: Prohibits `revolutionary`, `perfect`, and guarantees to work for everyone. Severity: `BLOCKING`.
  * **Rule 2 (Naming)**: Enforces exact capitalization for `Aurora Desk`.
  * **Rule 3 (Terminology)**: Enforces `team workspace` instead of `collaboration hub`, and `sign in` instead of `login` as a verb.
  * **Rule 4 (Claims)**: Prohibits unverified `100% uptime` claims.
  * **Rule 5 (Links)**: Flags generic link labels like `click here`.
* **Publication Toast**: *"Rulebook version 1.1.0 published and activated across workspace!"*
* **Active Status**: Status badge switches to **ACTIVE (Version 1.1.0)** with all extracted rules live in enforcement.

---

## 2. Test Scenario B: Fact Vault Extraction & Certification

* **Target Page**: [`http://localhost:3000/facts`](http://localhost:3000/facts)
* **Persona**: `Brand Manager` (`sebin`) or `Admin` (`alfred`)
* **Test File**: `02_Aurora_Approved_Facts.pdf` (or paste `02_Aurora_Approved_Facts.txt`)

### How to Execute:
1. Open [`/facts`](http://localhost:3000/facts).
2. Under **"AI Proof Ingestion & Claim Miner"**, upload `02_Aurora_Approved_Facts.pdf`.
3. Click **"Mine Certified Facts from PDF"**.
4. The system will display the candidate facts mined from the document.
5. Click **"Certify to Brand Vault"** on candidate cards.

### ✅ Expected Output:
* **Extracted Candidate Facts**:
  1. `FACT-001`: *Aurora Desk supports team workspaces for project coordination.* (Valid until: June 2027)
  2. `FACT-002`: *The standard plan costs $12 per user per month when billed monthly.* (Value: `12`, Unit: `$/user/month`, Valid until: Dec 2026)
  3. `FACT-003`: *In an internal test, 24 participants completed the onboarding task in under 10 minutes.* (Value: `10`, Unit: `minutes`, Valid until: Jan 2027)
  4. `FACT-004`: *Aurora Desk does not guarantee uninterrupted service (99.9% target SLA).* (Valid until: Dec 2027)
  5. `FACT-005`: *Aurora Labs has 18 employees as of 2026-09-01.* (Value: `18`, Unit: `employees`, Valid until: Nov 2026)
* **Vault Certification Status**: Certified cards appear in the **"Active Certified Brand Truths"** table with **Active** green status pills and verified citation badges.

---

## 3. Test Scenario C: Adversarial Marketing Review (Intentionally Bad)

* **Target Page**: [`http://localhost:3000/review`](http://localhost:3000/review)
* **Persona**: `Content Creator` (`adhithya`) or `Compliance Reviewer` (`albert`)
* **Test File**: `03_Aurora_Marketing_Draft_Intentionally_Bad.pdf` (or paste `03_Aurora_Marketing_Draft_Intentionally_Bad.txt`)

### How to Execute:
1. Open [`/review`](http://localhost:3000/review).
2. Set document name: `03 Aurora Adversarial Draft`.
3. Drag & drop `03_Aurora_Marketing_Draft_Intentionally_Bad.pdf` into the upload zone (or paste text into the expandable text area).
4. Click **"Run Full Compliance & Fact Audit"**.

### ✅ Expected Output:
* **Compliance Verdict**: **BLOCKED (Non-Compliant)** with multiple red and amber flags.
* **Flagged Violations**:
  1. 🔴 **Prohibited Superlative**: Flagged word `"revolutionary"` &rarr; Suggestion: Remove or replace with *"innovative"*.
  2. 🔴 **Terminology Drift**: Flagged phrase `"collaboration hub"` &rarr; Suggestion: Replace with *"team workspace"*.
  3. 🔴 **Prohibited Superlative**: Flagged word `"perfect"` &rarr; Suggestion: *"suitable for every team"*.
  4. 🔴 **Unsubstantiated Fact / Contradiction**: Flagged `"guarantees 100% uptime"` &rarr; Reason: *Contradicts FACT-004 (SLA is 99.9% and does not guarantee uninterrupted service)*.
  5. 🔴 **Factual Contradiction**: Flagged `"$9 per user monthly"` &rarr; Reason: *Conflicts with certified pricing FACT-002 ($12/user/month)*.
  6. 🔴 **Factual Contradiction**: Flagged `"180 employees"` &rarr; Reason: *Conflicts with certified headcount FACT-005 (18 employees)*.
  7. 🟡 **Unsubstantiated Claim**: Flagged `"all customers finish onboarding in under 10 minutes"` &rarr; Reason: *Evidence in FACT-003 is strictly limited to 24 test participants, not all customers*.
  8. 🟡 **Accessibility Warning**: Flagged `"Click here"` &rarr; Reason: *Generic link text violates accessibility guideline 5.3*.
* **Interactive Diffs & 1-Click Fixes**:
  * Clicking **"Accept 1-Click Fix"** replaces the offending word in-place with the compliant alternative.
  * Once all fixes are accepted, the submission turns **Green / Compliant** and unlocks the **"Submit for Sign-Off"** button!

---

## 4. Test Scenario D: Compliant Marketing Review (100% Clean Pass)

* **Target Page**: [`http://localhost:3000/review`](http://localhost:3000/review)
* **Persona**: `Content Creator` (`adhithya`)
* **Test File**: `06_Aurora_Compliant_Campaign_Draft.pdf` (or paste `06_Aurora_Compliant_Campaign_Draft.txt`)

### How to Execute:
1. Open [`/review`](http://localhost:3000/review).
2. Upload `06_Aurora_Compliant_Campaign_Draft.pdf`.
3. Click **"Run Full Compliance & Fact Audit"**.

### ✅ Expected Output:
* **Compliance Verdict**: **100% PASSED &bull; ZERO BLOCKING FLAGS**.
* **Claims Evaluation**:
  * *Aurora Desk supports team workspaces* &rarr; **SUPPORTED by FACT-001**.
  * *$12 per user per month billed monthly* &rarr; **SUPPORTED by FACT-002**.
  * *24 participants completed onboarding in under 10 minutes (UX-24)* &rarr; **SUPPORTED by FACT-003**.
  * *18 team members* &rarr; **SUPPORTED by FACT-005**.
* **Action Unlocked**: The **"Submit for Sign-Off"** button is immediately enabled to send the draft to the Approver queue!

---

## 5. Test Scenario E: Visual Brand Asset Checks (Logo Aspect Ratio)

* **Target Page**: [`http://localhost:3000/assets`](http://localhost:3000/assets)
* **Persona**: `Brand Manager` (`sebin`) or `Admin` (`alfred`)
* **Test Files**:
  * Clean Asset: `07_Aurora_Logo_Compliant.png`
  * Distorted Asset: `08_Aurora_Logo_Distorted_Stretched.png`

### How to Execute:
1. Open [`/assets`](http://localhost:3000/assets).
2. Click **"Upload New Asset"**.
3. First, upload `07_Aurora_Logo_Compliant.png`:
   * Category: `Logos`
   * Intended Usage: `Header mark for web and product UI`
   * Click **Upload**.
4. Next, upload `08_Aurora_Logo_Distorted_Stretched.png`:
   * Category: `Logos`
   * Click **Upload**.
5. Click **"Audit Aspect Ratio"** on both asset cards.

### ✅ Expected Output:
* **Compliant Logo (`07_Aurora_Logo_Compliant.png`)**:
  * Dimensions: `300x300` px. Aspect Ratio: `1.00:1`.
  * Visual Audit Result: **Pass (Valid aspect ratio & clear margins)**.
* **Distorted Logo (`08_Aurora_Logo_Distorted_Stretched.png`)**:
  * Dimensions: `520x140` px. Aspect Ratio: `3.71:1`.
  * Visual Audit Result: ⚠️ **Warning: Detected horizontal aspect ratio distortion (exceeds allowable standard). Requires Brand Manager exception or re-export.**

---

## 6. Test Scenario F: Sign-Off, Audited Exceptions & HMAC Verification

* **Target Pages**: [`/approvals`](http://localhost:3000/approvals) &rarr; [`/audit`](http://localhost:3000/audit)
* **Persona**: `Compliance Reviewer` (`albert`) or `Brand Manager` (`sebin`)

### How to Execute:
1. After submitting a draft from `/review`, navigate to [`/approvals`](http://localhost:3000/approvals).
2. Click **"Review & Decide"** on the pending campaign submission.
3. Select **"Approve with Documented Exception"**:
   * Exception Category: `Contextual Marketing Exemption`
   * Reason: *"Approved for limited regional pilot campaign under VP sign-off."*
   * Click **Confirm Decision**.
4. Navigate to [`/audit`](http://localhost:3000/audit).
5. Click **"Verify Hash Chain Integrity"**.

### ✅ Expected Output:
* **Approvals Receipt**: An official **Cryptographic Review Receipt** (`RCPT-...`) is issued containing:
  * SHA-256 Content Hash
  * Rulebook Version
  * Approver Signature
  * LLM Model Disclosure (`Qwen/Qwen2.5-7B-Instruct` or local model metadata)
* **HMAC Audit Chain**:
  * New block appended to the ledger with event type `APPROVAL_DECISION` and `EXCEPTION_RECORDED`.
  * **Chain Integrity**: Displays **"100% Cryptographically Verified &bull; Zero Broken Links &bull; Zero Tampering Detected"**.

---

## 7. Test Scenario G: Tamper-Proof Document & Certificate Verification

* **Target Pages**: [`/approvals`](http://localhost:3000/approvals) & [`/audit`](http://localhost:3000/audit)
* **Test Files**:
  * `09_Aurora_Compliant_Campaign_Draft_CERTIFIED.txt`
  * `09_Aurora_Tamper_Proof_Certificate.json`
  * `10_Aurora_Audit_Ledger_Export.json`

### How to Execute:
1. Open [`/approvals`](http://localhost:3000/approvals) upon issuing an approval stamp.
2. In the golden certificate banner, click:
   * **"Certificate (.json)"** &rarr; Downloads the official cryptographic attestation certificate (`FIDELIS-CERTIFICATE-RCPT-....json`).
   * **"Document (.txt)"** &rarr; Downloads the final certified copy with its embedded tamper-evident SHA-256 header.
3. Open [`/audit`](http://localhost:3000/audit).
4. Click **"Export Tamper-Proof Ledger"** &rarr; Downloads the complete verifiable block sequence (`FIDELIS-TAMPER-PROOF-LEDGER-....json`).

### ✅ Expected Output:
* **Certificate Validation**: The JSON file matches the verified SHA-256 hash (`d5185af58c2a98715f337e23b70e39def182e3bc3415ae42541cbaae012766f5`) with an intact HMAC-SHA256 signature and approver timestamp.
* **Tamper-Evident Header**: The text file contains an immutable verification header for legal and publishing defense. Any alteration to words or whitespace invalidates the cryptographic checksum.

## 8. Test Scenario H: Revision Changes and Approval Invalidation

- **Target Pages**: [`/review`](http://localhost:3000/review) → [`/approvals`](http://localhost:3000/approvals)
- **Persona**: `Content Creator` (`adhithya`) and `Compliance Reviewer` (`albert`)
- **Test Fixture**: `11_Aurora_Revision_Change_Test.txt`

### Suggested Test Fixture Content

Aurora Desk helps teams organize project work in team workspaces.
The standard plan costs $12 per user per month when billed monthly.
In an internal test, 24 participants completed the onboarding task in under 10 minutes.

### How to Execute:

1. Ensure the active rulebook and certified facts are available.
2. Open `/review` and upload or paste the fixture content.
3. Run **"Run Full Compliance & Fact Audit"** and confirm that the supported claims are recognized.
4. If the draft is compliant, submit it for sign-off.
5. Open `/approvals` and complete the normal approval process in a test workspace.
6. Return to the source draft and make a meaningful content change, such as changing `$12` to `$9` or adding an unsupported guarantee.
7. Save or resubmit the revised draft and check whether the earlier approval is still shown as valid.

### Expected Output:

- The changed draft is treated as a new revision, or its previous approval is marked stale or invalid.
- A fresh compliance audit and, where applicable, a new approval are required.
- The earlier receipt and content hash remain associated with the original approved content.
- The audit history records the revision or invalidation event if supported by the implementation.

**Pass condition:** Modified content cannot inherit an approval or certificate issued for a different content hash.

**Implementation note:** If editing after submission is not supported, create a new submission with modified text and compare its content hash and approval status with the original.

## 9. Test Scenario I: Role-Based Access and Workspace Isolation

- **Target Pages**: `/approvals`, `/audit`, `/facts`, and `/rulebook`
- **Personas**:
  - `Admin` (`alfred`)
  - `Brand Manager` (`sebin`)
  - `Content Creator` (`adhithya`)
  - `Compliance Reviewer` (`albert`)
- **Test Fixture**: `12_Aurora_Access_Control_Test.md`

### How to Execute:

1. Sign in as each test persona using configured test accounts.
2. As `Content Creator` (`adhithya`), open `/review` and confirm that content creation and submission are available.
3. Attempt to publish rules or certify facts without the required permissions.
4. As `Compliance Reviewer` (`albert`), open `/approvals` and verify that approval actions are available only if the role has the required permission.
5. As `Brand Manager` (`sebin`) or `Admin` (`alfred`), verify the authorized actions on `/rulebook` and `/facts`.
6. If multiple workspaces are supported, create two test workspaces and add a unique record to the first workspace.
7. Sign in as a user who belongs only to the second workspace and attempt to access the first workspace's record.
8. Where authorized for testing, repeat the access check through the application's API.
9. Sign out and sign in again to confirm permissions are applied to the current session.

### Expected Output:

- Users can perform only actions permitted by their assigned roles.
- Unauthorized actions are hidden, disabled, or rejected by the server.
- Users cannot publish rulebooks, certify facts, approve submissions, or inspect protected audit information without the required permissions.
- Workspace-scoped records are not returned to users who lack access to that workspace.
- Backend API requests enforce authorization even if a client-side control is bypassed.
- Rejected requests do not modify protected data.

**Pass condition:** Both the UI and backend enforce the same authorization boundaries.

**Safety note:** Run this scenario only with test accounts and workspaces you control. Do not probe production users or data.



