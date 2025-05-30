#!/usr/bin/env python3
import sys
import json
import os
from pathlib import Path
import logging
import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def convert_to_pdfa3(input_pdf: str, output_pdf: str) -> bool:
    """
    Convert PDF to PDF/A-3 using Ghostscript
    """
    try:
        logger.info(f"Converting {input_pdf} to PDF/A-3")
        # Ghostscript command for PDF/A-3 conversion with proper metadata
        cmd = (
            f"gs -dPDFA=3 -dBATCH -dNOPAUSE "
            f"-sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 "
            f"-dProcessColorModel=/DeviceRGB "
            f"-dColorConversionStrategy=/sRGB "
            f"-sColorConversionStrategyForImages=/sRGB "
            f"-sPDFAOutputConditionIdentifier=sRGB "
            f"-sOutputCondition=\"sRGB\" "
            f"-sICCProfile=/usr/share/color/icc/sRGB.icc "
            f"-sOutputFile={output_pdf} {input_pdf}"
        )
        os.system(cmd)
        return os.path.exists(output_pdf)
    except Exception as e:
        logger.error(f"Error converting to PDF/A-3: {e}")
        return False

def embed_xml_in_pdf(pdf_path: str, xml_content: str) -> bool:
    """
    Embed XML into PDF using PyPDF2
    """
    try:
        logger.info(f"Embedding XML into {pdf_path}")
        from PyPDF2 import PdfReader, PdfWriter
        from PyPDF2.generic import NameObject, DictionaryObject, ArrayObject, create_string_object, StreamObject

        # Read the PDF
        reader = PdfReader(pdf_path)
        writer = PdfWriter()

        # Copy all pages
        for page in reader.pages:
            writer.add_page(page)

        # Create the XML attachment with proper file specification
        xml_file = DictionaryObject()
        xml_file.update({
            NameObject('/Type'): NameObject('/Filespec'),
            NameObject('/F'): create_string_object('factur-x.xml'),
            NameObject('/UF'): create_string_object('factur-x.xml'),
            NameObject('/EF'): DictionaryObject({
                NameObject('/F'): create_string_object(xml_content)
            })
        })

        # Add the XML to the PDF with proper structure
        if '/Names' not in writer._root_object:
            writer._root_object.update({
                NameObject('/Names'): DictionaryObject()
            })

        if '/EmbeddedFiles' not in writer._root_object['/Names']:
            writer._root_object['/Names'].update({
                NameObject('/EmbeddedFiles'): DictionaryObject({
                    NameObject('/Names'): ArrayObject()
                })
            })

        # Add the XML file to the EmbeddedFiles array
        writer._root_object['/Names']['/EmbeddedFiles']['/Names'].append(create_string_object('factur-x.xml'))
        writer._root_object['/Names']['/EmbeddedFiles']['/Names'].append(xml_file)

        # Generate XMP metadata
        now = datetime.datetime.utcnow().isoformat() + "Z"
        xmp_metadata = f"""<?xpacket begin='' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x='adobe:ns:meta/'>
  <rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>
    <rdf:Description rdf:about=''
      xmlns:pdfaid='http://www.aiim.org/pdfa/ns/id/'
      xmlns:dc='http://purl.org/dc/elements/1.1/'
      xmlns:xmp='http://ns.adobe.com/xap/1.0/'
      xmlns:pdf='http://ns.adobe.com/pdf/1.3/'>
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Factur-X Invoice</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>Factur-X Generator</rdf:li></rdf:Seq></dc:creator>
      <xmp:CreateDate>{now}</xmp:CreateDate>
      <xmp:ModifyDate>{now}</xmp:ModifyDate>
      <xmp:MetadataDate>{now}</xmp:MetadataDate>
      <xmp:CreatorTool>Factur-X Generator</xmp:CreatorTool>
      <pdf:Producer>Factur-X Generator</pdf:Producer>
      <pdf:Keywords>Factur-X, Invoice, PDF/A-3</pdf:Keywords>
    </rdf:Description>
    <rdf:Description rdf:about=''
      xmlns:zf='urn:ferd:pdfa:CrossIndustryDocument:invoice:2p0#'
      zf:DocumentType='INVOICE'
      zf:DocumentFileName='factur-x.xml'
      zf:Version='2p0'
      zf:ConformanceLevel='EN16931'/>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end='w'?>"""

        # Create XMP metadata stream
        xmp_stream = StreamObject()
        xmp_stream._data = xmp_metadata.encode('utf-8')
        xmp_stream.update({
            NameObject('/Type'): NameObject('/Metadata'),
            NameObject('/Subtype'): NameObject('/XML'),
        })

        # Add metadata to the PDF
        metadata_ref = writer._add_object(xmp_stream)
        writer._root_object.update({
            NameObject('/Metadata'): metadata_ref
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

    # Convert to PDF/A-3
    if not convert_to_pdfa3(input_pdf, output_pdf):
        logger.error("Failed to convert to PDF/A-3")
        sys.exit(1)

    # Embed XML
    if not embed_xml_in_pdf(output_pdf, json_data.get('xml', '')):
        logger.error("Failed to embed XML")
        sys.exit(1)

    logger.info("Successfully processed invoice")

if __name__ == "__main__":
    main() 
