#!/usr/bin/env python3
"""
Create a sample invoice PDF for testing Factur-X embedding
"""

import json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

def create_invoice_pdf(json_file, output_pdf):
    """Create a sample invoice PDF from JSON data"""
    # Load invoice data from JSON
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    # Extract data
    invoice = data['invoice']
    seller = data['seller']
    buyer = data['buyer']
    items = data['items']
    totals = data['totals']
    payment = data['payment']
    
    # Setup document
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    subtitle_style = styles['Heading2']
    normal_style = styles['Normal']
    
    # Custom styles
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Heading3'],
        textColor=colors.darkblue,
        spaceAfter=12
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.white
    )
    
    # Content elements
    elements = []
    
    # Title
    elements.append(Paragraph(f"INVOICE {invoice['number']}", title_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Seller and Buyer info
    data = [
        [Paragraph("<b>SELLER</b>", normal_style), Paragraph("<b>BUYER</b>", normal_style)],
        [Paragraph(seller['name'], normal_style), Paragraph(buyer['name'], normal_style)],
        [Paragraph(seller['address'], normal_style), Paragraph(buyer['address'], normal_style)],
        [Paragraph(f"{seller['zip']} {seller['city']}", normal_style), 
         Paragraph(f"{buyer['zip']} {buyer['city']}", normal_style)],
        [Paragraph(f"VAT ID: {seller['taxID']}", normal_style), 
         Paragraph(f"VAT ID: {buyer['taxID']}", normal_style)],
        [Paragraph(f"Email: {seller['email']}", normal_style), 
         Paragraph(f"Email: {buyer['email']}", normal_style)]
    ]
    
    address_table = Table(data, colWidths=[8*cm, 8*cm])
    address_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.white),
    ]))
    elements.append(address_table)
    elements.append(Spacer(1, 1*cm))
    
    # Invoice info
    invoice_info = [
        [Paragraph("<b>Invoice Date:</b>", normal_style), Paragraph(invoice['date'], normal_style)],
        [Paragraph("<b>Due Date:</b>", normal_style), Paragraph(invoice['dueDate'], normal_style)],
        [Paragraph("<b>Payment Reference:</b>", normal_style), Paragraph(payment['reference'], normal_style)]
    ]
    
    info_table = Table(invoice_info, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 1*cm))
    
    # Items
    elements.append(Paragraph("ITEMS", header_style))
    
    # Table header
    item_data = [
        [
            Paragraph("Description", table_header_style),
            Paragraph("Quantity", table_header_style),
            Paragraph("Unit", table_header_style),
            Paragraph("Unit Price", table_header_style),
            Paragraph("VAT %", table_header_style),
            Paragraph("Total", table_header_style)
        ]
    ]
    
    # Table rows
    for item in items:
        total = item['quantity'] * item['unitPrice']
        item_data.append([
            Paragraph(f"{item['name']}<br/><i>{item['note']}</i>", normal_style),
            Paragraph(str(item['quantity']), normal_style),
            Paragraph(item['unit'], normal_style),
            Paragraph(f"{item['unitPrice']:.2f} {invoice['currency']}", normal_style),
            Paragraph(f"{item['vatPercent']:.0f}%", normal_style),
            Paragraph(f"{total:.2f} {invoice['currency']}", normal_style)
        ])
    
    # Totals
    item_data.append([
        Paragraph("<b>Total Net Amount</b>", normal_style),
        "", "", "", "",
        Paragraph(f"<b>{totals['netAmount']:.2f} {invoice['currency']}</b>", normal_style)
    ])
    
    item_data.append([
        Paragraph("<b>VAT Amount</b>", normal_style),
        "", "", "", "",
        Paragraph(f"<b>{totals['vatAmount']:.2f} {invoice['currency']}</b>", normal_style)
    ])
    
    item_data.append([
        Paragraph("<b>Grand Total</b>", normal_style),
        "", "", "", "",
        Paragraph(f"<b>{totals['grandTotal']:.2f} {invoice['currency']}</b>", normal_style)
    ])
    
    # Create table
    items_table = Table(item_data, colWidths=[6*cm, 2*cm, 2*cm, 3*cm, 2*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('BACKGROUND', (0, -3), (-1, -1), colors.lightgrey),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 1*cm))
    
    # Payment info
    elements.append(Paragraph("PAYMENT INFORMATION", header_style))
    payment_info = [
        [Paragraph("<b>IBAN:</b>", normal_style), Paragraph(payment['iban'], normal_style)],
        [Paragraph("<b>BIC/SWIFT:</b>", normal_style), Paragraph(payment['bic'], normal_style)],
        [Paragraph("<b>Reference:</b>", normal_style), Paragraph(payment['reference'], normal_style)]
    ]
    
    payment_table = Table(payment_info, colWidths=[4*cm, 12*cm])
    payment_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 1*cm))
    
    # Footer note
    elements.append(Paragraph(invoice['comment'], normal_style))
    
    # Build document
    doc.build(elements)
    
    return True

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python create_test_invoice_pdf.py <json_file> <output_pdf>")
        sys.exit(1)
    
    json_file = sys.argv[1]
    output_pdf = sys.argv[2]
    
    if create_invoice_pdf(json_file, output_pdf):
        print(f"Invoice PDF created successfully: {output_pdf}")
    else:
        print("Failed to create invoice PDF")
        sys.exit(1)