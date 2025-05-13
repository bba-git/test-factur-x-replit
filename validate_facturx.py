#!/usr/bin/env python3
"""
Factur-X Validator

This script validates if a PDF is Factur-X compliant by checking:
1. If it's PDF/A-3B compliant
2. If it contains a properly embedded Factur-X XML
3. If the XML is valid according to the specified profile
"""

import os
import argparse
import pikepdf
from pikepdf import Pdf, Name
import xml.etree.ElementTree as ET
import tempfile

def extract_xml(pdf_path):
    """Extract embedded XML from PDF"""
    try:
        with Pdf.open(pdf_path) as pdf:
            # Check if EmbeddedFiles exists
            if "/Names" not in pdf.Root or "/EmbeddedFiles" not in pdf.Root.Names:
                return None, "No embedded files found in PDF"
            
            # Get EmbeddedFiles
            embedded_files = pdf.Root.Names.EmbeddedFiles
            
            # Check if Names array exists
            if "Names" not in embedded_files:
                return None, "No embedded file names found"
            
            # Find "factur-x.xml" in the Names array
            names_array = embedded_files.Names
            xml_index = None
            
            for i, item in enumerate(names_array):
                if isinstance(item, str) and item == "factur-x.xml":
                    xml_index = i
                    break
                if isinstance(item, Name) and str(item) == "/factur-x.xml":
                    xml_index = i
                    break
            
            if xml_index is None:
                return None, "factur-x.xml not found in embedded files"
            
            # Get filespec
            filespec = names_array[xml_index + 1]
            
            # Get embedded file stream
            if "EF" not in filespec or "F" not in filespec.EF:
                return None, "Embedded file stream not found"
            
            xml_stream = filespec.EF.F
            xml_content = xml_stream.read_bytes()
            
            # Write to temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xml")
            temp_file.write(xml_content)
            temp_file.close()
            
            return temp_file.name, "Successfully extracted XML"
    
    except Exception as e:
        return None, f"Error extracting XML: {e}"

def check_pdfa_compliance(pdf_path):
    """Check if PDF is PDF/A-3B compliant"""
    try:
        with Pdf.open(pdf_path) as pdf:
            # Check metadata for PDF/A-3B compliance
            with pdf.open_metadata() as meta:
                # Check PDF/A part
                part = meta.get("pdfaid:part", "")
                conformance = meta.get("pdfaid:conformance", "")
                
                if part == "3" and conformance == "B":
                    return True, "PDF is PDF/A-3B compliant"
                else:
                    return False, f"PDF is not PDF/A-3B compliant. Found: part={part}, conformance={conformance}"
    
    except Exception as e:
        return False, f"Error checking PDF/A compliance: {e}"

def check_facturx_metadata(pdf_path):
    """Check if PDF has Factur-X metadata"""
    try:
        with Pdf.open(pdf_path) as pdf:
            with pdf.open_metadata() as meta:
                # Check Factur-X metadata
                conformance = meta.get("fx:conformance", "")
                filename = meta.get("fx:documentfilename", "")
                doctype = meta.get("fx:documenttype", "")
                version = meta.get("fx:version", "")
                
                if conformance and filename == "factur-x.xml" and doctype == "INVOICE":
                    return True, f"PDF has Factur-X metadata. Profile: {conformance}, Version: {version}"
                else:
                    return False, "PDF is missing required Factur-X metadata"
    
    except Exception as e:
        return False, f"Error checking Factur-X metadata: {e}"

def validate_xml_structure(xml_path, profile="EN16931"):
    """Validate the XML structure based on the profile"""
    try:
        # Parse XML
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # Define namespaces
        ns = {
            'rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
            'ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
            'udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100'
        }
        
        # Basic validation for all profiles
        # Check if root element is CrossIndustryInvoice
        if not root.tag.endswith('}CrossIndustryInvoice'):
            return False, "XML root element is not CrossIndustryInvoice"
        
        # Check for required elements
        required_paths = [
            './/rsm:ExchangedDocument/ram:ID',  # Invoice number
            './/rsm:ExchangedDocument/ram:TypeCode',  # Document type
            './/rsm:ExchangedDocument/ram:IssueDateTime',  # Issue date
            './/ram:SellerTradeParty/ram:Name',  # Seller name
            './/ram:BuyerTradeParty/ram:Name',  # Buyer name
            './/ram:InvoiceCurrencyCode',  # Currency
            './/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:GrandTotalAmount'  # Total amount
        ]
        
        # Additional checks for EN16931 profile
        if profile == "EN16931":
            required_paths.extend([
                './/ram:SellerTradeParty/ram:SpecifiedTaxRegistration/ram:ID[@schemeID="VA"]',  # Seller VAT
                './/ram:SellerTradeParty/ram:PostalTradeAddress/ram:CountryID',  # Seller country
                './/ram:BuyerTradeParty/ram:PostalTradeAddress/ram:CountryID',  # Buyer country
                './/ram:SpecifiedTradePaymentTerms/ram:DueDateDateTime',  # Payment due date
                './/ram:ApplicableTradeTax',  # Tax information
                './/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:LineTotalAmount',  # Line total
                './/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TaxBasisTotalAmount',  # Tax basis
                './/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TaxTotalAmount'  # Tax total
            ])
        
        # Additional checks for BASIC_WL profile
        elif profile == "BASIC_WL":
            required_paths.extend([
                './/ram:SellerTradeParty/ram:PostalTradeAddress',  # Seller address
                './/ram:BuyerTradeParty/ram:PostalTradeAddress',  # Buyer address
                './/ram:SpecifiedTradePaymentTerms',  # Payment terms
                './/ram:IncludedSupplyChainTradeLineItem'  # Line items
            ])
        
        # Check each required path
        missing_elements = []
        for path in required_paths:
            if not root.findall(path, ns):
                missing_elements.append(path)
        
        if missing_elements:
            return False, f"XML is missing required elements for {profile} profile: {', '.join(missing_elements)}"
        
        return True, f"XML structure is valid for {profile} profile"
    
    except Exception as e:
        return False, f"Error validating XML structure: {e}"

def validate_facturx_pdf(pdf_path):
    """Validate if a PDF is Factur-X compliant"""
    results = []
    
    # Step 1: Check PDF/A-3B compliance
    pdfa_compliant, pdfa_message = check_pdfa_compliance(pdf_path)
    results.append(("PDF/A-3B Compliance", pdfa_compliant, pdfa_message))
    
    # Step 2: Check Factur-X metadata
    metadata_valid, metadata_message = check_facturx_metadata(pdf_path)
    results.append(("Factur-X Metadata", metadata_valid, metadata_message))
    
    # Step 3: Extract and validate XML
    xml_path, extract_message = extract_xml(pdf_path)
    if xml_path:
        results.append(("XML Extraction", True, extract_message))
        
        # Step 4: Validate XML structure
        profile = "EN16931"  # Default to EN16931 profile
        try:
            with Pdf.open(pdf_path) as pdf:
                with pdf.open_metadata() as meta:
                    profile = meta.get("fx:conformance", "EN16931")
        except:
            pass
        
        xml_valid, xml_message = validate_xml_structure(xml_path, profile)
        results.append(("XML Structure", xml_valid, xml_message))
        
        # Clean up temporary file
        os.unlink(xml_path)
    else:
        results.append(("XML Extraction", False, extract_message))
    
    # Overall validation result
    overall_valid = all(result[1] for result in results)
    
    return overall_valid, results

def main():
    parser = argparse.ArgumentParser(description="Validate Factur-X PDF/A-3B compliance")
    parser.add_argument("pdf_file", help="Path to PDF file to validate")
    parser.add_argument("--extract-xml", "-x", action="store_true", 
                        help="Extract the embedded XML to a file")
    parser.add_argument("--xml-output", help="Path to save the extracted XML (default: factur-x_extracted.xml)")
    
    args = parser.parse_args()
    
    pdf_file = args.pdf_file
    
    # Validate the PDF
    overall_valid, results = validate_facturx_pdf(pdf_file)
    
    # Print validation results
    print("\n=== Factur-X Validation Results ===")
    print(f"File: {pdf_file}")
    print(f"Overall: {'VALID' if overall_valid else 'INVALID'}")
    print("\nDetailed Results:")
    
    for test, valid, message in results:
        status = "✅ PASS" if valid else "❌ FAIL"
        print(f"{status} - {test}: {message}")
    
    # Extract XML if requested
    if args.extract_xml:
        xml_path, extract_message = extract_xml(pdf_file)
        if xml_path:
            xml_output = args.xml_output or "factur-x_extracted.xml"
            import shutil
            shutil.copy(xml_path, xml_output)
            os.unlink(xml_path)
            print(f"\nExtracted XML saved to: {xml_output}")
        else:
            print(f"\nFailed to extract XML: {extract_message}")
    
    return 0 if overall_valid else 1

if __name__ == "__main__":
    main()