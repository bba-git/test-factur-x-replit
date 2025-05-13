#!/usr/bin/env python3
"""
Factur-X XML Generator

This script generates a Factur-X (EN16931) compliant XML from invoice data.
"""

import json
import argparse
from lxml import etree
from datetime import datetime

NAMESPACES = {
    'rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
    'ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
    'udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100'
}

def format_date(date_str):
    """Format date from YYYY-MM-DD to YYYYMMDD for Factur-X"""
    try:
        # Parse the date and reformat it
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%Y%m%d")
    except ValueError:
        # If the date is already in the right format or invalid, return it as-is
        return date_str.replace('-', '')

def generate_facturx_xml(invoice_data, output_file):
    """
    Generate Factur-X XML from invoice data
    
    Args:
        invoice_data (dict): Invoice data in dictionary format
        output_file (str): Path where the XML file will be saved
    """
    print(f"Generating Factur-X XML from invoice data...")
    
    # Create XML document with namespaces
    root = etree.Element(f"{{{NAMESPACES['rsm']}}}CrossIndustryInvoice", nsmap=NAMESPACES)
    
    # Document context
    context = etree.SubElement(root, f"{{{NAMESPACES['rsm']}}}ExchangedDocumentContext")
    guideline = etree.SubElement(context, f"{{{NAMESPACES['ram']}}}GuidelineSpecifiedDocumentContextParameter")
    guideline_id = etree.SubElement(guideline, f"{{{NAMESPACES['ram']}}}ID")
    guideline_id.text = "urn:cen.eu:en16931:2017" # EN16931 profile
    
    # Document header
    doc = etree.SubElement(root, f"{{{NAMESPACES['rsm']}}}ExchangedDocument")
    doc_id = etree.SubElement(doc, f"{{{NAMESPACES['ram']}}}ID")
    doc_id.text = invoice_data.get('invoice_number', '')
    
    doc_type = etree.SubElement(doc, f"{{{NAMESPACES['ram']}}}TypeCode")
    doc_type.text = "380"  # 380 is the code for invoice
    
    issue_date = etree.SubElement(doc, f"{{{NAMESPACES['ram']}}}IssueDateTime")
    date_str = etree.SubElement(issue_date, f"{{{NAMESPACES['udt']}}}DateTimeString")
    date_str.text = format_date(invoice_data.get('issue_date', ''))
    date_str.set('format', '102')  # Format 102 represents YYYYMMDD
    
    if 'notes' in invoice_data and invoice_data['notes']:
        note = etree.SubElement(doc, f"{{{NAMESPACES['ram']}}}IncludedNote")
        note_content = etree.SubElement(note, f"{{{NAMESPACES['ram']}}}Content")
        note_content.text = invoice_data.get('notes', '')
    
    # Supply Chain Transaction
    transaction = etree.SubElement(root, f"{{{NAMESPACES['rsm']}}}SupplyChainTradeTransaction")
    
    # Header Trade Agreement
    agreement = etree.SubElement(transaction, f"{{{NAMESPACES['ram']}}}ApplicableHeaderTradeAgreement")
    
    # Seller details
    seller = etree.SubElement(agreement, f"{{{NAMESPACES['ram']}}}SellerTradeParty")
    seller_name = etree.SubElement(seller, f"{{{NAMESPACES['ram']}}}Name")
    seller_name.text = invoice_data.get('seller', {}).get('name', '')
    
    seller_address = etree.SubElement(seller, f"{{{NAMESPACES['ram']}}}PostalTradeAddress")
    seller_line = etree.SubElement(seller_address, f"{{{NAMESPACES['ram']}}}LineOne")
    seller_line.text = invoice_data.get('seller', {}).get('address', '')
    seller_city = etree.SubElement(seller_address, f"{{{NAMESPACES['ram']}}}CityName")
    seller_city.text = invoice_data.get('seller', {}).get('city', '')
    seller_postcode = etree.SubElement(seller_address, f"{{{NAMESPACES['ram']}}}PostcodeCode")
    seller_postcode.text = invoice_data.get('seller', {}).get('postal_code', '')
    seller_country = etree.SubElement(seller_address, f"{{{NAMESPACES['ram']}}}CountryID")
    seller_country.text = invoice_data.get('seller', {}).get('country', '')
    
    # Seller tax registration
    if 'vat_number' in invoice_data.get('seller', {}):
        seller_tax = etree.SubElement(seller, f"{{{NAMESPACES['ram']}}}SpecifiedTaxRegistration")
        seller_tax_id = etree.SubElement(seller_tax, f"{{{NAMESPACES['ram']}}}ID")
        seller_tax_id.text = invoice_data.get('seller', {}).get('vat_number', '')
        seller_tax_id.set('schemeID', 'VA')
    
    # Buyer details
    buyer = etree.SubElement(agreement, f"{{{NAMESPACES['ram']}}}BuyerTradeParty")
    buyer_name = etree.SubElement(buyer, f"{{{NAMESPACES['ram']}}}Name")
    buyer_name.text = invoice_data.get('buyer', {}).get('name', '')
    
    buyer_address = etree.SubElement(buyer, f"{{{NAMESPACES['ram']}}}PostalTradeAddress")
    buyer_line = etree.SubElement(buyer_address, f"{{{NAMESPACES['ram']}}}LineOne")
    buyer_line.text = invoice_data.get('buyer', {}).get('address', '')
    buyer_city = etree.SubElement(buyer_address, f"{{{NAMESPACES['ram']}}}CityName")
    buyer_city.text = invoice_data.get('buyer', {}).get('city', '')
    buyer_postcode = etree.SubElement(buyer_address, f"{{{NAMESPACES['ram']}}}PostcodeCode")
    buyer_postcode.text = invoice_data.get('buyer', {}).get('postal_code', '')
    buyer_country = etree.SubElement(buyer_address, f"{{{NAMESPACES['ram']}}}CountryID")
    buyer_country.text = invoice_data.get('buyer', {}).get('country', '')
    
    # Buyer tax registration
    if 'vat_number' in invoice_data.get('buyer', {}):
        buyer_tax = etree.SubElement(buyer, f"{{{NAMESPACES['ram']}}}SpecifiedTaxRegistration")
        buyer_tax_id = etree.SubElement(buyer_tax, f"{{{NAMESPACES['ram']}}}ID")
        buyer_tax_id.text = invoice_data.get('buyer', {}).get('vat_number', '')
        buyer_tax_id.set('schemeID', 'VA')
    
    # Purchase order reference
    if 'purchase_order_ref' in invoice_data and invoice_data['purchase_order_ref']:
        order_ref = etree.SubElement(agreement, f"{{{NAMESPACES['ram']}}}BuyerOrderReferencedDocument")
        order_id = etree.SubElement(order_ref, f"{{{NAMESPACES['ram']}}}IssuerAssignedID")
        order_id.text = invoice_data.get('purchase_order_ref', '')
    
    # Delivery
    delivery = etree.SubElement(transaction, f"{{{NAMESPACES['ram']}}}ApplicableHeaderTradeDelivery")
    delivery_event = etree.SubElement(delivery, f"{{{NAMESPACES['ram']}}}ActualDeliverySupplyChainEvent")
    delivery_date = etree.SubElement(delivery_event, f"{{{NAMESPACES['ram']}}}OccurrenceDateTime")
    delivery_date_str = etree.SubElement(delivery_date, f"{{{NAMESPACES['udt']}}}DateTimeString")
    delivery_date_str.text = format_date(invoice_data.get('issue_date', ''))  # Using issue date as delivery date
    delivery_date_str.set('format', '102')
    
    # Settlement
    settlement = etree.SubElement(transaction, f"{{{NAMESPACES['ram']}}}ApplicableHeaderTradeSettlement")
    
    payment_ref = etree.SubElement(settlement, f"{{{NAMESPACES['ram']}}}PaymentReference")
    payment_ref.text = invoice_data.get('invoice_number', '')
    
    currency = etree.SubElement(settlement, f"{{{NAMESPACES['ram']}}}InvoiceCurrencyCode")
    currency.text = invoice_data.get('currency', 'EUR')
    
    # Payment terms
    terms = etree.SubElement(settlement, f"{{{NAMESPACES['ram']}}}SpecifiedTradePaymentTerms")
    due_date = etree.SubElement(terms, f"{{{NAMESPACES['ram']}}}DueDateDateTime")
    due_date_str = etree.SubElement(due_date, f"{{{NAMESPACES['udt']}}}DateTimeString")
    due_date_str.text = format_date(invoice_data.get('due_date', ''))
    due_date_str.set('format', '102')
    
    if 'payment_terms' in invoice_data and invoice_data['payment_terms']:
        terms_desc = etree.SubElement(terms, f"{{{NAMESPACES['ram']}}}Description")
        terms_desc.text = invoice_data.get('payment_terms', '')
    
    # Tax details
    # Group items by tax rate
    tax_rates = {}
    for item in invoice_data.get('items', []):
        rate = item.get('vat_rate', 0)
        if rate not in tax_rates:
            tax_rates[rate] = 0
        # Add line total to the tax rate group
        tax_rates[rate] += item.get('quantity', 0) * item.get('unit_price', 0)
    
    # Create tax entries for each rate
    for rate, base_amount in tax_rates.items():
        tax = etree.SubElement(settlement, f"{{{NAMESPACES['ram']}}}ApplicableTradeTax")
        
        tax_amount = etree.SubElement(tax, f"{{{NAMESPACES['ram']}}}CalculatedAmount")
        tax_amount.text = f"{(base_amount * rate / 100):.2f}"
        
        tax_type = etree.SubElement(tax, f"{{{NAMESPACES['ram']}}}TypeCode")
        tax_type.text = "VAT"
        
        tax_base = etree.SubElement(tax, f"{{{NAMESPACES['ram']}}}BasisAmount")
        tax_base.text = f"{base_amount:.2f}"
        
        tax_category = etree.SubElement(tax, f"{{{NAMESPACES['ram']}}}CategoryCode")
        tax_category.text = "S"  # Standard rate
        
        tax_rate = etree.SubElement(tax, f"{{{NAMESPACES['ram']}}}RateApplicablePercent")
        tax_rate.text = f"{rate:.2f}"
    
    # Monetary summary
    summary = etree.SubElement(settlement, f"{{{NAMESPACES['ram']}}}SpecifiedTradeSettlementHeaderMonetarySummation")
    
    line_total = etree.SubElement(summary, f"{{{NAMESPACES['ram']}}}LineTotalAmount")
    line_total.text = f"{invoice_data.get('subtotal', 0):.2f}"
    
    tax_basis = etree.SubElement(summary, f"{{{NAMESPACES['ram']}}}TaxBasisTotalAmount")
    tax_basis.text = f"{invoice_data.get('subtotal', 0):.2f}"
    
    tax_total = etree.SubElement(summary, f"{{{NAMESPACES['ram']}}}TaxTotalAmount")
    tax_total.text = f"{invoice_data.get('vat_total', 0):.2f}"
    tax_total.set('currencyID', invoice_data.get('currency', 'EUR'))
    
    grand_total = etree.SubElement(summary, f"{{{NAMESPACES['ram']}}}GrandTotalAmount")
    grand_total.text = f"{invoice_data.get('total', 0):.2f}"
    
    due_total = etree.SubElement(summary, f"{{{NAMESPACES['ram']}}}DuePayableAmount")
    due_total.text = f"{invoice_data.get('total', 0):.2f}"
    
    # Line items
    for idx, item in enumerate(invoice_data.get('items', []), 1):
        line_item = etree.SubElement(transaction, f"{{{NAMESPACES['rsm']}}}IncludedSupplyChainTradeLineItem")
        
        line_doc = etree.SubElement(line_item, f"{{{NAMESPACES['ram']}}}AssociatedDocumentLineDocument")
        line_id = etree.SubElement(line_doc, f"{{{NAMESPACES['ram']}}}LineID")
        line_id.text = str(idx)
        
        line_product = etree.SubElement(line_item, f"{{{NAMESPACES['ram']}}}SpecifiedTradeProduct")
        product_name = etree.SubElement(line_product, f"{{{NAMESPACES['ram']}}}Name")
        product_name.text = item.get('description', '')
        
        if 'product_id' in item:
            product_id = etree.SubElement(line_product, f"{{{NAMESPACES['ram']}}}SellerAssignedID")
            product_id.text = str(item.get('product_id', ''))
        
        line_agreement = etree.SubElement(line_item, f"{{{NAMESPACES['ram']}}}SpecifiedLineTradeAgreement")
        net_price = etree.SubElement(line_agreement, f"{{{NAMESPACES['ram']}}}NetPriceProductTradePrice")
        price_amount = etree.SubElement(net_price, f"{{{NAMESPACES['ram']}}}ChargeAmount")
        price_amount.text = f"{item.get('unit_price', 0):.2f}"
        basis_qty = etree.SubElement(net_price, f"{{{NAMESPACES['ram']}}}BasisQuantity")
        basis_qty.text = "1"
        basis_qty.set('unitCode', item.get('unit_of_measure', 'EA'))
        
        line_delivery = etree.SubElement(line_item, f"{{{NAMESPACES['ram']}}}SpecifiedLineTradeDelivery")
        billed_qty = etree.SubElement(line_delivery, f"{{{NAMESPACES['ram']}}}BilledQuantity")
        billed_qty.text = str(item.get('quantity', 0))
        billed_qty.set('unitCode', item.get('unit_of_measure', 'EA'))
        
        line_settlement = etree.SubElement(line_item, f"{{{NAMESPACES['ram']}}}SpecifiedLineTradeSettlement")
        
        line_tax = etree.SubElement(line_settlement, f"{{{NAMESPACES['ram']}}}ApplicableTradeTax")
        line_tax_type = etree.SubElement(line_tax, f"{{{NAMESPACES['ram']}}}TypeCode")
        line_tax_type.text = "VAT"
        line_tax_cat = etree.SubElement(line_tax, f"{{{NAMESPACES['ram']}}}CategoryCode")
        line_tax_cat.text = "S"  # Standard rate
        line_tax_rate = etree.SubElement(line_tax, f"{{{NAMESPACES['ram']}}}RateApplicablePercent")
        line_tax_rate.text = f"{item.get('vat_rate', 0):.2f}"
        
        line_total_elem = etree.SubElement(line_settlement, f"{{{NAMESPACES['ram']}}}SpecifiedTradeSettlementLineMonetarySummation")
        line_amount = etree.SubElement(line_total_elem, f"{{{NAMESPACES['ram']}}}LineTotalAmount")
        net_amount = item.get('quantity', 0) * item.get('unit_price', 0)
        line_amount.text = f"{net_amount:.2f}"
    
    # Write XML to file
    tree = etree.ElementTree(root)
    tree.write(output_file, pretty_print=True, xml_declaration=True, encoding='UTF-8')
    
    print(f"Successfully generated Factur-X XML: {output_file}")
    return True

def main():
    parser = argparse.ArgumentParser(description="Generate Factur-X XML from invoice data")
    parser.add_argument("json_file", help="Path to JSON file containing invoice data")
    parser.add_argument("--output", "-o", help="Path to output XML file (default: factur-x.xml)")
    
    args = parser.parse_args()
    
    json_file = args.json_file
    output_file = args.output or "factur-x.xml"
    
    try:
        with open(json_file, 'r') as f:
            invoice_data = json.load(f)
        
        generate_facturx_xml(invoice_data, output_file)
    except FileNotFoundError:
        print(f"Error: JSON file '{json_file}' not found")
    except json.JSONDecodeError:
        print(f"Error: '{json_file}' is not a valid JSON file")
    except Exception as e:
        print(f"Error generating XML: {e}")

if __name__ == "__main__":
    main()