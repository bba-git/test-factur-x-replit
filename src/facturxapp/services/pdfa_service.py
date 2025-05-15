import logging
import subprocess
from pathlib import Path
from typing import Optional, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PDFAService:
    """Service for handling PDF/A-3B conversion and validation."""
    
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"PDF/A service initialized with output directory: {self.output_dir}")
        
        # Check Ghostscript installation
        if not self._check_ghostscript():
            raise RuntimeError("Ghostscript is not installed. Please install it first.")
    
    def _check_ghostscript(self) -> bool:
        """Check if Ghostscript is installed and accessible."""
        try:
            result = subprocess.run(['gs', '--version'], 
                                 capture_output=True, 
                                 text=True, 
                                 check=True)
            logger.info(f"Ghostscript version: {result.stdout.strip()}")
            return True
        except (subprocess.SubprocessError, FileNotFoundError):
            logger.error("Ghostscript not found. Please install it first.")
            return False
    
    def convert_to_pdfa3b(self, 
                         input_pdf: Path, 
                         output_pdf: Optional[Path] = None) -> Tuple[Path, bool]:
        """
        Convert a PDF to PDF/A-3B format using Ghostscript.
        
        Args:
            input_pdf (Path): Path to the input PDF file
            output_pdf (Optional[Path]): Path for the output PDF file. If None, will use input filename with _pdfa3b suffix
            
        Returns:
            Tuple[Path, bool]: Path to the converted PDF and success status
        """
        if not input_pdf.exists():
            raise FileNotFoundError(f"Input PDF not found: {input_pdf}")
        
        if output_pdf is None:
            output_pdf = self.output_dir / f"{input_pdf.stem}_pdfa3b{input_pdf.suffix}"
        
        gs_command = [
            'gs',
            '-dPDFA=3',
            '-dBATCH',
            '-dNOPAUSE',
            '-sProcessColorModel=DeviceRGB',
            '-sDEVICE=pdfwrite',
            '-dPDFACompatibilityPolicy=1',
            '-dPDFAValidation=1',
            '-sPDFAValidationProfile=PDF/A-3B',
            f'-sOutputFile={output_pdf}',
            str(input_pdf)
        ]
        
        try:
            logger.info(f"Starting PDF/A-3B conversion: {' '.join(gs_command)}")
            result = subprocess.run(gs_command, 
                                 capture_output=True, 
                                 text=True, 
                                 check=True)
            logger.info("PDF/A-3B conversion completed successfully")
            logger.info(f"Ghostscript STDOUT:\n{result.stdout}")
            logger.info(f"Ghostscript STDERR:\n{result.stderr}")
            
            # Validate the converted PDF
            is_valid = self.validate_pdfa3b(output_pdf)
            return output_pdf, is_valid
            
        except subprocess.CalledProcessError as e:
            logger.error(f"PDF/A-3B conversion failed: {str(e)}")
            logger.error(f"Ghostscript STDOUT:\n{e.stdout}")
            logger.error(f"Ghostscript STDERR:\n{e.stderr}")
            return output_pdf, False
    
    def validate_pdfa3b(self, pdf_path: Path) -> bool:
        """
        Validate if a PDF is compliant with PDF/A-3B standard.
        
        Args:
            pdf_path (Path): Path to the PDF file to validate
            
        Returns:
            bool: True if the PDF is PDF/A-3B compliant, False otherwise
        """
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        gs_command = [
            'gs',
            '-dPDFA=3',
            '-dBATCH',
            '-dNOPAUSE',
            '-sProcessColorModel=DeviceRGB',
            '-sDEVICE=pdfwrite',
            '-dPDFACompatibilityPolicy=1',
            '-dPDFAValidation=1',
            '-sPDFAValidationProfile=PDF/A-3B',
            '-sOutputFile=/dev/null',
            str(pdf_path)
        ]
        
        try:
            logger.info(f"Starting PDF/A-3B validation: {' '.join(gs_command)}")
            result = subprocess.run(gs_command, 
                                 capture_output=True, 
                                 text=True, 
                                 check=True)
            logger.info("PDF/A-3B validation completed successfully")
            logger.info(f"Ghostscript STDOUT:\n{result.stdout}")
            logger.info(f"Ghostscript STDERR:\n{result.stderr}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"PDF/A-3B validation failed: {str(e)}")
            logger.error(f"Ghostscript STDOUT:\n{e.stdout}")
            logger.error(f"Ghostscript STDERR:\n{e.stderr}")
            return False

    def debug_minimal_pdfa_command(self, input_pdf: Path, output_pdf: Optional[Path] = None) -> Tuple[Path, bool]:
        """
        Run a minimal Ghostscript command for PDF/A-3B conversion for debugging purposes.
        """
        if not input_pdf.exists():
            raise FileNotFoundError(f"Input PDF not found: {input_pdf}")
        if output_pdf is None:
            output_pdf = self.output_dir / f"{input_pdf.stem}_pdfa3b_minimal{input_pdf.suffix}"
        gs_command = [
            'gs',
            '-dPDFA=3',
            '-dBATCH',
            '-dNOPAUSE',
            '-sDEVICE=pdfwrite',
            '-sOutputFile=' + str(output_pdf),
            '-dPDFACompatibilityPolicy=1',
            str(input_pdf)
        ]
        try:
            logger.info(f"Starting minimal PDF/A-3B conversion: {' '.join(gs_command)}")
            result = subprocess.run(gs_command, capture_output=True, text=True, check=True)
            logger.info("Minimal PDF/A-3B conversion completed successfully")
            logger.info(f"Ghostscript STDOUT:\n{result.stdout}")
            logger.info(f"Ghostscript STDERR:\n{result.stderr}")
            return output_pdf, True
        except subprocess.CalledProcessError as e:
            logger.error(f"Minimal PDF/A-3B conversion failed: {str(e)}")
            logger.error(f"Ghostscript STDOUT:\n{e.stdout}")
            logger.error(f"Ghostscript STDERR:\n{e.stderr}")
            return output_pdf, False 