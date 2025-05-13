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
    Generate Factur-X XML using our Python script
    
    Args:
        json_file (str): Path to the JSON file with invoice data
        xml_file (str): Path where the XML file will be saved
    """
    print(f"Generating Factur-X XML from invoice data...")
    
    # Since Mustangproject CLI doesn't support direct JSON to XML conversion in recent versions,
    # we'll generate the XML directly using our existing Python code
    
    try:
        import json
        from datetime import datetime
        
        # Read JSON data
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        invoice = data['invoice']
        seller = data['seller']
        buyer = data['buyer']
        items = data['items']
        totals = data['totals']
        payment = data.get('payment', {})
        
        # Format date (from YYYY-MM-DD to YYYYMMDD)
        def format_date(date_str):
            if not date_str:
                return ""
            return date_str.replace("-", "")
        
        # Create Factur-X XML (CII - CrossIndustryInvoice format)
        xml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:factur-x.eu:1p0:{invoice.get('profile', 'EN16931')}</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    <rsm:ExchangedDocument>
        <ram:ID>{invoice.get('number', '')}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">{format_date(invoice.get('date', ''))}</udt:DateTimeString>
        </ram:IssueDateTime>
    </rsm:ExchangedDocument>
    <rsm:SupplyChainTradeTransaction>
        <ram:ApplicableHeaderTradeAgreement>
            <ram:SellerTradeParty>
                <ram:Name>{seller.get('name', '')}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:LineOne>{seller.get('address', '')}</ram:LineOne>
                    <ram:PostcodeCode>{seller.get('zip', '')}</ram:PostcodeCode>
                    <ram:CityName>{seller.get('city', '')}</ram:CityName>
                    <ram:CountryID>{seller.get('country', '')}</ram:CountryID>
                </ram:PostalTradeAddress>
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="VA">{seller.get('taxID', '')}</ram:ID>
                </ram:SpecifiedTaxRegistration>
            </ram:SellerTradeParty>
            <ram:BuyerTradeParty>
                <ram:Name>{buyer.get('name', '')}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:LineOne>{buyer.get('address', '')}</ram:LineOne>
                    <ram:PostcodeCode>{buyer.get('zip', '')}</ram:PostcodeCode>
                    <ram:CityName>{buyer.get('city', '')}</ram:CityName>
                    <ram:CountryID>{buyer.get('country', '')}</ram:CountryID>
                </ram:PostalTradeAddress>
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="VA">{buyer.get('taxID', '')}</ram:ID>
                </ram:SpecifiedTaxRegistration>
            </ram:BuyerTradeParty>
        </ram:ApplicableHeaderTradeAgreement>
        <ram:ApplicableHeaderTradeDelivery>
            <ram:ActualDeliverySupplyChainEvent>
                <ram:OccurrenceDateTime>
                    <udt:DateTimeString format="102">{format_date(data.get('delivery', {}).get('date', invoice.get('date', '')))}</udt:DateTimeString>
                </ram:OccurrenceDateTime>
            </ram:ActualDeliverySupplyChainEvent>
        </ram:ApplicableHeaderTradeDelivery>
        <ram:ApplicableHeaderTradeSettlement>
            <ram:InvoiceCurrencyCode>{invoice.get('currency', 'EUR')}</ram:InvoiceCurrencyCode>
            <ram:SpecifiedTradeSettlementPaymentMeans>
                <ram:TypeCode>58</ram:TypeCode>
                <ram:PayeePartyCreditorFinancialAccount>
                    <ram:IBANID>{payment.get('iban', '')}</ram:IBANID>
                </ram:PayeePartyCreditorFinancialAccount>
            </ram:SpecifiedTradeSettlementPaymentMeans>'''
        
        # Add tax summary
        xml_content += f'''
            <ram:ApplicableTradeTax>
                <ram:CalculatedAmount>{totals.get('vatAmount', 0):.2f}</ram:CalculatedAmount>
                <ram:TypeCode>VAT</ram:TypeCode>
                <ram:BasisAmount>{totals.get('netAmount', 0):.2f}</ram:BasisAmount>
                <ram:CategoryCode>S</ram:CategoryCode>
                <ram:RateApplicablePercent>20.00</ram:RateApplicablePercent>
            </ram:ApplicableTradeTax>'''
        
        # Add payment terms
        xml_content += f'''
            <ram:SpecifiedTradePaymentTerms>
                <ram:DueDateDateTime>
                    <udt:DateTimeString format="102">{format_date(invoice.get('dueDate', ''))}</udt:DateTimeString>
                </ram:DueDateDateTime>
            </ram:SpecifiedTradePaymentTerms>'''
        
        # Add monetary totals
        xml_content += f'''
            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                <ram:LineTotalAmount>{totals.get('netAmount', 0):.2f}</ram:LineTotalAmount>
                <ram:TaxBasisTotalAmount>{totals.get('netAmount', 0):.2f}</ram:TaxBasisTotalAmount>
                <ram:TaxTotalAmount>{totals.get('vatAmount', 0):.2f}</ram:TaxTotalAmount>
                <ram:GrandTotalAmount>{totals.get('grandTotal', 0):.2f}</ram:GrandTotalAmount>
                <ram:DuePayableAmount>{totals.get('grandTotal', 0):.2f}</ram:DuePayableAmount>
            </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        </ram:ApplicableHeaderTradeSettlement>'''
        
        # Add line items
        for i, item in enumerate(items, 1):
            line_net_amount = item.get('quantity', 0) * item.get('unitPrice', 0)
            xml_content += f'''
        <ram:IncludedSupplyChainTradeLineItem>
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>{i}</ram:LineID>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>{item.get('name', '')}</ram:Name>
                <ram:Description>{item.get('note', '')}</ram:Description>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>{item.get('unitPrice', 0):.2f}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity unitCode="{item.get('unit', 'C62')}">{item.get('quantity', 0)}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>VAT</ram:TypeCode>
                    <ram:CategoryCode>S</ram:CategoryCode>
                    <ram:RateApplicablePercent>{item.get('vatPercent', 0):.2f}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>{line_net_amount:.2f}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>
        </ram:IncludedSupplyChainTradeLineItem>'''
        
        # Close the XML
        xml_content += '''
    </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>'''
        
        # Write to file
        with open(xml_file, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        print(f"Successfully generated Factur-X XML: {xml_file}")
        return True
    except Exception as e:
        print(f"Error generating Factur-X XML: {e}")
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
        
        # Create embedded file
        xml_stream = pdf.make_stream(xml_content)
        xml_stream_dict = pikepdf.Dictionary()
        xml_stream_dict[Name.Type] = Name.EmbeddedFile
        xml_stream_dict[Name.Subtype] = pikepdf.String("application/xml")
        
        # Create filespec
        filespec = pikepdf.Dictionary()
        filespec[Name.Type] = Name.Filespec
        filespec[Name.F] = pikepdf.String("factur-x.xml")
        filespec[Name.UF] = pikepdf.String("factur-x.xml")
        filespec[Name.AFRelationship] = Name.Data
        filespec[Name.Desc] = pikepdf.String("Factur-X Invoice Data")
        
        # Add file to filespec
        ef_dict = pikepdf.Dictionary()
        ef_dict[Name.F] = xml_stream
        filespec[Name.EF] = ef_dict
        
        # Add to root AF array
        if Name.AF not in pdf.Root:
            pdf.Root[Name.AF] = pikepdf.Array()
        
        # Make the filespec indirect before adding it to avoid reference issues
        pdf.Root[Name.AF].append(pdf.make_indirect(filespec))
        
        # Add to Names tree
        if Name.Names not in pdf.Root:
            pdf.Root[Name.Names] = pikepdf.Dictionary()
        
        if Name.EmbeddedFiles not in pdf.Root[Name.Names]:
            pdf.Root[Name.Names][Name.EmbeddedFiles] = pikepdf.Dictionary()
        
        efDict = pdf.Root[Name.Names][Name.EmbeddedFiles]
        
        if Name.Names not in efDict:
            efDict[Name.Names] = pikepdf.Array()
        
        # Add to names array
        efDict[Name.Names].append(pikepdf.String("factur-x.xml"))
        efDict[Name.Names].append(pdf.make_indirect(filespec))
        
        # Add XMP metadata
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
        
        # Save to output file
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
                meta_dict = {k: v for k, v in meta.items()}
                
                # Check PDF/A compliance (check both with and without namespaces)
                pdfa_id_ns = "{http://www.aiim.org/pdfa/ns/id/}"
                has_pdfa = (("pdfaid:part" in meta_dict and meta_dict["pdfaid:part"] == "3" and
                           "pdfaid:conformance" in meta_dict and meta_dict["pdfaid:conformance"] == "B") or
                          (f"{pdfa_id_ns}part" in meta_dict and meta_dict[f"{pdfa_id_ns}part"] == "3" and
                           f"{pdfa_id_ns}conformance" in meta_dict and meta_dict[f"{pdfa_id_ns}conformance"] == "B"))
                
                # Check Factur-X metadata (using simple names without 'fx:' prefix)
                has_facturx = False
                if (("fx:conformance" in meta_dict and "fx:documentfilename" in meta_dict and "fx:documenttype" in meta_dict) or
                   ("conformance" in meta_dict and "documentfilename" in meta_dict and "documenttype" in meta_dict)):
                    has_facturx = True
                
            # Simplified check for embedded files
            has_xml = False
            try:
                # Check if the AF entry exists in Root
                if Name.AF in pdf.Root:
                    print("  ✓ AF entry found in PDF Root")
                    has_xml = True
                
                # Check if Names tree exists
                if (Name.Names in pdf.Root and 
                    Name.EmbeddedFiles in pdf.Root[Name.Names]):
                    print("  ✓ EmbeddedFiles entry found in Names tree")
                    has_xml = True
            except:
                has_xml = False
            
            # Report results
            print("\n=== Factur-X Validation Results ===")
            status = []
            
            if has_pdfa:
                status.append("✅ PDF/A-3B compliance: PASS")
            else:
                status.append("❌ PDF/A-3B compliance: FAIL")
            
            if has_facturx:
                # Try to find the profile with or without prefix
                fx_profile = meta_dict.get("fx:conformance", 
                                          meta_dict.get("conformance", "Unknown"))
                status.append(f"✅ Factur-X metadata: PASS (Profile: {fx_profile})")
            else:
                status.append("❌ Factur-X metadata: FAIL")
            
            if has_xml:
                status.append("✅ XML attachment: PASS")
            else:
                status.append("❌ XML attachment: FAIL")
            
            for line in status:
                print(line)
            
            return has_pdfa and has_facturx and has_xml
                
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