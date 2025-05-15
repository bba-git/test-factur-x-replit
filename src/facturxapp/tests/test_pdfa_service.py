import pytest
from pathlib import Path
import shutil
from reportlab.pdfgen import canvas
from ..services.pdfa_service import PDFAService

@pytest.fixture
def pdfa_service():
    """Create a PDF/A service instance for testing."""
    return PDFAService(output_dir="test_output")

@pytest.fixture
def sample_pdf():
    """Create a sample PDF file for testing."""
    output_dir = Path("test_output")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    pdf_path = output_dir / "sample.pdf"
    c = canvas.Canvas(str(pdf_path))
    c.drawString(100, 750, "Sample PDF for PDF/A-3B testing")
    c.save()
    
    return pdf_path

def test_pdfa_service_initialization(pdfa_service):
    """Test PDF/A service initialization."""
    assert pdfa_service.output_dir.exists()
    assert pdfa_service.output_dir.is_dir()
    # Cleanup
    shutil.rmtree(pdfa_service.output_dir)

def test_convert_to_pdfa3b(pdfa_service, sample_pdf):
    """Test PDF/A-3B conversion."""
    output_pdf, is_valid = pdfa_service.convert_to_pdfa3b(sample_pdf)
    
    assert output_pdf.exists()
    assert output_pdf.suffix == '.pdf'
    assert is_valid
    # Cleanup
    output_pdf.unlink()
    shutil.rmtree(pdfa_service.output_dir)

def test_validate_pdfa3b(pdfa_service, sample_pdf):
    """Test PDF/A-3B validation."""
    # First convert to PDF/A-3B
    output_pdf, _ = pdfa_service.convert_to_pdfa3b(sample_pdf)
    
    # Then validate
    is_valid = pdfa_service.validate_pdfa3b(output_pdf)
    assert is_valid
    # Cleanup
    output_pdf.unlink()
    shutil.rmtree(pdfa_service.output_dir)

def test_invalid_pdf(pdfa_service):
    """Test handling of invalid PDF."""
    invalid_pdf = Path("test_output/nonexistent.pdf")
    
    with pytest.raises(FileNotFoundError):
        pdfa_service.convert_to_pdfa3b(invalid_pdf)
    
    with pytest.raises(FileNotFoundError):
        pdfa_service.validate_pdfa3b(invalid_pdf) 