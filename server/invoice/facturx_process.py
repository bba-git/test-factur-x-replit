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
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    NameObject, DictionaryObject, ArrayObject, ByteStringObject, TextStringObject,
    StreamObject, NumberObject, create_string_object
)

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

        cmd = [
            "gs",
            "-dPDFA=3",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=pdfwrite",
            "-dPDFACompatibilityPolicy=1",
            "-dProcessColorModel=/DeviceRGB",
            "-dColorConversionStrategy=/sRGB",
            "-sColorConversionStrategyForImages=/sRGB",
            "-sOutputConditionIdentifier=sRGB IEC61966-2.1",
            "-sOutputCondition=sRGB IEC61966-2.1",
            "-sPDFAOutputConditionIdentifier=sRGB IEC61966-2.1",
            f"-sICCProfile={icc_profile}",
            f"-sOutputFile={output_pdf}",
            input_pdf
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
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

def embed_xml_in_pdf(pdf_path: str, xml_content: str) -> bool:
    """Embed XML content into PDF/A-3 file."""
    try:
        # Read the PDF
        reader = PdfReader(pdf_path)
        writer = PdfWriter()

        # Copy all pages
        for page in reader.pages:
            writer.add_page(page)

        # Create XML stream
        xml_stream = StreamObject()
        xml_stream._data = xml_content.encode('utf-8')
        xml_stream.update({
            NameObject('/Type'): NameObject('/EmbeddedFile'),
            NameObject('/Subtype'): NameObject('/text/xml'),
            NameObject('/Params'): DictionaryObject({
                NameObject('/Size'): NumberObject(len(xml_content.encode('utf-8'))),
                NameObject('/ModDate'): create_string_object(datetime.datetime.now().strftime('D:%Y%m%d%H%M%S')),
                NameObject('/CheckSum'): create_string_object(hashlib.md5(xml_content.encode('utf-8')).hexdigest())
            })
        })

        # Create file specification
        xml_file = DictionaryObject()
        xml_file.update({
            NameObject('/Type'): NameObject('/Filespec'),
            NameObject('/F'): create_string_object('factur-x.xml'),
            NameObject('/EF'): DictionaryObject({
                NameObject('/F'): xml_stream
            }),
            NameObject('/AFRelationship'): NameObject('/Alternative'),
            NameObject('/Description'): create_string_object('Factur-X Invoice'),
            NameObject('/MimeType'): create_string_object('text/xml')
        })

        # Add to PDF
        writer._add_object(xml_stream)
        writer._add_object(xml_file)

        # Create embedded files name tree
        names = DictionaryObject()
        names.update({
            NameObject('/Names'): ArrayObject([
                create_string_object('factur-x.xml'),
                writer._add_object(xml_file)
            ])
        })
        writer._add_object(names)

        # Update PDF catalog
        writer._root_object.update({
            NameObject('/Names'): DictionaryObject({
                NameObject('/EmbeddedFiles'): writer._add_object(names)
            })
        })

        # Add PDF/A-3 metadata
        xmp_template = """<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
<pdfaid:part>3</pdfaid:part>
<pdfaid:conformance>B</pdfaid:conformance>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
<pdf:Producer>Factur-X Generator</pdf:Producer>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""

        xmp_stream = StreamObject()
        xmp_stream._data = xmp_template.encode('utf-8')
        xmp_stream.update({
            NameObject('/Type'): NameObject('/Metadata'),
            NameObject('/Subtype'): NameObject('/XML'),
            NameObject('/Length'): NumberObject(len(xmp_template.encode('utf-8')))
        })

        # Add XMP metadata
        writer._add_object(xmp_stream)
        writer._root_object.update({
            NameObject('/Metadata'): writer._add_object(xmp_stream)
        })

        # Add output intent
        output_intent = DictionaryObject()
        output_intent.update({
            NameObject('/Type'): NameObject('/OutputIntent'),
            NameObject('/S'): NameObject('/GTS_PDFA1'),
            NameObject('/OutputConditionIdentifier'): create_string_object('sRGB IEC61966-2.1'),
            NameObject('/Info'): create_string_object('sRGB IEC61966-2.1'),
            NameObject('/RegistryName'): create_string_object('http://www.color.org')
        })

        # Add output intent
        writer._add_object(output_intent)
        writer._root_object.update({
            NameObject('/OutputIntents'): ArrayObject([writer._add_object(output_intent)])
        })

        # Write the modified PDF
        with open(pdf_path, 'wb') as output_file:
            writer.write(output_file)

        return True

    except Exception as e:
        logging.error(f"Error embedding XML: {str(e)}")
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
