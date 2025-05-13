#!/usr/bin/env python3
"""
Sample PDF Invoice Generator

This script generates a sample PDF invoice for testing purposes.
"""

import json
import argparse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib import colors

def create_sample_invoice(json_file, output_pdf):
    """Create a sample PDF invoice based on JSON data"""
    
    # Load invoice data
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    # Create canvas
    c = canvas.Canvas(output_pdf, pagesize=A4)
    width, height = A4
    
    # Add title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(2*cm, height - 2*cm, "INVOICE")
    
    # Add invoice number and dates
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, height - 3*cm, f"Invoice Number: {data['invoice_number']}")
    c.setFont("Helvetica", 10)
    c.drawString(2*cm, height - 3.5*cm, f"Issue Date: {data['issue_date']}")
    c.drawString(2*cm, height - 4*cm, f"Due Date: {data['due_date']}")
    
    # Seller information
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, height - 5.5*cm, "From:")
    c.setFont("Helvetica", 10)
    c.drawString(2*cm, height - 6*cm, data['seller']['name'])
    c.drawString(2*cm, height - 6.5*cm, data['seller']['address'])
    c.drawString(2*cm, height - 7*cm, f"{data['seller']['city']}, {data['seller']['postal_code']}")
    c.drawString(2*cm, height - 7.5*cm, f"Country: {data['seller']['country']}")
    c.drawString(2*cm, height - 8*cm, f"VAT: {data['seller']['vat_number']}")
    
    # Buyer information
    c.setFont("Helvetica-Bold", 12)
    c.drawString(11*cm, height - 5.5*cm, "To:")
    c.setFont("Helvetica", 10)
    c.drawString(11*cm, height - 6*cm, data['buyer']['name'])
    c.drawString(11*cm, height - 6.5*cm, data['buyer']['address'])
    c.drawString(11*cm, height - 7*cm, f"{data['buyer']['city']}, {data['buyer']['postal_code']}")
    c.drawString(11*cm, height - 7.5*cm, f"Country: {data['buyer']['country']}")
    c.drawString(11*cm, height - 8*cm, f"VAT: {data['buyer']['vat_number']}")
    
    # Line items
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, height - 10*cm, "Items:")
    
    # Table header
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2*cm, height - 11*cm, "Description")
    c.drawString(9*cm, height - 11*cm, "Quantity")
    c.drawString(11*cm, height - 11*cm, "Unit Price")
    c.drawString(14*cm, height - 11*cm, "VAT Rate")
    c.drawString(17*cm, height - 11*cm, "Amount")
    
    # Draw a line
    c.setStrokeColor(colors.black)
    c.line(2*cm, height - 11.3*cm, 19*cm, height - 11.3*cm)
    
    # Table content
    c.setFont("Helvetica", 10)
    y = height - 12*cm
    
    for item in data['items']:
        c.drawString(2*cm, y, item['description'])
        c.drawString(9*cm, y, str(item['quantity']))
        c.drawString(11*cm, y, f"{item['unit_price']:.2f} {data['currency']}")
        c.drawString(14*cm, y, f"{item['vat_rate']}%")
        c.drawString(17*cm, y, f"{item['quantity'] * item['unit_price']:.2f} {data['currency']}")
        y -= 1*cm
    
    # Draw a line
    c.line(2*cm, y - 0.3*cm, 19*cm, y - 0.3*cm)
    
    # Totals
    y -= 1*cm
    c.setFont("Helvetica", 10)
    c.drawString(14*cm, y, "Subtotal:")
    c.drawString(17*cm, y, f"{data['subtotal']:.2f} {data['currency']}")
    
    y -= 0.7*cm
    c.drawString(14*cm, y, "VAT:")
    c.drawString(17*cm, y, f"{data['vat_total']:.2f} {data['currency']}")
    
    y -= 0.7*cm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(14*cm, y, "Total:")
    c.drawString(17*cm, y, f"{data['total']:.2f} {data['currency']}")
    
    # Payment terms
    y -= 2*cm
    c.setFont("Helvetica", 10)
    c.drawString(2*cm, y, f"Payment Terms: {data['payment_terms']}")
    if 'purchase_order_ref' in data:
        c.drawString(2*cm, y - 0.5*cm, f"Purchase Order Reference: {data['purchase_order_ref']}")
    
    # Notes
    if 'notes' in data:
        y -= 1.5*cm
        c.drawString(2*cm, y, "Notes:")
        c.drawString(2*cm, y - 0.5*cm, data['notes'])
    
    # Footer
    c.setFont("Helvetica", 8)
    c.drawString(2*cm, 1*cm, "This is a sample invoice generated for Factur-X testing purposes.")
    
    c.save()
    print(f"Sample invoice PDF created at: {output_pdf}")
    return True

def main():
    parser = argparse.ArgumentParser(description="Create a sample PDF invoice")
    parser.add_argument("json_file", help="Path to JSON file with invoice data")
    parser.add_argument("--output", "-o", help="Path to output PDF file (default: sample_invoice.pdf)")
    
    args = parser.parse_args()
    
    json_file = args.json_file
    output_pdf = args.output or "sample_invoice.pdf"
    
    create_sample_invoice(json_file, output_pdf)

if __name__ == "__main__":
    main()