## 🧭 Factur-X Invoice Generation – Architecture, Cleanup & Sprint Plan

### 🖼️ Mermaid Diagram – Current Ideal Workflow

```mermaid
graph TD
    A[User fills invoice form in frontend] --> B[API POST /api/invoices]
    B --> C[Prepare invoice_data dict]
    C --> D1[PDFService generates base PDF (reportlab)]
    C --> D2[XMLService generates EN16931 XML]
    D1 --> E[FacturXService embeds XML into PDF (generate_facturx_from_binary)]
    D2 --> E
    E --> F[Ghostscript: ensure PDF/A-3B compliance (pdfa_service.py)]
    F --> G[Store output_facturx.pdf + XML + metadata]
    G --> H[Send download link or file to frontend]
```

---

## 🧹 Codebase Cleanup Plan

### ✅ Keep
- `src/facturxapp/services/pdf_service.py` → **official base PDF generator**
- `src/facturxapp/services/facturx_service.py` → **embed XML into PDF**
- `src/facturxapp/services/xml_service.py` → **keep for now**
- `src/facturxapp/services/pdfa_service.py` → **wraps Ghostscript**

### 🗃 Archive / Remove
- `create_test_invoice_pdf.py` → test-only, extract layout logic if needed
- `generate_facturx_xml.py` → redundant with `XMLService`

### 🛠 Pending Tasks
- [ ] Phase out XMLService with in-memory `generate_facturx_from_data()`
- [ ] Align frontend with `invoice_data` format used in backend
- [ ] Implement PDF metadata injection in `facturx_service.py`
- [ ] Ensure `pdf_service.py` uses table-based layouts (extract from test impl)

---

## 🚀 Sprint Plan: Front-to-Back TDD Integration (5–7 Days)

### Day 1–2: Setup & Cleanup
- [ ] Confirm all services and test files are tracked in Git
- [x] Archive `create_test_invoice_pdf.py`, clean up `generate_facturx_xml.py`
- [ ] Generate or update fixtures for tests: `invoice_data`, sample XML, sample PDF

### Day 3–4: Frontend-to-Backend Connection
- [x] Create `tests/fixtures/invoice_data.json` and base PDF
- [ ] Write TDD test for `FacturXService.embed_facturx(...)`

### Day 4–5: Factur-X Embedding Tests
- [ ] Unit test `facturx_service.py` to embed XML
- [ ] Use in-memory buffer (BytesIO) instead of temp files
- [ ] Assert PDF contains `/AF`, `factur-x.xml`, correct metadata

### Day 6: Validation + Metadata
- [ ] Add metadata to PDF (`urn:factur-x:en16931:2017:compliant`)
- [ ] Integrate FERD or VeraPDF CLI check (optional)
- [ ] Test full flow: frontend → backend → PDF + XML

### Day 7: Final Review & Docs
- [ ] Clean up any unused mocks or test PDFs
- [ ] Write README for backend PDF/Factur-X pipeline
- [ ] Document how to test locally with CURL or Postman

---

Let me know when you're ready to:
1. Generate frontend tests or integration scenarios
2. Replace XMLService with full in-memory generation
3. Switch to `generate_facturx_from_data()` entirely
