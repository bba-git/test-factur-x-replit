#!/usr/bin/env python3
"""
Factur-X Invoice Creator

This script automates the process of creating a Factur-X (EN16931) compliant invoice in PDF/A-3B format.
Steps:
1. Convert a regular PDF to PDF/A-3B
2. Generate Factur-X XML from JSON invoice data
3. Embed the XML into the PDF/A-3B file
4. Validate the final PDF for compliance
"""

import os
import sys
import json
import tempfile
import logging
from pathlib import Path
import pikepdf
from pikepdf import Pdf, Dictionary, Name, Array

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_to_pdfa3b(input_pdf: str, output_pdf: str) -> bool:
    """
    Convert a regular PDF to PDF/A-3B using Ghostscript
    
    Args:
        input_pdf (str): Path to the input PDF file
        output_pdf (str): Path where the PDF/A-3B compliant file will be saved
    """
    logger.info(f"Converting {input_pdf} to PDF/A-3B format...")
    
    # Ghostscript command for PDF/A-3B conversion
    gs_command = [
        "gs", "-dPDFA=3", "-dBATCH", "-dNOPAUSE", "-dNOOUTERSAVE",
        "-sProcessColorModel=DeviceRGB", "-sDEVICE=pdfwrite",
        "-dPDFACompatibilityPolicy=1", "-sOutputFile=" + output_pdf,
        input_pdf
    ]
    
    try:
        import subprocess
        result = subprocess.run(gs_command, check=True, capture_output=True, text=True)
        logger.info(f"Successfully converted to PDF/A-3B: {output_pdf}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Error converting to PDF/A-3B: {e}")
        logger.error(f"Ghostscript output: {e.stdout}")
        logger.error(f"Ghostscript error: {e.stderr}")
        return False

def generate_facturx_xml(json_data: dict) -> str:
    """
    Generate Factur-X XML from JSON data
    
    Args:
        json_data (dict): Invoice data in JSON format
        
    Returns:
        str: Factur-X XML content
    """
    logger.info("Generating Factur-X XML...")
    
    invoice = json_data['invoice']
    
    # Basic XML template for Factur-X
    xml_template = f'''<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
    xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:factur-x:pdfa:EN16931:2017:compliant</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    <rsm:ExchangedDocument>
        <ram:ID>{invoice['number']}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">{invoice['date'].replace('-', '')}</udt:DateTimeString>
        </ram:IssueDateTime>
    </rsm:ExchangedDocument>
    <rsm:SupplyChainTradeTransaction>
        <ram:IncludedSupplyChainTradeLineItem>
            {''.join(f'''
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>{i+1}</ram:LineID>
                <ram:IncludedNote>
                    <ram:Content>{item['description']}</ram:Content>
                </ram:IncludedNote>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>{item['description']}</ram:Name>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>{item['unitPrice']}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity>{item['quantity']}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>VAT</ram:TypeCode>
                    <ram:CategoryCode>S</ram:CategoryCode>
                    <ram:RateApplicablePercent>{item['vatRate']}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>{item['lineTotal']}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>''' for i, item in enumerate(invoice['items']))}
        </ram:IncludedSupplyChainTradeLineItem>
        <ram:ApplicableHeaderTradeAgreement>
            <ram:SellerTradeParty>
                <ram:Name>Your Company Name</ram:Name>
            </ram:SellerTradeParty>
            <ram:BuyerTradeParty>
                <ram:Name>Customer Name</ram:Name>
            </ram:BuyerTradeParty>
        </ram:ApplicableHeaderTradeAgreement>
        <ram:ApplicableHeaderTradeSettlement>
            <ram:InvoiceCurrencyCode>{invoice['currency']}</ram:InvoiceCurrencyCode>
            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                <ram:LineTotalAmount>{invoice['total']}</ram:LineTotalAmount>
                <ram:TaxBasisTotalAmount>{invoice['total']}</ram:TaxBasisTotalAmount>
                <ram:TaxTotalAmount>0</ram:TaxTotalAmount>
                <ram:GrandTotalAmount>{invoice['total']}</ram:GrandTotalAmount>
            </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        </ram:ApplicableHeaderTradeSettlement>
    </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>'''
    
    return xml_template

def embed_xml_in_pdf(pdf_path: str, xml_content: str) -> bool:
    """
    Embed XML into PDF using pikepdf
    
    Args:
        pdf_path (str): Path to the PDF file
        xml_content (str): XML content to embed
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        logger.info(f"Embedding XML into {pdf_path}")
        
        # Open the PDF
        pdf = Pdf.open(pdf_path)
        
        # Create embedded file
        xml_stream = pdf.make_stream(xml_content.encode('utf-8'))
        xml_stream_dict = Dictionary()
        xml_stream_dict[Name.Type] = Name.EmbeddedFile
        xml_stream_dict[Name.Subtype] = "application/xml"
        
        # Create filespec
        filespec = Dictionary()
        filespec[Name.Type] = Name.Filespec
        filespec[Name.F] = "factur-x.xml"
        filespec[Name.UF] = "factur-x.xml"
        filespec[Name.AFRelationship] = Name.Data
        filespec[Name.Desc] = "Factur-X Invoice Data"
        
        # Add file to filespec
        ef_dict = Dictionary()
        ef_dict[Name.F] = xml_stream
        filespec[Name.EF] = ef_dict
        
        # Add to root AF array
        if Name.AF not in pdf.Root:
            pdf.Root[Name.AF] = Array()
        
        # Make the filespec indirect before adding it
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
        xmp = pdf.make_stream(f'''<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      pdfaid:part="3"
      pdfaid:conformance="B"/>
    <rdf:Description rdf:about=""
      xmlns:zf="urn:ferd:pdfa:CrossIndustryDocument:invoice:2p0#"
      zf:DocumentType="INVOICE"
      zf:DocumentFileName="factur-x.xml"
      zf:Version="2p0"
      zf:ConformanceLevel="EN16931"/>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''.encode('utf-8'))
        
        if '/Metadata' not in pdf.Root:
            pdf.Root.Metadata = xmp
        
        # Save the modified PDF
        pdf.save(pdf_path)
        logger.info(f"Successfully embedded XML and saved to {pdf_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error embedding XML: {e}")
        return False

def validate_facturx_pdf(pdf_path: str) -> tuple[bool, str]:
    """
    Validate if a PDF is Factur-X compliant
    
    Args:
        pdf_path (str): Path to the PDF file to validate
        
    Returns:
        tuple[bool, str]: (is_valid, error_message)
    """
    try:
        logger.info(f"Validating Factur-X PDF: {pdf_path}")
        
        # 1. Check PDF/A-3B compliance using Ghostscript
        gs_command = [
            "gs", "-dPDFA=3", "-dBATCH", "-dNOPAUSE", "-dQUIET",
            "-sDEVICE=pdfwrite", "-dPDFACompatibilityPolicy=1",
            "-dPDFAValidation=1", "-sPDFAValidationProfile=PDF/A-3B",
            "-sOutputFile=/dev/null", pdf_path
        ]
        
        try:
            import subprocess
            result = subprocess.run(gs_command, capture_output=True, text=True)
            if result.returncode != 0:
                return False, f"PDF/A-3B validation failed: {result.stderr}"
        except subprocess.CalledProcessError as e:
            return False, f"PDF/A-3B validation error: {e.stderr}"
        
        # 2. Check XML embedding and XMP metadata using pikepdf
        try:
            pdf = Pdf.open(pdf_path)
            
            # Check for embedded XML
            has_xml = False
            if Name.AF in pdf.Root:
                for af in pdf.Root[Name.AF]:
                    if (af.get(Name.Type) == Name.Filespec and 
                        af.get(Name.F) == "factur-x.xml"):
                        has_xml = True
                        break
            
            if not has_xml:
                return False, "Factur-X XML not found in PDF"
            
            # Check XMP metadata
            has_metadata = False
            if '/Metadata' in pdf.Root:
                metadata = pdf.Root['/Metadata'].read_bytes().decode('utf-8')
                required_metadata = [
                    'pdfaid:part="3"',
                    'pdfaid:conformance="B"',
                    'zf:DocumentType="INVOICE"',
                    'zf:DocumentFileName="factur-x.xml"',
                    'zf:Version="2p0"',
                    'zf:ConformanceLevel="EN16931"'
                ]
                
                has_metadata = all(meta in metadata for meta in required_metadata)
            
            if not has_metadata:
                return False, "Missing required Factur-X XMP metadata"
            
            return True, "PDF is Factur-X compliant"
            
        except Exception as e:
            return False, f"Error validating PDF structure: {str(e)}"
            
    except Exception as e:
        return False, f"Validation error: {str(e)}"

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

    # Generate XML
    xml_content = generate_facturx_xml(json_data)
    if not xml_content:
        logger.error("Failed to generate XML")
        sys.exit(1)

    # Convert to PDF/A-3
    if not convert_to_pdfa3b(input_pdf, output_pdf):
        logger.error("Failed to convert to PDF/A-3")
        sys.exit(1)

    # Embed XML
    if not embed_xml_in_pdf(output_pdf, xml_content):
        logger.error("Failed to embed XML")
        sys.exit(1)

    # Validate Factur-X compliance
    is_valid, message = validate_facturx_pdf(output_pdf)
    if not is_valid:
        logger.error(f"Factur-X validation failed: {message}")
        sys.exit(1)
    
    logger.info("Successfully processed and validated Factur-X invoice")
    sys.exit(0)

if __name__ == "__main__":
    main() 