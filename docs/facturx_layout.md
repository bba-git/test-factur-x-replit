# Factur-X EN16931 XML Structure Reference

This document defines the required structure for EN16931-compliant Factur-X XML files.

## Root Structure

```xml
<rsm:CrossIndustryInvoice>
  <!-- Created by _create_root_element() -->
  
  <rsm:ExchangedDocumentContext>
    <!-- Created by _add_header() -->
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>EN16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <!-- Created by _add_header() -->
    <ram:ID>INV-2024-001</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20240214</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    <!-- Created in generate_facturx_xml() -->
    
    <!-- MUST COME FIRST: Line Items -->
    <ram:IncludedSupplyChainTradeLineItem>
      <!-- Created by _add_line_items() -->
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>Product Description</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:GrossPriceProductTradePrice>
          <ram:ChargeAmount>100.00</ram:ChargeAmount>
        </ram:GrossPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">1</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>20</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementMonetarySummation>
          <ram:LineTotalAmount>100.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>

    <!-- MUST COME SECOND: Header Agreement -->
    <ram:ApplicableHeaderTradeAgreement>
      <!-- Created by _add_invoice_details() -->
      <ram:ID>INV-2024-001</ram:ID>
      <ram:SellerTradeParty>
        <ram:Name>Seller Name</ram:Name>
        <ram:SpecifiedTaxRegistration>
          <ram:ID>DE123456789</ram:ID>
          <ram:TaxTypeCode>VA</ram:TaxTypeCode>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Buyer Name</ram:Name>
        <ram:SpecifiedTaxRegistration>
          <ram:ID>DE987654321</ram:ID>
          <ram:TaxTypeCode>VA</ram:TaxTypeCode>
        </ram:SpecifiedTaxRegistration>
      </ram:BuyerTradeParty>
      <ram:DueDateDateTime>
        <ram:DateTimeString>2024-03-14</ram:DateTimeString>
      </ram:DueDateDateTime>
    </ram:ApplicableHeaderTradeAgreement>

    <!-- MUST COME LAST: Settlement -->
    <ram:ApplicableHeaderTradeSettlement>
      <!-- Created by _add_totals() -->
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>100.00</ram:LineTotalAmount>
        <ram:GrandTotalAmount>120.00</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
```

## Function Responsibilities

1. `_create_root_element()`: Creates root `<rsm:CrossIndustryInvoice>` with namespaces
2. `_add_header()`: Creates document context and basic invoice info
3. `_add_line_items()`: Creates all line items (MUST come first under transaction)
4. `_add_invoice_details()`: Creates header agreement with seller/buyer info (MUST come second)
5. `_add_totals()`: Creates settlement with totals (MUST come last)

## Order Requirements

Under `<rsm:SupplyChainTradeTransaction>`, elements MUST appear in this order:
1. All `<ram:IncludedSupplyChainTradeLineItem>` elements
2. `<ram:ApplicableHeaderTradeAgreement>`
3. `<ram:ApplicableHeaderTradeSettlement>`

## Namespaces

```python
NAMESPACES = {
    'rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
    'ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
    'udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
    'qdt': 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100',
}
``` 