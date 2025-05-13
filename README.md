# Factur-X PDF/A-3B Invoice Generator

This toolkit automates the process of creating Factur-X/ZUGFeRD 2.1 compliant electronic invoices in PDF/A-3B format, as required by the French e-invoicing reform.

## Features

- Convert regular PDFs to PDF/A-3B format
- Generate Factur-X/ZUGFeRD XML from invoice data
- Embed XML into PDF/A-3B with proper AFRelationship="Data"
- Add required XMP metadata
- Validate PDF for Factur-X compliance
- Support for different Factur-X profiles (MINIMUM, BASIC_WL, EN16931)

## Requirements

- Python 3.11+
- Ghostscript
- Libraries: pikepdf, lxml, ghostscript, reportlab

## Installation

1. Clone this repository
2. Install dependencies:
```
pip install pikepdf lxml ghostscript reportlab
```
3. Ensure Ghostscript is installed on your system

## Usage

### Complete Workflow

The main script automates the entire process:

```bash
python create_facturx_invoice.py invoice.pdf invoice_data.json --output=facturx_invoice.pdf --profile=EN16931
```

Parameters:
- `invoice.pdf`: Input PDF file
- `invoice_data.json`: JSON file with invoice data
- `--output`: Path to save the final PDF (optional)
- `--profile`: Factur-X profile (MINIMUM, BASIC_WL, EN16931) (optional, default: EN16931)
- `--no-validate`: Skip validation step (optional)

### Individual Steps

You can also use each component separately:

#### 1. Convert PDF to PDF/A-3B

```bash
python pdf_converter.py invoice.pdf --output=pdfa3b.pdf
```

#### 2. Generate Factur-X XML

```bash
python generate_facturx_xml.py invoice_data.json --output=factur-x.xml
```

#### 3. Embed XML into PDF/A-3B

```bash
python embed_xml.py pdfa3b.pdf factur-x.xml --output=facturx_invoice.pdf --profile=EN16931
```

#### 4. Validate Factur-X PDF

```bash
python validate_facturx.py facturx_invoice.pdf --extract-xml --xml-output=extracted.xml
```

### Generate Sample Invoice PDF

For testing purposes, you can generate a sample PDF invoice:

```bash
python create_sample_pdf.py sample_invoice.json --output=sample_invoice.pdf
```

## JSON Invoice Data Format

The JSON invoice data should follow this structure:

```json
{
  "invoice_number": "INV-2025-0001",
  "issue_date": "2025-05-13",
  "due_date": "2025-06-12",
  "currency": "EUR",
  "subtotal": 1000.00,
  "vat_total": 200.00,
  "total": 1200.00,
  "notes": "Thank you for your business",
  "payment_terms": "30 days",
  "purchase_order_ref": "PO-2025-1234",
  
  "seller": {
    "name": "Your Company SAS",
    "address": "123 Business Street",
    "city": "Paris",
    "postal_code": "75001",
    "country": "FR",
    "vat_number": "FR12345678901"
  },
  
  "buyer": {
    "name": "Client Corporation",
    "address": "456 Client Avenue",
    "city": "Lyon",
    "postal_code": "69001",
    "country": "FR",
    "vat_number": "FR98765432109"
  },
  
  "items": [
    {
      "description": "Consulting Services",
      "quantity": 10,
      "unit_price": 80.00,
      "vat_rate": 20,
      "unit_of_measure": "HUR",
      "product_id": "SRV-001"
    }
  ]
}
```

## Factur-X/ZUGFeRD Profiles

- **MINIMUM**: Basic invoice data
- **BASIC WL**: Additional information including line items
- **EN16931**: Full compliance with European e-invoicing standard EN16931

## Standards Compliance

This toolkit creates invoices compliant with:
- Factur-X/ZUGFeRD 2.1
- PDF/A-3B
- European standard EN16931 (for EN16931 profile)
- French e-invoicing reform requirements

## License

MIT