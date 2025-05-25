#!/usr/bin/env python3
import sys
import json
import os
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def convert_to_pdfa3(input_pdf: str, output_pdf: str) -> bool:
    """
    Convert PDF to PDF/A-3 using Ghostscript
    """
    try:
        logger.info(f"Converting {input_pdf} to PDF/A-3")
        # Ghostscript command for PDF/A-3 conversion
        cmd = f"gs -dPDFA=3 -dBATCH -dNOPAUSE -sProcessColorModel=DeviceRGB -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile={output_pdf} {input_pdf}"
        os.system(cmd)
        return os.path.exists(output_pdf)
    except Exception as e:
        logger.error(f"Error converting to PDF/A-3: {e}")
        return False

def generate_facturx_xml(json_data: dict) -> str:
    """
    Generate Factur-X XML from JSON data
    """
    try:
        logger.info("Generating Factur-X XML")
        # Basic XML template
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    <rsm:ExchangedDocument>
        <ram:ID>{json_data['invoice']['number']}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">{json_data['invoice']['date']}</udt:DateTimeString>
        </ram:IssueDateTime>
    </rsm:ExchangedDocument>
    <rsm:SupplyChainTradeTransaction>
        <ram:IncludedSupplyChainTradeLineItem>
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>1</ram:LineID>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>{json_data['invoice']['items'][0]['description']}</ram:Name>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>{json_data['invoice']['items'][0]['unitPrice']}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity unitCode="EA">{json_data['invoice']['items'][0]['quantity']}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>VAT</ram:TypeCode>
                    <ram:CategoryCode>S</ram:CategoryCode>
                    <ram:RateApplicablePercent>{json_data['invoice']['items'][0]['vatRate']}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>{json_data['invoice']['items'][0]['lineTotal']}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>
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
            <ram:InvoiceCurrencyCode>{json_data['invoice']['currency']}</ram:InvoiceCurrencyCode>
            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                <ram:LineTotalAmount>{json_data['invoice']['total']}</ram:LineTotalAmount>
                <ram:TaxBasisTotalAmount>{json_data['invoice']['total']}</ram:TaxBasisTotalAmount>
                <ram:TaxTotalAmount>0</ram:TaxTotalAmount>
                <ram:GrandTotalAmount>{json_data['invoice']['total']}</ram:GrandTotalAmount>
            </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        </ram:ApplicableHeaderTradeSettlement>
    </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>"""
        return xml
    except Exception as e:
        logger.error(f"Error generating Factur-X XML: {e}")
        return ""

def embed_xml_in_pdf(pdf_path: str, xml_content: str) -> bool:
    """
    Embed XML into PDF using PyPDF2
    """
    try:
        logger.info(f"Embedding XML into {pdf_path}")
        from PyPDF2 import PdfReader, PdfWriter
        from PyPDF2.generic import NameObject, DictionaryObject, ArrayObject, createStringObject

        # Read the PDF
        reader = PdfReader(pdf_path)
        writer = PdfWriter()

        # Copy all pages
        for page in reader.pages:
            writer.add_page(page)

        # Create the XML attachment
        xml_file = DictionaryObject()
        xml_file.update({
            NameObject('/Type'): NameObject('/Filespec'),
            NameObject('/F'): createStringObject('factur-x.xml'),
            NameObject('/EF'): DictionaryObject({
                NameObject('/F'): createStringObject(xml_content)
            })
        })

        # Add the XML to the PDF
        writer._root_object.update({
            NameObject('/Names'): DictionaryObject({
                NameObject('/EmbeddedFiles'): DictionaryObject({
                    NameObject('/Names'): ArrayObject([
                        createStringObject('factur-x.xml'),
                        xml_file
                    ])
                })
            })
        })

        # Save the modified PDF
        with open(pdf_path, 'wb') as output_file:
            writer.write(output_file)

        return True
    except Exception as e:
        logger.error(f"Error embedding XML: {e}")
        return False

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
    if not convert_to_pdfa3(input_pdf, output_pdf):
        logger.error("Failed to convert to PDF/A-3")
        sys.exit(1)

    # Embed XML
    if not embed_xml_in_pdf(output_pdf, xml_content):
        logger.error("Failed to embed XML")
        sys.exit(1)

    logger.info("Successfully processed invoice")
    sys.exit(0)

if __name__ == "__main__":
    main() 