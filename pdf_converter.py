#!/usr/bin/env python3
"""
PDF/A-3B Converter Tool

This script converts a standard PDF to PDF/A-3B format using Ghostscript.
"""

import os
import subprocess
import argparse
from ghostscript import Ghostscript

def convert_to_pdfa3b(input_pdf, output_pdf):
    """
    Convert a regular PDF to PDF/A-3B using Ghostscript
    
    Args:
        input_pdf (str): Path to the input PDF file
        output_pdf (str): Path where the PDF/A-3B compliant file will be saved
    """
    print(f"Converting {input_pdf} to PDF/A-3B format...")
    
    # Using Python's ghostscript module
    args = [
        "gs",                          # Ghostscript command
        "-dPDFA=3",                    # PDF/A-3 mode
        "-dBATCH",                     # Exit after processing
        "-dNOPAUSE",                   # No interactive prompts
        "-dNOOUTERSAVE",              # No output file saving
        "-dPDFACompatibilityPolicy=1", # Make PDF/A compatible
        "-sColorConversionStrategy=RGB",  # Convert colors to RGB
        "-sDEVICE=pdfwrite",           # Output device is PDF writer
        "-dPDFSETTINGS=/printer",      # Optimize for printing
        "-dAutoFilterColorImages=true",
        "-dAutoFilterGrayImages=true",
        "-dColorImageFilter=/DCTEncode",
        "-dGrayImageFilter=/DCTEncode",
        f"-sOutputFile={output_pdf}",  # Output file
        input_pdf                      # Input file
    ]
    
    try:
        # Either use Python's ghostscript module
        gs_instance = Ghostscript(*args)
        gs_instance.exit()
        
        # Or directly call the ghostscript command
        # subprocess.run(args, check=True)
        
        print(f"Successfully converted to PDF/A-3B: {output_pdf}")
        return True
    except Exception as e:
        print(f"Error converting to PDF/A-3B: {e}")
        
        # If the ghostscript module fails, try using the command line directly
        try:
            subprocess.run(["gs", "-dPDFA=3", "-dBATCH", "-dNOPAUSE", 
                           "-dNOOUTERSAVE", "-dPDFACompatibilityPolicy=1",
                           "-sColorConversionStrategy=RGB", "-sDEVICE=pdfwrite",
                           "-dPDFSETTINGS=/printer", f"-sOutputFile={output_pdf}",
                           input_pdf], check=True)
            print(f"Successfully converted to PDF/A-3B using subprocess: {output_pdf}")
            return True
        except Exception as sub_e:
            print(f"Error with subprocess conversion: {sub_e}")
            return False

def main():
    parser = argparse.ArgumentParser(description="Convert PDF to PDF/A-3B format")
    parser.add_argument("input_pdf", help="Path to input PDF file")
    parser.add_argument("--output", "-o", help="Path to output PDF/A-3B file (default: input_pdf_PDFA3B.pdf)")
    
    args = parser.parse_args()
    
    input_pdf = args.input_pdf
    if args.output:
        output_pdf = args.output
    else:
        # Generate output filename based on input
        filename, ext = os.path.splitext(input_pdf)
        output_pdf = f"{filename}_PDFA3B{ext}"
    
    convert_to_pdfa3b(input_pdf, output_pdf)

if __name__ == "__main__":
    main()