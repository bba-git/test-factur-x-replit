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
import argparse
import json
import tempfile
from pdf_converter import convert_to_pdfa3b
from generate_facturx_xml import generate_facturx_xml
from embed_xml import embed_xml_in_pdf
from validate_facturx import validate_facturx_pdf

def create_facturx_invoice(input_pdf, json_file, output_pdf, profile="EN16931", validate=True):
    """
    Create a Factur-X compliant invoice
    
    Args:
        input_pdf (str): Path to input PDF file
        json_file (str): Path to JSON file with invoice data
        output_pdf (str): Path where the final PDF will be saved
        profile (str): Factur-X profile (MINIMUM, BASIC_WL, EN16931)
        validate (bool): Whether to validate the final PDF
        
    Returns:
        bool: True if successful, False otherwise
    """
    # Create temporary directory for intermediate files
    temp_dir = tempfile.mkdtemp()
    pdfa_pdf = os.path.join(temp_dir, "pdfa.pdf")
    xml_file = os.path.join(temp_dir, "factur-x.xml")
    
    try:
        print("\n====== CREATING FACTUR-X INVOICE ======\n")
        
        # Step 1: Convert to PDF/A-3B
        print("\n--- Step 1: Converting PDF to PDF/A-3B ---")
        if not convert_to_pdfa3b(input_pdf, pdfa_pdf):
            print("Failed to convert PDF to PDF/A-3B")
            return False
        
        # Step 2: Generate Factur-X XML
        print("\n--- Step 2: Generating Factur-X XML ---")
        try:
            with open(json_file, 'r') as f:
                invoice_data = json.load(f)
            
            if not generate_facturx_xml(invoice_data, xml_file):
                print("Failed to generate Factur-X XML")
                return False
        except Exception as e:
            print(f"Error processing JSON file: {e}")
            return False
        
        # Step 3: Embed XML into PDF/A-3B
        print("\n--- Step 3: Embedding XML into PDF/A-3B ---")
        if not embed_xml_in_pdf(pdfa_pdf, xml_file, output_pdf, profile):
            print("Failed to embed XML into PDF")
            return False
        
        # Step 4: Validate the final PDF
        if validate:
            print("\n--- Step 4: Validating Factur-X PDF ---")
            overall_valid, results = validate_facturx_pdf(output_pdf)
            
            # Print validation results
            print("\n=== Factur-X Validation Results ===")
            print(f"File: {output_pdf}")
            print(f"Overall: {'VALID' if overall_valid else 'INVALID'}")
            print("\nDetailed Results:")
            
            for test, valid, message in results:
                status = "✅ PASS" if valid else "❌ FAIL"
                print(f"{status} - {test}: {message}")
        
        print(f"\nSuccess! Factur-X invoice created at: {output_pdf}\n")
        return True
        
    except Exception as e:
        print(f"Error creating Factur-X invoice: {e}")
        return False
    finally:
        # Clean up temporary files
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except:
            pass

def main():
    parser = argparse.ArgumentParser(description="Create Factur-X compliant invoice in PDF/A-3B format")
    parser.add_argument("input_pdf", help="Path to input PDF file")
    parser.add_argument("json_file", help="Path to JSON file with invoice data")
    parser.add_argument("--output", "-o", help="Path where the final PDF will be saved (default: <original_filename>_facturx.pdf)")
    parser.add_argument("--profile", "-p", choices=["MINIMUM", "BASIC_WL", "EN16931"], 
                       default="EN16931", help="Factur-X profile (default: EN16931)")
    parser.add_argument("--no-validate", action="store_true", help="Skip validation step")
    
    args = parser.parse_args()
    
    input_pdf = args.input_pdf
    json_file = args.json_file
    
    if args.output:
        output_pdf = args.output
    else:
        # Generate output filename based on input
        filename, ext = os.path.splitext(input_pdf)
        output_pdf = f"{filename}_facturx{ext}"
    
    success = create_facturx_invoice(
        input_pdf, 
        json_file, 
        output_pdf, 
        args.profile, 
        not args.no_validate
    )
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())