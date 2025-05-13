#!/usr/bin/env python3
"""
XML Embedder for PDF/A-3B

This script embeds a Factur-X XML into a PDF/A-3B document and adds the required metadata.
"""

import os
import argparse
import pikepdf
from pikepdf import Pdf, Dictionary, Name

def embed_xml_in_pdf(pdf_path, xml_path, output_path, profile="EN16931"):
    """
    Embed Factur-X XML into a PDF/A-3B document and add required metadata
    
    Args:
        pdf_path (str): Path to the PDF/A-3B file
        xml_path (str): Path to the Factur-X XML file
        output_path (str): Path where the final PDF will be saved
        profile (str): Factur-X profile (MINIMUM, BASIC_WL, EN16931)
    
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"Embedding XML {xml_path} into PDF {pdf_path}...")
    
    try:
        # Open the PDF
        pdf = Pdf.open(pdf_path)
        
        # Read the XML file
        with open(xml_path, 'rb') as xml_file:
            xml_content = xml_file.read()
        
        # Create file specification dictionary
        filespec = Dictionary(
            Type=Name("/Filespec"),
            F=Name("/factur-x.xml"),
            UF=Name("/factur-x.xml"),
            Desc="Factur-X Invoice XML",
            AFRelationship=Name("/Data"),
            EF=Dictionary(
                F=pdf.make_stream(xml_content, 
                                   Dictionary(
                                       Type=Name("/EmbeddedFile"),
                                       Subtype=Name("/application#2Fxml"),
                                       ModDate=pdf.make_indirect(Dictionary()))
                                  )
            )
        )
        
        # Set the PDF's root Names if it doesn't exist
        if "/Names" not in pdf.Root:
            pdf.Root["/Names"] = Dictionary()
        
        # Add EmbeddedFiles dictionary to Names if it doesn't exist
        if "/EmbeddedFiles" not in pdf.Root["/Names"]:
            pdf.Root["/Names"]["/EmbeddedFiles"] = Dictionary()
            
        # Add Names array to EmbeddedFiles if it doesn't exist
        embedded_files = pdf.Root["/Names"]["/EmbeddedFiles"]
        if "/Names" not in embedded_files:
            embedded_files["/Names"] = []
        
        # Add the filespec to the Names array
        names_array = embedded_files["/Names"]
        names_array.append(Name("/factur-x.xml"))
        names_array.append(pdf.make_indirect(filespec))
        
        # Add PDF/A and Factur-X metadata
        with pdf.open_metadata() as meta:
            # Add PDF/A-3B conformance metadata
            meta["pdfaid:part"] = "3"
            meta["pdfaid:conformance"] = "B"
            
            # Add Factur-X metadata
            meta["fx:conformance"] = profile
            meta["fx:documentfilename"] = "factur-x.xml"
            meta["fx:documenttype"] = "INVOICE"
            meta["fx:version"] = "1.0.0"
            
            # Other required XMP metadata
            meta["dc:title"] = "Factur-X Invoice"
            meta["dc:description"] = f"Invoice with embedded Factur-X {profile} XML"
            meta["xmp:CreatorTool"] = "Python PikePDF Factur-X Generator"
            meta["pdf:Producer"] = "Python PikePDF"
        
        # Save the PDF with embedded XML
        pdf.save(output_path)
        print(f"Successfully embedded XML and saved to {output_path}")
        return True
        
    except Exception as e:
        print(f"Error embedding XML in PDF: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Embed Factur-X XML into PDF/A-3B document")
    parser.add_argument("pdf_file", help="Path to PDF/A-3B file")
    parser.add_argument("xml_file", help="Path to Factur-X XML file")
    parser.add_argument("--output", "-o", help="Path to output PDF file (default: <original_filename>_facturx.pdf)")
    parser.add_argument("--profile", "-p", choices=["MINIMUM", "BASIC_WL", "EN16931"], 
                        default="EN16931", help="Factur-X profile (default: EN16931)")
    
    args = parser.parse_args()
    
    pdf_file = args.pdf_file
    xml_file = args.xml_file
    
    if args.output:
        output_file = args.output
    else:
        # Generate output filename based on input
        filename, ext = os.path.splitext(pdf_file)
        output_file = f"{filename}_facturx{ext}"
    
    embed_xml_in_pdf(pdf_file, xml_file, output_file, args.profile)

if __name__ == "__main__":
    main()