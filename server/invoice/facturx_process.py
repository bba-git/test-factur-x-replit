#!/usr/bin/env python3
import sys
import json
import os
from pathlib import Path
import logging
import datetime
import hashlib
import subprocess
import shlex
import pikepdf
from pikepdf import Pdf, Dictionary, Name, Array
import xml.etree.ElementTree as ET

# Configure logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def convert_to_pdfa3(input_pdf: str, output_pdf: str) -> bool:
    """
    Convert PDF to PDF/A-3 using Ghostscript and proper sRGB ICC profile
    """
    try:
        logger.info(f"Converting {input_pdf} to PDF/A-3")

        # Use the system sRGB profile
        icc_profile = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"
        if not os.path.exists(icc_profile):
            logger.error(f"ICC profile not found at {icc_profile}")
            return False

        logger.info(f"Using ICC profile: {icc_profile}")

        gs_command = [
            "gs",
            "-dPDFA=3",
            "-dBATCH",
            "-dNOPAUSE",
            "-dQUIET",
            "-sDEVICE=pdfwrite",
            "-dPDFACompatibilityPolicy=1",
            "-dProcessColorModel=/DeviceRGB",
            "-dColorConversionStrategy=/sRGB",
            "-dColorConversionStrategyForImages=/sRGB",
            "-sOutputConditionIdentifier=sRGB IEC61966-2.1",
            "-sOutputCondition=sRGB IEC61966-2.1",
            "-sPDFAOutputConditionIdentifier=sRGB IEC61966-2.1",
            f"-sICCProfile={icc_profile}",
            f"-sOutputFile={output_pdf}",
            input_pdf
        ]

        result = subprocess.run(gs_command, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error("Ghostscript command failed")
            logger.error("stdout: " + result.stdout)
            logger.error("stderr: " + result.stderr)
            return False

        if not os.path.exists(output_pdf):
            logger.error("Output PDF file was not created")
            return False

        logger.info(f"PDF/A-3 successfully created: {output_pdf}")
        return True

    except Exception as e:
        logger.exception("Unexpected error during PDF/A-3 conversion")
        return False

def embed_xml_in_pdf(pdf_path, xml_content, invoice_number):
    """Embed XML content into PDF/A-3 file with proper XMP metadata."""
    try:
        logger.info(f"Embedding XML into {pdf_path}")
        
        # Open the PDF with overwriting allowed
        pdf = Pdf.open(pdf_path, allow_overwriting_input=True)
        
        # Read ICC profile
        icc_profile = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"
        if not os.path.exists(icc_profile):
            logger.error(f"ICC profile not found at {icc_profile}")
            return False
            
        with open(icc_profile, 'rb') as f:
            icc_data = f.read()
        
        # Create output intent with ICC profile
        output_intent = pdf.make_stream(icc_data)
        output_intent.Type = Name.OutputIntent
        output_intent.S = Name.GTS_PDFA1
        output_intent.OutputConditionIdentifier = "sRGB IEC61966-2.1"
        output_intent.Info = "sRGB IEC61966-2.1"
        output_intent.RegistryName = "http://www.color.org"
        
        # Add output intent to PDF catalog
        if Name.OutputIntents not in pdf.Root:
            pdf.Root[Name.OutputIntents] = Array()
        pdf.Root[Name.OutputIntents].append(pdf.make_indirect(output_intent))

        # Set up DefaultRGB color space
        if Name.Resources not in pdf.Root:
            pdf.Root[Name.Resources] = Dictionary()
        
        if Name.ColorSpace not in pdf.Root[Name.Resources]:
            pdf.Root[Name.Resources][Name.ColorSpace] = Dictionary()
        
        # Create ICCBased color space for RGB
        icc_stream = pdf.make_stream(icc_data)
        icc_stream.N = 3  # Number of color components (RGB)
        icc_stream.Alternate = Name.DeviceRGB
        
        # Add ICCBased color space as DefaultRGB
        pdf.Root[Name.Resources][Name.ColorSpace][Name.DefaultRGB] = Array([Name.ICCBased, pdf.make_indirect(icc_stream)])

        # Create ICCBased color space for Gray
        gray_icc_stream = pdf.make_stream(icc_data)
        gray_icc_stream.N = 1  # Number of color components (Gray)
        gray_icc_stream.Alternate = Name.DeviceGray

        # Add DefaultGray to each page
        for page in pdf.pages:
            resources = page.get('/Resources', Dictionary())
            if Name.ColorSpace not in resources:
                resources[Name.ColorSpace] = Dictionary()
            resources[Name.ColorSpace][Name.DefaultGray] = Array([
                Name.ICCBased,
                pdf.make_indirect(gray_icc_stream)
            ])
            page[Name.Resources] = resources
        
        # Create XML stream
        xml_stream = pdf.make_stream(xml_content.encode('utf-8'))
        xml_stream.Type = Name.EmbeddedFile
        xml_stream.Subtype = "application/xml"
        
        # Create file specification
        filespec = Dictionary()
        filespec.Type = Name.Filespec
        filespec.F = "factur-x.xml"
        filespec.UF = "factur-x.xml"
        filespec.AFRelationship = Name.Alternative
        filespec.Desc = "Factur-X Invoice"
        
        # Add file to filespec
        ef_dict = Dictionary()
        ef_dict.F = xml_stream
        filespec.EF = ef_dict
        
        # Add to root AF array
        if Name.AF not in pdf.Root:
            pdf.Root[Name.AF] = Array()
        pdf.Root[Name.AF].append(pdf.make_indirect(filespec))
        
        # Add to Names tree
        if Name.Names not in pdf.Root:
            pdf.Root[Name.Names] = Dictionary()
        
        if Name.EmbeddedFiles not in pdf.Root[Name.Names]:
            pdf.Root[Name.Names][Name.EmbeddedFiles] = Dictionary()
        
        efDict = pdf.Root[Name.Names][Name.EmbeddedFiles]
        
        if Name.Names not in efDict:
            efDict[Name.Names] = Array()
        
        # Add to names array
        efDict[Name.Names].append("factur-x.xml")
        efDict[Name.Names].append(pdf.make_indirect(filespec))
        
        # Add XMP metadata
        xmp_metadata = generateXMPMetadata(xml_content, invoice_number)
        xmp_stream = pdf.make_stream(xmp_metadata.encode('utf-8'))
        xmp_stream.Type = Name.Metadata
        xmp_stream.Subtype = "application/rdf+xml"
        
        # Add XMP metadata
        pdf.Root.Metadata = xmp_stream
        
        # Save the modified PDF
        pdf.save(pdf_path)
        logger.info(f"Successfully embedded XML and saved to {pdf_path}")

        # Validate DefaultGray color space
        validation_pdf = Pdf.open(pdf_path)
        for i, page in enumerate(validation_pdf.pages):
            resources = page.get('/Resources', {})
            colorspace = resources.get('/ColorSpace', {})
            default_gray = colorspace.get('/DefaultGray', None)
            
            if default_gray is None:
                logger.error(f"Page {i+1}: DefaultGray color space not found")
                return False
                
            if not isinstance(default_gray, Array) or len(default_gray) != 2:
                logger.error(f"Page {i+1}: DefaultGray is not a valid ICCBased array")
                return False
                
            if default_gray[0] != Name.ICCBased:
                logger.error(f"Page {i+1}: DefaultGray is not ICCBased")
                return False
                
            logger.info(f"Page {i+1}: DefaultGray color space validated successfully")
            
        logger.info("All pages validated successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error embedding XML: {str(e)}")
        return False

def generate_facturx_xml(invoice_data):
    """Generate Factur-X XML content from invoice data."""
    # Create root element with namespaces
    root = ET.Element('rsm:CrossIndustryInvoice', {
        'xmlns:rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
        'xmlns:ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
        'xmlns:udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
        'xmlns:qdt': 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100'
    })

    # Add document context
    context = ET.SubElement(root, 'rsm:ExchangedDocumentContext')
    guideline = ET.SubElement(context, 'ram:GuidelineSpecifiedDocumentContextParameter')
    ET.SubElement(guideline, 'ram:ID').text = 'EN16931'

    # Add document info
    doc = ET.SubElement(root, 'rsm:ExchangedDocument')
    ET.SubElement(doc, 'ram:ID').text = invoice_data.get('invoice_number', '')
    ET.SubElement(doc, 'ram:TypeCode').text = '380'  # Invoice
    issue_date = ET.SubElement(doc, 'ram:IssueDateTime')
    ET.SubElement(issue_date, 'udt:DateTimeString', {'format': '102'}).text = invoice_data.get('issue_date', '').replace('-', '')

    # Create transaction
    transaction = ET.SubElement(root, 'rsm:SupplyChainTradeTransaction')

    # 1. Line Items (MUST come first)
    for item in invoice_data.get('line_items', []):
        line_item = ET.SubElement(transaction, 'ram:IncludedSupplyChainTradeLineItem')
        
        # Line document
        doc_line = ET.SubElement(line_item, 'ram:AssociatedDocumentLineDocument')
        ET.SubElement(doc_line, 'ram:LineID').text = str(item.get('line_id', ''))
        
        # Product
        product = ET.SubElement(line_item, 'ram:SpecifiedTradeProduct')
        ET.SubElement(product, 'ram:Name').text = item.get('description', '')
        
        # Agreement
        agreement = ET.SubElement(line_item, 'ram:SpecifiedLineTradeAgreement')
        price = ET.SubElement(agreement, 'ram:GrossPriceProductTradePrice')
        ET.SubElement(price, 'ram:ChargeAmount').text = str(item.get('unit_price', 0))
        
        # Delivery
        delivery = ET.SubElement(line_item, 'ram:SpecifiedLineTradeDelivery')
        ET.SubElement(delivery, 'ram:BilledQuantity', {'unitCode': 'C62'}).text = str(item.get('quantity', 0))
        
        # Settlement
        settlement = ET.SubElement(line_item, 'ram:SpecifiedLineTradeSettlement')
        tax = ET.SubElement(settlement, 'ram:ApplicableTradeTax')
        ET.SubElement(tax, 'ram:CategoryCode').text = 'S'  # Standard rate
        ET.SubElement(tax, 'ram:RateApplicablePercent').text = str(item.get('vat_rate', 0))
        summation = ET.SubElement(settlement, 'ram:SpecifiedTradeSettlementLineMonetarySummation')
        ET.SubElement(summation, 'ram:LineTotalAmount').text = str(item.get('line_total', 0))

    # 2. Header Agreement
    header_agreement = ET.SubElement(transaction, 'ram:ApplicableHeaderTradeAgreement')
    
    # Seller
    seller = ET.SubElement(header_agreement, 'ram:SellerTradeParty')
    ET.SubElement(seller, 'ram:Name').text = invoice_data.get('seller_name', '')
    seller_address = ET.SubElement(seller, 'ram:PostalTradeAddress')
    ET.SubElement(seller_address, 'ram:PostcodeCode').text = invoice_data.get('seller_postcode', '')
    ET.SubElement(seller_address, 'ram:LineOne').text = invoice_data.get('seller_address', '')
    ET.SubElement(seller_address, 'ram:CityName').text = invoice_data.get('seller_city', '')
    ET.SubElement(seller_address, 'ram:CountryID').text = 'FR'  # ISO 3166-1 alpha-2
    
    # Buyer
    buyer = ET.SubElement(header_agreement, 'ram:BuyerTradeParty')
    ET.SubElement(buyer, 'ram:Name').text = invoice_data.get('buyer_name', '')
    buyer_address = ET.SubElement(buyer, 'ram:PostalTradeAddress')
    ET.SubElement(buyer_address, 'ram:PostcodeCode').text = invoice_data.get('buyer_postcode', '')
    ET.SubElement(buyer_address, 'ram:LineOne').text = invoice_data.get('buyer_address', '')
    ET.SubElement(buyer_address, 'ram:CityName').text = invoice_data.get('buyer_city', '')
    ET.SubElement(buyer_address, 'ram:CountryID').text = 'FR'  # ISO 3166-1 alpha-2

    # 3. Header Delivery
    header_delivery = ET.SubElement(transaction, 'ram:ApplicableHeaderTradeDelivery')
    delivery_date = ET.SubElement(header_delivery, 'ram:ActualDeliverySupplyChainEvent')
    ET.SubElement(delivery_date, 'ram:OccurrenceDateTime').text = invoice_data.get('delivery_date', '')

    # 4. Header Settlement
    header_settlement = ET.SubElement(transaction, 'ram:ApplicableHeaderTradeSettlement')
    ET.SubElement(header_settlement, 'ram:InvoiceCurrencyCode').text = 'EUR'
    
    # Tax
    tax = ET.SubElement(header_settlement, 'ram:ApplicableTradeTax')
    ET.SubElement(tax, 'ram:CategoryCode').text = 'S'  # Standard rate
    ET.SubElement(tax, 'ram:RateApplicablePercent').text = str(invoice_data.get('vat_rate', 0))
    
    # Totals
    summation = ET.SubElement(header_settlement, 'ram:SpecifiedTradeSettlementHeaderMonetarySummation')
    ET.SubElement(summation, 'ram:LineTotalAmount').text = str(invoice_data.get('net_amount', 0))
    ET.SubElement(summation, 'ram:GrandTotalAmount').text = str(invoice_data.get('total_amount', 0))

    # Convert to string with proper formatting
    xml_str = ET.tostring(root, encoding='unicode', method='xml')
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_str}'

def generateXMPMetadata(xml_content: str, invoice_number: str) -> str:
    """Generate XMP metadata for a Factur-X invoice."""
    # Calculate MD5 hash of XML content
    xml_hash = hashlib.md5(xml_content.encode('utf-8')).hexdigest()
    
    # Get current timestamp
    timestamp = datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    
    # Generate XMP metadata
    xmp_metadata = f'''<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
<pdfaid:part>3</pdfaid:part>
<pdfaid:conformance>B</pdfaid:conformance>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
<pdf:Producer>Factur-X Generator</pdf:Producer>
<pdf:Keywords>Factur-X, Invoice, {invoice_number}</pdf:Keywords>
<pdf:ModDate>{timestamp}</pdf:ModDate>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:fx="http://www.factur-x.eu/2017/1.0.7">
<fx:ConformanceLevel>EN16931</fx:ConformanceLevel>
<fx:DocumentType>INVOICE</fx:DocumentType>
<fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
<fx:Version>1.0.7</fx:Version>
<fx:DocumentHash>{xml_hash}</fx:DocumentHash>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''
    
    return xmp_metadata

def main():
    if len(sys.argv) != 4:
        logger.error("Usage: python3 facturx_process.py <input_pdf> <input_json> <output_pdf>")
        sys.exit(1)

    input_pdf = sys.argv[1]
    input_json = sys.argv[2]
    output_pdf = sys.argv[3]

    logger.info(f"Processing invoice: {input_pdf}")
    logger.info(f"JSON data: {input_json}")
    logger.info(f"Output PDF: {output_pdf}")

    # Read JSON data
    try:
        with open(input_json, 'r') as f:
            json_data = json.load(f)
    except Exception as e:
        logger.error(f"Error reading JSON file: {e}")
        sys.exit(1)

    # Extract XML content from JSON
    xml_content = json_data.get('xml', '')

    # Convert to PDF/A-3
    if not convert_to_pdfa3(input_pdf, output_pdf):
        logger.error("Failed to convert to PDF/A-3")
        sys.exit(1)

    # Embed XML
    invoice_number = json_data.get('invoice_number', '')
    if not embed_xml_in_pdf(output_pdf, xml_content, invoice_number):
        logger.error("Failed to embed XML")
        sys.exit(1)

    logger.info("Successfully processed invoice")

if __name__ == "__main__":
    main() 
