import logging
from pathlib import Path
from typing import Dict, Any
from lxml import etree
from datetime import datetime
from facturxapp.validators.xml_schema_validator import validate_invoice_xml

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class XMLService:
    """Service for generating Factur-X XML from invoice data."""
    
    # XML Namespaces
    NAMESPACES = {
        'rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
        'ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
        'udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
        'qdt': 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100',
    }
    
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"XML service initialized with output directory: {self.output_dir}")

    def generate_facturx_xml(self, invoice_data: Dict[str, Any]) -> Path:
        """
        Generate Factur-X XML from invoice data and save to file.
        
        The XML structure follows EN16931 requirements:
        1. All line items must come first under SupplyChainTradeTransaction
        2. Header agreement (with seller/buyer) must come second
        3. Header delivery must come third
        4. Settlement (with totals) must come last
        
        Args:
            invoice_data (Dict[str, Any]): Invoice data dictionary
        Returns:
            Path: Path to the generated XML file
        """
        logger.info("Generating Factur-X XML from invoice data")
        xml_path = self.output_dir / f"facturx_{invoice_data.get('invoice_number', 'test')}.xml"
        
        # Create XML structure
        root = self._create_root_element()
        
        # Add header information
        self._add_header(root, invoice_data)
        
        # Create transaction node
        transaction = etree.SubElement(root, f'{{{self.NAMESPACES["rsm"]}}}SupplyChainTradeTransaction')
        
        # Add line items (support both 'line_items' and 'items' keys)
        line_items = invoice_data.get('line_items')
        if line_items is None:
            line_items = invoice_data.get('items', [])
        self._add_line_items(transaction, line_items)
        
        # 2. Add header agreement SECOND (contains seller/buyer info)
        self._add_invoice_details(transaction, invoice_data)
        
        # 3. Add header delivery THIRD
        self._add_header_delivery(transaction, invoice_data)
        
        # 4. Add totals LAST
        self._add_totals(transaction, invoice_data)
        
        # Save XML file
        tree = etree.ElementTree(root)
        tree.write(str(xml_path), pretty_print=True, xml_declaration=True, encoding='UTF-8')
        logger.info(f"Factur-X XML generated at {xml_path}")
        print(etree.tostring(root, pretty_print=True).decode())

        # Validate against EN16931 schema
        validate_invoice_xml(root)

        return xml_path

    def _create_root_element(self) -> etree.Element:
        """Create the root element with proper namespaces."""
        nsmap = {k: v for k, v in self.NAMESPACES.items()}
        return etree.Element('{urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100}CrossIndustryInvoice',
                           nsmap=nsmap)

    def _add_header(self, root: etree.Element, data: Dict[str, Any]) -> None:
        """Add header information to the XML."""
        # Add document context
        header = etree.SubElement(root, f'{{{self.NAMESPACES["rsm"]}}}ExchangedDocumentContext')
        guideline = etree.SubElement(header, f'{{{self.NAMESPACES["ram"]}}}GuidelineSpecifiedDocumentContextParameter')
        id_elem = etree.SubElement(guideline, f'{{{self.NAMESPACES["ram"]}}}ID')
        id_elem.text = "urn:factur-x:pdfa:EN16931:2017:compliant"

        # Add document with issue date
        doc = etree.SubElement(root, f'{{{self.NAMESPACES["rsm"]}}}ExchangedDocument')
        
        # Add invoice number
        id_elem = etree.SubElement(doc, f'{{{self.NAMESPACES["ram"]}}}ID')
        id_elem.text = data.get('invoice_number', '')
        
        # Add type code
        type_elem = etree.SubElement(doc, f'{{{self.NAMESPACES["ram"]}}}TypeCode')
        type_elem.text = '380'  # Invoice
        
        # Add issue date
        issue_date = etree.SubElement(doc, f'{{{self.NAMESPACES["ram"]}}}IssueDateTime')
        date_elem = etree.SubElement(issue_date, f'{{{self.NAMESPACES["udt"]}}}DateTimeString')
        date_elem.set('format', '102')
        date_elem.text = data.get('invoice_date', datetime.now().strftime('%Y%m%d')).replace('-', '')

    def _add_header_delivery(self, trade: etree.Element, data: Dict[str, Any]) -> None:
        """Add header delivery information to the XML."""
        delivery = etree.SubElement(trade, f'{{{self.NAMESPACES["ram"]}}}ApplicableHeaderTradeDelivery')
        # Add any delivery-specific information here if needed

    def _add_invoice_details(self, trade: etree.Element, data: Dict[str, Any]) -> None:
        """Add invoice details to the XML."""
        invoice = etree.SubElement(trade, f'{{{self.NAMESPACES["ram"]}}}ApplicableHeaderTradeAgreement')
        
        # SellerTradeParty
        seller = data.get('seller', {})
        seller_party = etree.SubElement(invoice, f'{{{self.NAMESPACES["ram"]}}}SellerTradeParty')
        seller_name = etree.SubElement(seller_party, f'{{{self.NAMESPACES["ram"]}}}Name')
        seller_name.text = seller.get('name', '')
        if 'vat_number' in seller:
            seller_vat = etree.SubElement(seller_party, f'{{{self.NAMESPACES["ram"]}}}SpecifiedTaxRegistration')
            seller_vat_id = etree.SubElement(seller_vat, f'{{{self.NAMESPACES["ram"]}}}ID')
            seller_vat_id.text = seller['vat_number']
        
        # BuyerTradeParty
        buyer = data.get('buyer', {})
        buyer_party = etree.SubElement(invoice, f'{{{self.NAMESPACES["ram"]}}}BuyerTradeParty')
        buyer_name = etree.SubElement(buyer_party, f'{{{self.NAMESPACES["ram"]}}}Name')
        buyer_name.text = buyer.get('name', '')
        if 'vat_number' in buyer:
            buyer_vat = etree.SubElement(buyer_party, f'{{{self.NAMESPACES["ram"]}}}SpecifiedTaxRegistration')
            buyer_vat_id = etree.SubElement(buyer_vat, f'{{{self.NAMESPACES["ram"]}}}ID')
            buyer_vat_id.text = buyer['vat_number']

    def _add_line_items(self, trade: etree.Element, items: list) -> None:
        """Add line items to the XML following EN16931 structure.
        
        Each line item must follow this structure:
        <ram:IncludedSupplyChainTradeLineItem>
          <ram:AssociatedDocumentLineDocument>
            <ram:LineID>...</ram:LineID>
          </ram:AssociatedDocumentLineDocument>
          <ram:SpecifiedTradeProduct>
            <ram:Name>...</ram:Name>
          </ram:SpecifiedTradeProduct>
          <ram:SpecifiedLineTradeAgreement>
            <ram:NetPriceProductTradePrice>
              <ram:ChargeAmount>...</ram:ChargeAmount>
            </ram:NetPriceProductTradePrice>
          </ram:SpecifiedLineTradeAgreement>
          <ram:SpecifiedLineTradeDelivery>
            <ram:BilledQuantity>...</ram:BilledQuantity>
          </ram:SpecifiedLineTradeDelivery>
          <ram:SpecifiedLineTradeSettlement>
            <ram:ApplicableTradeTax>
              <ram:TypeCode>...</ram:TypeCode>
              <ram:RateApplicablePercent>...</ram:RateApplicablePercent>
            </ram:ApplicableTradeTax>
            <ram:SpecifiedTradeSettlementLineMonetarySummation>
              <ram:LineTotalAmount>...</ram:LineTotalAmount>
            </ram:SpecifiedTradeSettlementLineMonetarySummation>
          </ram:SpecifiedLineTradeSettlement>
        </ram:IncludedSupplyChainTradeLineItem>
        """
        for idx, item in enumerate(items, 1):
            # Create the line item container
            line_item = etree.SubElement(trade, f'{{{self.NAMESPACES["ram"]}}}IncludedSupplyChainTradeLineItem')
            
            # 1. Associated Document Line Document (MUST be first)
            line_doc = etree.SubElement(line_item, f'{{{self.NAMESPACES["ram"]}}}AssociatedDocumentLineDocument')
            line_id = etree.SubElement(line_doc, f'{{{self.NAMESPACES["ram"]}}}LineID')
            line_id.text = str(idx)
            
            # 2. Specified Trade Product (MUST be second)
            product = etree.SubElement(line_item, f'{{{self.NAMESPACES["ram"]}}}SpecifiedTradeProduct')
            name = etree.SubElement(product, f'{{{self.NAMESPACES["ram"]}}}Name')
            name.text = str(item.get('description', ''))
            
            # 3. Specified Line Trade Agreement (MUST be third)
            agreement = etree.SubElement(line_item, f'{{{self.NAMESPACES["ram"]}}}SpecifiedLineTradeAgreement')
            # NetPriceProductTradePrice (REQUIRED by EN16931)
            net_price = etree.SubElement(agreement, f'{{{self.NAMESPACES["ram"]}}}NetPriceProductTradePrice')
            net_amount = etree.SubElement(net_price, f'{{{self.NAMESPACES["ram"]}}}ChargeAmount')
            net_amount.text = str(item.get('unit_price', 0))
            
            # 4. Specified Line Trade Delivery (MUST be fourth)
            delivery = etree.SubElement(line_item, f'{{{self.NAMESPACES["ram"]}}}SpecifiedLineTradeDelivery')
            quantity = etree.SubElement(delivery, f'{{{self.NAMESPACES["ram"]}}}BilledQuantity')
            quantity.set('unitCode', 'C62')  # Standard unit code for pieces
            quantity.text = str(item.get('quantity', 0))
            
            # 5. Specified Line Trade Settlement (MUST be last)
            settlement = etree.SubElement(line_item, f'{{{self.NAMESPACES["ram"]}}}SpecifiedLineTradeSettlement')
            
            # Add tax information
            tax = etree.SubElement(settlement, f'{{{self.NAMESPACES["ram"]}}}ApplicableTradeTax')
            etree.SubElement(tax, f'{{{self.NAMESPACES["ram"]}}}TypeCode').text = 'VAT'
            etree.SubElement(tax, f'{{{self.NAMESPACES["ram"]}}}CategoryCode').text = 'S'
            etree.SubElement(tax, f'{{{self.NAMESPACES["ram"]}}}RateApplicablePercent').text = str(20)
            
            # Add line total
            summation = etree.SubElement(settlement, f'{{{self.NAMESPACES["ram"]}}}SpecifiedTradeSettlementLineMonetarySummation')
            line_total = etree.SubElement(summation, f'{{{self.NAMESPACES["ram"]}}}LineTotalAmount')
            # Calculate line total: quantity * unit_price
            total = float(item.get('quantity', 0)) * float(item.get('unit_price', 0))
            line_total.text = str(total)

    def _add_totals(self, trade: etree.Element, data: Dict[str, Any]) -> None:
        """Add totals to the XML."""
        totals = etree.SubElement(trade, f'{{{self.NAMESPACES["ram"]}}}ApplicableHeaderTradeSettlement')
        
        # 1. CreditorReferenceID (optional)
        if 'creditor_reference' in data:
            creditor_ref = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}CreditorReferenceID')
            creditor_ref.text = data['creditor_reference']

        # 2. PaymentReference (optional)
        if 'payment_reference' in data:
            payment_ref = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}PaymentReference')
            payment_ref.text = data['payment_reference']

        # 3. TaxCurrencyCode (optional)
        if 'tax_currency' in data:
            tax_currency = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}TaxCurrencyCode')
            tax_currency.text = data['tax_currency']

        # 4. InvoiceCurrencyCode (required)
        currency = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}InvoiceCurrencyCode')
        currency.text = data.get('currency', 'EUR')

        # 5. PayeeTradeParty (optional)
        if 'payee' in data:
            payee = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}PayeeTradeParty')
            payee_name = etree.SubElement(payee, f'{{{self.NAMESPACES["ram"]}}}Name')
            payee_name.text = data['payee'].get('name', '')

        # 6. SpecifiedTradeSettlementPaymentMeans (optional)
        payment_means = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}SpecifiedTradeSettlementPaymentMeans')
        payment_type = etree.SubElement(payment_means, f'{{{self.NAMESPACES["ram"]}}}TypeCode')
        payment_type.text = '42'  # Bank transfer

        # 7. ApplicableTradeTax (required)
        tax = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}ApplicableTradeTax')
        tax_type = etree.SubElement(tax, f'{{{self.NAMESPACES["ram"]}}}TypeCode')
        tax_type.text = 'VAT'
        tax_category = etree.SubElement(tax, f'{{{self.NAMESPACES["ram"]}}}CategoryCode')
        tax_category.text = 'S'
        tax_rate = etree.SubElement(tax, f'{{{self.NAMESPACES["ram"]}}}RateApplicablePercent')
        tax_rate.text = str(data.get('tax', 20))

        # 8. BillingSpecifiedPeriod (optional)
        if 'billing_period' in data:
            billing_period = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}BillingSpecifiedPeriod')
            start_date = etree.SubElement(billing_period, f'{{{self.NAMESPACES["ram"]}}}StartDateTime')
            start_date_elem = etree.SubElement(start_date, f'{{{self.NAMESPACES["udt"]}}}DateTimeString')
            start_date_elem.set('format', '102')
            start_date_elem.text = data['billing_period']['start'].replace('-', '')
            end_date = etree.SubElement(billing_period, f'{{{self.NAMESPACES["ram"]}}}EndDateTime')
            end_date_elem = etree.SubElement(end_date, f'{{{self.NAMESPACES["udt"]}}}DateTimeString')
            end_date_elem.set('format', '102')
            end_date_elem.text = data['billing_period']['end'].replace('-', '')

        # 9. SpecifiedTradeAllowanceCharge (optional)
        if 'allowances' in data:
            for allowance in data['allowances']:
                allowance_elem = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}SpecifiedTradeAllowanceCharge')
                charge_indicator = etree.SubElement(allowance_elem, f'{{{self.NAMESPACES["ram"]}}}ChargeIndicator')
                charge_indicator.text = 'false'
                actual_amount = etree.SubElement(allowance_elem, f'{{{self.NAMESPACES["ram"]}}}ActualAmount')
                actual_amount.text = str(allowance['amount'])

        # 10. SpecifiedTradePaymentTerms (optional)
        if 'due_date' in data:
            payment_terms = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}SpecifiedTradePaymentTerms')
            due_date = etree.SubElement(payment_terms, f'{{{self.NAMESPACES["ram"]}}}DueDateDateTime')
            due_date_elem = etree.SubElement(due_date, f'{{{self.NAMESPACES["udt"]}}}DateTimeString')
            due_date_elem.set('format', '102')
            due_date_elem.text = data['due_date'].replace('-', '')

        # 11. SpecifiedTradeSettlementHeaderMonetarySummation (required)
        monetary_summation = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}SpecifiedTradeSettlementHeaderMonetarySummation')
        total_amount = etree.SubElement(monetary_summation, f'{{{self.NAMESPACES["ram"]}}}GrandTotalAmount')
        total_amount.text = str(data.get('total_amount', 0))

        # 12. InvoiceReferencedDocument (optional)
        if 'referenced_documents' in data:
            for doc in data['referenced_documents']:
                ref_doc = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}InvoiceReferencedDocument')
                doc_id = etree.SubElement(ref_doc, f'{{{self.NAMESPACES["ram"]}}}IssuerAssignedID')
                doc_id.text = doc['id']

        # 13. ReceivableSpecifiedTradeAccountingAccount (optional)
        if 'accounting_account' in data:
            account = etree.SubElement(totals, f'{{{self.NAMESPACES["ram"]}}}ReceivableSpecifiedTradeAccountingAccount')
            account_id = etree.SubElement(account, f'{{{self.NAMESPACES["ram"]}}}ID')
            account_id.text = data['accounting_account'] 