#!/usr/bin/env python3
import pikepdf
import sys
import os
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def add_facturx_compliance(pdf_path: str, xml_path: str, output_path: str):
    """
    Add Factur-X compliance to a PDF/A-3B document.
    
    Args:
        pdf_path: Path to the PDF/A-3B document
        xml_path: Path to the factur-x.xml file
        output_path: Path where the final PDF will be saved
    """
    try:
        logger.info(f"Opening PDF/A-3B document: {pdf_path}")
        pdf = pikepdf.Pdf.open(pdf_path)
        
        logger.info(f"Reading XML file: {xml_path}")
        with open(xml_path, 'rb') as f:
            xml_data = f.read()
        logger.info(f"XML file size: {len(xml_data)} bytes")
        
        logger.info("Creating Associated File")
        af = pikepdf.Stream(pdf, xml_data)
        af.Type = pikepdf.Name('/Filespec')
        af.F = pikepdf.String('factur-x.xml')
        af.EF = pikepdf.Dictionary({
            pikepdf.Name('/F'): af
        })
        af.AFRelationship = pikepdf.Name('/Data')
        af.ContentType = pikepdf.String('application/xml')
        
        logger.info("Adding Associated File to PDF")
        if '/AF' not in pdf.Root:
            pdf.Root.AF = pikepdf.Array()
        pdf.Root.AF.append(af)
        
        logger.info("Adding XMP metadata")
        xmp = pikepdf.Stream(pdf, f'''<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
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
        
        logger.info(f"Saving final PDF to: {output_path}")
        pdf.save(output_path)
        logger.info("PDF saved successfully")
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise

if __name__ == '__main__':
    if len(sys.argv) != 4:
        logger.error("Usage: python add_facturx.py <pdf_path> <xml_path> <output_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    xml_path = sys.argv[2]
    output_path = sys.argv[3]
    
    logger.info("Starting Factur-X compliance process")
    add_facturx_compliance(pdf_path, xml_path, output_path)
    logger.info("Factur-X compliance process completed successfully") 