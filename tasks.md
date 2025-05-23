# Factur-X Implementation Tasks

## Phase 1: Environment Setup ✅
- [x] Create virtual environment
- [x] Install required packages (reportlab, factur-x, lxml)
- [x] Set up project structure
- [x] Create basic PDF generation service
- [x] Create initial tests

## Phase 2: Basic PDF Generation ✅
- [x] Implement basic invoice layout
- [x] Add line items section
- [x] Add totals section
- [x] Test PDF generation

## Phase 3: Factur-X XML Generation ✅
- [x] Create XML generation service
- [x] Implement EN16931 XML structure
- [x] Add XML validation
- [x] Test XML generation

## Phase 4: PDF/A-3B Conversion ✅
- [x] Create PDF/A-3B conversion service
- [x] Implement Ghostscript integration
- [x] Add color profile handling
- [x] Add PDF/A-3B validation
- [x] Test conversion and validation

## Phase 5: Factur-X Integration
- [ ] Combine PDF generation and XML
- [ ] Implement Factur-X embedding
- [ ] Add metadata injection
- [ ] Test full integration

## Phase 6: Testing and Validation
- [ ] Create comprehensive test suite
- [ ] Add validation tools
- [ ] Test with real-world data
- [ ] Document usage

## Progress Log
- 2024-02-14: Completed Phase 1 - Environment setup and basic structure
- 2024-02-14: Completed Phase 2 - Basic PDF generation with layout and testing
- 2024-02-14: Completed Phase 3 - XML generation with EN16931 compliance
- 2024-02-14: Completed Phase 4 - PDF/A-3B conversion with Ghostscript integration
  - Created PDFAService with Ghostscript integration
  - Implemented PDF/A-3B conversion with proper color profiles
  - Added validation functionality
  - Created comprehensive test suite
  - Verified conversion and validation with sample PDFs
- [x] **Resolve import shadowing between local `facturx` package and external PyPI `facturx` library**
    - Renamed local package from `src/facturx/` to `src/facturxapp/`
    - Updated all internal imports to use `facturxapp` instead of `facturx`
    - Left all external imports (e.g., `from facturx import ...`) untouched
    - Verified and updated test and service imports as needed
    - Outcome: Clean, isolated internal package; external library `facturx` correctly imported and used; ready for test validation
- [x] **Fix XML reading in FacturXService**
    - Updated XML file reading in `src/facturxapp/services/facturx_service.py` to use binary mode ('rb') instead of text mode ('r').
    - This ensures that the XML data is passed as bytes to `generate_facturx_from_binary`, avoiding the ValueError due to encoding declarations.
    - All tests now pass cleanly. 