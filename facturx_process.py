#!/usr/bin/env python3
"""
Factur-X Invoice Creator (5-step process)

This script follows the 5-step process to create a Factur-X (EN16931) compliant invoice:
1. Convert a regular PDF to PDF/A-3B using Ghostscript
2. Generate Factur-X XML using Mustangproject CLI
3. Embed the XML into the PDF using pikepdf with AFRelationship = Data
4. Add the XMP metadata to declare the Factur-X profile
5. Validate the final PDF
"""

import os
import sys
import json
import tempfile
import subprocess
import pikepdf
from pikepdf import Pdf, Dictionary, Name, Array

def convert_to_pdfa3b(input_pdf, output_pdf):
    """
    Convert a regular PDF to PDF/A-3B using Ghostscript
    
    Args:
        input_pdf (str): Path to the input PDF file
        output_pdf (str): Path where the PDF/A-3B compliant file will be saved
    """
    print(f"Converting {input_pdf} to PDF/A-3B format...")
    
    # Ghostscript command for PDF/A-3B conversion
    gs_command = [
        "gs", "-dPDFA=3", "-dBATCH", "-dNOPAUSE", "-dNOOUTERSAVE",
        "-sProcessColorModel=DeviceRGB", "-sDEVICE=pdfwrite",
        "-dPDFACompatibilityPolicy=1", "-sOutputFile=" + output_pdf,
        input_pdf
    ]
    
    try:
        result = subprocess.run(gs_command, check=True, capture_output=True, text=True)
        print(f"Successfully converted to PDF/A-3B: {output_pdf}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error converting to PDF/A-3B: {e}")
        print(f"Ghostscript output: {e.stdout}")
        print(f"Ghostscript error: {e.stderr}")
        return False

def generate_facturx_xml(json_file, xml_file):
    """
    Generate Factur-X XML using Mustangproject CLI
    
    Args:
        json_file (str): Path to the JSON file with invoice data
        xml_file (str): Path where the XML file will be saved
    """
    print(f"Generating Factur-X XML from invoice data...")
    
    # Mustangproject CLI command
    mustang_command = [
        "java", "-jar", "Mustang-CLI-2.16.4.jar",
        "-j", json_file,
        "-o", xml_file
    ]
    
    try:
        result = subprocess.run(mustang_command, check=True, capture_output=True, text=True)
        print(f"Successfully generated Factur-X XML: {xml_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error generating Factur-X XML: {e}")
        print(f"Mustangproject output: {e.stdout}")
        print(f"Mustangproject error: {e.stderr}")
        return False

def embed_xml_in_pdf(pdf_file, xml_file, output_file, profile="EN16931"):
    """
    Embed Factur-X XML into PDF/A-3B and add required metadata
    
    Args:
        pdf_file (str): Path to the PDF/A-3B file
        xml_file (str): Path to the Factur-X XML file
        output_file (str): Path where the final PDF will be saved
        profile (str): Factur-X profile (EN16931, etc.)
    """
    print(f"Embedding XML {xml_file} into PDF {pdf_file}...")
    
    try:
        # Open the PDF
        pdf = Pdf.open(pdf_file)
        
        # Read the XML file
        with open(xml_file, 'rb') as f:
            xml_content = f.read()
        
        # Create embedded file stream
        af_file = pdf.make_stream(xml_content)
        af_file[Name.Type] = Name.EmbeddedFile
        af_file[Name.Subtype] = pikepdf.String("application/xml")
        
        # Create file specification dictionary
        embedded_file = Dictionary({
            Name.Type: Name.Filespec,
            Name.F: "factur-x.xml",
            Name.UF: "factur-x.xml",
            Name.AFRelationship: Name.Data,
            Name.Desc: "Factur-X Invoice Data",
            Name.EF: Dictionary({Name.F: af_file})
        })
        
        # Add to root catalog
        if Name.AF not in pdf.Root:
            pdf.Root[Name.AF] = Array()
        pdf.Root[Name.AF].append(embedded_file)
        
        # Add to EmbeddedFiles name tree
        if Name.Names not in pdf.Root:
            pdf.Root[Name.Names] = Dictionary()
            
        if Name.EmbeddedFiles not in pdf.Root[Name.Names]:
            pdf.Root[Name.Names][Name.EmbeddedFiles] = Dictionary()
            
        ef_dict = pdf.Root[Name.Names][Name.EmbeddedFiles]
        if Name.Names not in ef_dict:
            ef_dict[Name.Names] = Array()
            
        names_array = ef_dict[Name.Names]
        names_array.append(pikepdf.String("factur-x.xml"))
        names_array.append(embedded_file)
        
        # Add/update XMP metadata
        with pdf.open_metadata() as meta:
            # Factur-X metadata
            meta["fx:conformance"] = profile
            meta["fx:documentfilename"] = "factur-x.xml"
            meta["fx:documenttype"] = "INVOICE"
            meta["fx:version"] = "1.0.0"
            
            # PDF/A-3B conformance metadata
            meta["pdfaid:part"] = "3"
            meta["pdfaid:conformance"] = "B"
            
            # Other required metadata
            meta["dc:title"] = "Factur-X Invoice"
            meta["dc:description"] = "Invoice with embedded Factur-X XML"
            
        # Save the PDF with embedded XML
        pdf.save(output_file)
        print(f"Successfully embedded XML and saved to {output_file}")
        return True
        
    except Exception as e:
        print(f"Error embedding XML in PDF: {e}")
        return False

def validate_facturx_pdf(pdf_path):
    """Simple validation to check if embedded XML exists"""
    try:
        with pikepdf.open(pdf_path) as pdf:
            # Check metadata
            with pdf.open_metadata() as meta:
                has_pdfa = "pdfaid:part" in meta and meta["pdfaid:part"] == "3"
                has_facturx = "fx:conformance" in meta and "fx:documenttype" in meta
                
            # Check for embedded XML
            has_xml = False
            if Name.AF in pdf.Root:
                af_array = pdf.Root[Name.AF]
                for item in af_array:
                    if Name.F in item and item[Name.F] == "factur-x.xml":
                        if Name.EF in item and Name.F in item[Name.EF]:
                            has_xml = True
                            
            # Report results            
            if has_pdfa and has_facturx and has_xml:
                print("✅ PDF/A-3B validation: PASS")
                print("✅ Factur-X metadata: PASS")
                print("✅ Embedded XML: PASS")
                return True
            else:
                if not has_pdfa:
                    print("❌ PDF/A-3B validation: FAIL")
                if not has_facturx:
                    print("❌ Factur-X metadata: FAIL")
                if not has_xml:
                    print("❌ Embedded XML: FAIL")
                return False
                
    except Exception as e:
        print(f"Error validating PDF: {e}")
        return False

def create_facturx_invoice(input_pdf, json_file, output_pdf, profile="EN16931"):
    """
    Create a Factur-X compliant invoice following the 5-step process
    
    Args:
        input_pdf (str): Path to input PDF file
        json_file (str): Path to JSON file with invoice data
        output_pdf (str): Path where the final PDF will be saved
        profile (str): Factur-X profile (default: EN16931)
    """
    # Create temporary directory for intermediate files
    temp_dir = tempfile.mkdtemp()
    pdfa_pdf = os.path.join(temp_dir, "pdfa3b.pdf")
    xml_file = os.path.join(temp_dir, "factur-x.xml")
    
    try:
        print("\n====== CREATING FACTUR-X INVOICE ======\n")
        
        # Step 1: Convert to PDF/A-3B
        print("\n=== Step 1: Converting PDF to PDF/A-3B ===")
        if not convert_to_pdfa3b(input_pdf, pdfa_pdf):
            print("❌ Failed to convert PDF to PDF/A-3B")
            return False
        
        # Step 2: Generate Factur-X XML
        print("\n=== Step 2: Generating Factur-X XML using Mustangproject ===")
        if not generate_facturx_xml(json_file, xml_file):
            print("❌ Failed to generate Factur-X XML")
            return False
        
        # Step 3 & 4: Embed XML and add metadata
        print("\n=== Step 3 & 4: Embedding XML and adding Factur-X metadata ===")
        if not embed_xml_in_pdf(pdfa_pdf, xml_file, output_pdf, profile):
            print("❌ Failed to embed XML into PDF")
            return False
        
        # Step 5: Validate the final PDF
        print("\n=== Step 5: Validating Factur-X PDF ===")
        if validate_facturx_pdf(output_pdf):
            print("\n✅ SUCCESS: Factur-X invoice created successfully!")
            print(f"Output file: {output_pdf}")
            return True
        else:
            print("\n❌ WARNING: Validation found issues with the Factur-X PDF")
            return False
            
    except Exception as e:
        print(f"\n❌ Error creating Factur-X invoice: {e}")
        return False
    finally:
        # Clean up temporary files
        import shutil
        shutil.rmtree(temp_dir)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python facturx_process.py <input_pdf> <json_file> [output_pdf] [profile]")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    json_file = sys.argv[2]
    
    output_pdf = sys.argv[3] if len(sys.argv) > 3 else "facturx_invoice.pdf"
    profile = sys.argv[4] if len(sys.argv) > 4 else "EN16931"
    
    success = create_facturx_invoice(input_pdf, json_file, output_pdf, profile)
    sys.exit(0 if success else 1)