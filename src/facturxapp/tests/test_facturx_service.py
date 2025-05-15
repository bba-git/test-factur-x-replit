import pytest
from pathlib import Path
from reportlab.pdfgen import canvas
from ..services.facturx_service import FacturXService
import json
import os

@pytest.fixture
def facturx_service():
    """Create a FacturXService instance for testing."""
    return FacturXService(output_dir="test_output")

@pytest.fixture
def sample_pdf():
    """Create a sample PDF file for testing."""
    output_dir = Path("test_output")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    pdf_path = output_dir / "sample.pdf"
    c = canvas.Canvas(str(pdf_path))
    c.drawString(100, 750, "Sample PDF for Factur-X testing")
    c.save()
    
    return pdf_path

@pytest.fixture
def sample_invoice_data():
    """Create sample invoice data for testing."""
    return {
        "invoice_number": "INV-001",
        "invoice_date": "2024-02-14",
        "due_date": "2024-03-14",
        "seller": {
            "name": "Test Seller",
            "address": {
                "line1": "123 Test St",
                "postcode": "12345",
                "city": "Test City",
                "country": "FR"
            },
            "city": "Test City",
            "postal_code": "12345",
            "country": "FR",
            "vat_number": "FR12345678900"
        },
        "buyer": {
            "name": "Test Buyer",
            "address": {
                "line1": "456 Test Ave",
                "postcode": "54321",
                "city": "Test City",
                "country": "FR"
            },
            "city": "Test City",
            "postal_code": "54321",
            "country": "FR",
            "vat_number": "FR98765432100"
        },
        "items": [
            {
                "description": "Test Item 1",
                "quantity": 2,
                "unit_price": 100.00,
                "vat_rate": 20.0
            }
        ],
        "currency": "EUR",
        "total_without_tax": 200.00,
        "total_tax": 40.00,
        "total_with_tax": 240.00
    }

@pytest.fixture
def invoice_data():
    fixture_path = Path(__file__).parent / "fixtures" / "invoice_data.json"
    with open(fixture_path, "r") as f:
        return json.load(f)

def test_facturx_service_initialization(facturx_service):
    """Test FacturXService initialization."""
    assert facturx_service.output_dir.exists()
    assert facturx_service.output_dir.is_dir()

def test_embed_facturx(facturx_service, sample_pdf, sample_invoice_data):
    """Test embedding Factur-X XML into a PDF."""
    output_pdf = facturx_service.embed_facturx(
        input_pdf=sample_pdf,
        invoice_data=sample_invoice_data
    )
    
    assert output_pdf.exists()
    assert output_pdf.suffix == ".pdf"
    assert "_facturx" in output_pdf.stem

def test_invalid_pdf(facturx_service, sample_invoice_data):
    """Test handling of invalid PDF."""
    with pytest.raises(FileNotFoundError):
        facturx_service.embed_facturx(
            input_pdf=Path("nonexistent.pdf"),
            invoice_data=sample_invoice_data
        )

def test_embed_facturx_creates_valid_pdf(invoice_data, sample_pdf):
    # Arrange
    facturx_service = FacturXService()
    
    # Act
    result = facturx_service.embed_facturx(
        invoice_data=invoice_data,
        input_pdf=sample_pdf
    )
    
    # Assert
    assert isinstance(result, bytes), "Result should be bytes"
    assert result.startswith(b"%PDF-"), "Result should be a valid PDF"
    assert b"factur-x.xml" in result, "PDF should contain embedded XML" 