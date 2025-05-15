import logging
from pathlib import Path
from typing import Dict, Any
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PDFService:
    """Service for handling PDF generation and manipulation."""
    
    def __init__(self, output_dir: str = "output"):
        """
        Initialize the PDF service.
        
        Args:
            output_dir (str): Directory where generated PDFs will be saved
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"PDF service initialized with output directory: {self.output_dir}")
    
    def generate_invoice(self, invoice_data: Dict[str, Any]) -> Path:
        """
        Generate a basic invoice PDF.
        
        Args:
            invoice_data (Dict[str, Any]): Invoice data dictionary
            
        Returns:
            Path: Path to the generated PDF file
        """
        logger.info("Starting invoice PDF generation")
        pdf_path = self.output_dir / f"invoice_{invoice_data.get('invoice_number', 'test')}.pdf"
        c = canvas.Canvas(str(pdf_path), pagesize=A4)
        width, height = A4
        y = height - 50
        
        # Seller Information
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, invoice_data['seller']['name'])
        c.setFont("Helvetica", 12)
        y -= 20
        c.drawString(50, y, invoice_data['seller']['address']['line1'])
        y -= 15
        c.drawString(50, y, f"{invoice_data['seller']['address']['postcode']} {invoice_data['seller']['address']['city']}")
        y -= 15
        c.drawString(50, y, f"VAT: {invoice_data['seller']['vat_number']}")
        if 'phone' in invoice_data['seller']:
            y -= 15
            c.drawString(50, y, f"Phone: {invoice_data['seller']['phone']}")
        
        # Buyer Information
        y -= 40
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, "Invoice to:")
        c.setFont("Helvetica", 12)
        y -= 15
        c.drawString(50, y, invoice_data['buyer']['name'])
        y -= 15
        c.drawString(50, y, invoice_data['buyer']['address']['line1'])
        y -= 15
        c.drawString(50, y, f"{invoice_data['buyer']['address']['postcode']} {invoice_data['buyer']['address']['city']}")
        y -= 15
        c.drawString(50, y, f"VAT: {invoice_data['buyer']['vat_number']}")
        
        # Invoice Details
        y -= 40
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, f"Invoice #: {invoice_data['invoice_number']}")
        y -= 15
        c.setFont("Helvetica", 12)
        c.drawString(50, y, f"Date: {invoice_data['invoice_date']}")
        y -= 15
        c.drawString(50, y, f"Due Date: {invoice_data['due_date']}")
        y -= 15
        c.drawString(50, y, f"Payment Terms: {invoice_data['payment_terms']}")
        
        # Line Items
        y -= 40
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, "Description")
        c.drawString(250, y, "Quantity")
        c.drawString(320, y, "Unit Price")
        c.drawString(410, y, "Tax %")
        c.drawString(470, y, "Line Total")
        y -= 18
        c.setFont("Helvetica", 12)
        subtotal = 0.0
        total_tax = 0.0
        for item in invoice_data.get('items', []):
            qty = item.get('quantity', 0)
            unit_price = item.get('unit_price', 0)
            tax_percent = item.get('tax_percent', 0)
            line_total = qty * unit_price
            tax_amount = line_total * tax_percent / 100.0
            subtotal += line_total
            total_tax += tax_amount
            c.drawString(50, y, str(item.get('description', '')))
            c.drawString(250, y, f"{qty:.3f}")
            c.drawString(320, y, f"{unit_price:.3f}")
            c.drawString(410, y, f"{tax_percent:.1f}")
            c.drawString(470, y, f"{line_total:.2f}")
            y -= 15
        
        # Totals
        y -= 20
        c.setFont("Helvetica-Bold", 12)
        c.drawString(350, y, "Subtotal:")
        c.setFont("Helvetica", 12)
        c.drawRightString(550, y, f"{subtotal:.2f}")
        y -= 15
        c.setFont("Helvetica-Bold", 12)
        c.drawString(350, y, "Tax:")
        c.setFont("Helvetica", 12)
        c.drawRightString(550, y, f"{total_tax:.2f}")
        y -= 15
        c.setFont("Helvetica-Bold", 12)
        c.drawString(350, y, "Total:")
        c.setFont("Helvetica", 12)
        c.drawRightString(550, y, f"{(subtotal + total_tax):.2f}")
        
        c.showPage()
        c.save()
        logger.info(f"Invoice PDF generated at {pdf_path}")
        return pdf_path 