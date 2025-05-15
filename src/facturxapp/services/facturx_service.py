import logging
import os
import traceback
from pathlib import Path
from typing import Dict, Any, Optional
from facturx import generate_facturx_from_binary
from .pdfa_service import PDFAService
from .xml_service import XMLService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FacturXService:
    """Service for embedding Factur-X XML into PDF/A-3B documents."""
    
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.pdfa_service = PDFAService(output_dir=output_dir)
        self.xml_service = XMLService(output_dir=output_dir)
        logger.info(f"Factur-X service initialized with output directory: {self.output_dir}")
    
    def embed_facturx(self,
                     input_pdf: Path,
                     invoice_data: Dict[str, Any],
                     output_pdf: Optional[Path] = None) -> Path:
        """
        Embed Factur-X XML into a PDF/A-3B document.
        
        Args:
            input_pdf (Path): Path to the input PDF/A-3B file
            invoice_data (Dict[str, Any]): Invoice data dictionary
            output_pdf (Optional[Path]): Path for the output PDF file. If None, will use input filename with _facturx suffix
            
        Returns:
            Path: Path to the generated Factur-X PDF
        """
        if not input_pdf.exists():
            raise FileNotFoundError(f"Input PDF not found: {input_pdf}")
        
        if output_pdf is None:
            output_pdf = self.output_dir / "output_facturx.pdf"
        
        try:
            logger.info("Starting Factur-X embedding")
            
            # First generate the XML file
            xml_path = self.xml_service.generate_facturx_xml(invoice_data)

            # Read the XML file as a string and remove encoding declaration
            with open(xml_path, 'r', encoding='utf-8') as f:
                xml_string = f.read()
            if xml_string.startswith('<?xml'):
                xml_string = xml_string.split('?>', 1)[1].strip()

            # Read the input PDF as bytes
            with open(input_pdf, 'rb') as f:
                pdf_bytes = f.read()

            # Generate Factur-X PDF with embedded XML
            output_pdf_bytes = generate_facturx_from_binary(
                pdf_bytes,
                xml_string,
                facturx_level="EN16931"
            )
            with open(output_pdf, "wb") as f:
                f.write(output_pdf_bytes)

            if os.path.exists(output_pdf):
                print("✅ Factur-X embedding successful.")
                logger.info(f"Factur-X PDF generated at {output_pdf}")
            else:
                logger.error(f"Output PDF was not created: {output_pdf}")
                print(f"❌ Output PDF was not created: {output_pdf}")
                raise FileNotFoundError(f"Output PDF was not created: {output_pdf}")

            # Validate the output PDF is still PDF/A-3B compliant
            is_valid = self.pdfa_service.validate_pdfa3b(output_pdf)
            if not is_valid:
                logger.warning("Generated PDF may not be PDF/A-3B compliant")

            return output_pdf
            
        except Exception as e:
            logger.error(f"Factur-X embedding failed: {str(e)}\n{traceback.format_exc()}")
            print("❌ Factur-X embedding failed:")
            traceback.print_exc()
            raise 