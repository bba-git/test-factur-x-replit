import { Invoice, InvoiceItem, FacturXProfileEnum } from "@shared/schema";
import { storage } from "../storage";

// Function to generate Factur-X/ZUGFeRD XML
export async function generateZugferdXml(invoice: Invoice, items: InvoiceItem[], fixIssues: boolean = false): Promise<string> {
  try {
    // Fetch related data
    const customer = await storage.getCustomer(invoice.customerId);
    const companyProfile = await storage.getCompanyProfile(invoice.companyProfileId);
    
    if (!customer || !companyProfile) {
      throw new Error("Customer or company profile not found");
    }

    const issueDate = new Date(invoice.issueDate);
    const dueDate = new Date(invoice.dueDate);
    
    // Format date according to the ISO 8601 standard (YYYY-MM-DD)
    const formattedIssueDate = issueDate.toISOString().split('T')[0];
    const formattedDueDate = dueDate.toISOString().split('T')[0];
    
    // Build the XML based on the selected profile
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${getProfileGuideline(invoice.profile as keyof typeof FacturXProfileEnum.enum)}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${invoice.invoiceNumber}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formattedIssueDate.replace(/-/g, '')}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${invoice.notes ? `<ram:IncludedNote>
      <ram:Content>${invoice.notes}</ram:Content>
    </ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${companyProfile.name}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${companyProfile.address}</ram:LineOne>
          <ram:CityName>${companyProfile.city}</ram:CityName>
          <ram:PostcodeCode>${companyProfile.postalCode}</ram:PostcodeCode>
          <ram:CountryID>${companyProfile.country}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${companyProfile.vatNumber ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${companyProfile.vatNumber}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${customer.name}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${customer.address}</ram:LineOne>
          <ram:CityName>${customer.city}</ram:CityName>
          <ram:PostcodeCode>${customer.postalCode}</ram:PostcodeCode>
          <ram:CountryID>${customer.country}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${customer.vatNumber ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${customer.vatNumber}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>
      ${invoice.purchaseOrderRef ? `<ram:BuyerOrderReferencedDocument>
        <ram:IssuerAssignedID>${invoice.purchaseOrderRef}</ram:IssuerAssignedID>
      </ram:BuyerOrderReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formattedIssueDate.replace(/-/g, '')}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${invoice.invoiceNumber}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${invoice.currency}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formattedDueDate.replace(/-/g, '')}</udt:DateTimeString>
        </ram:DueDateDateTime>
        ${invoice.paymentTerms ? `<ram:Description>${invoice.paymentTerms}</ram:Description>` : ''}
      </ram:SpecifiedTradePaymentTerms>
      ${generateTaxSummary(items, invoice.currency)}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${invoice.subtotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${invoice.subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency}">${invoice.vatTotal.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${invoice.total.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${invoice.total.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
    ${generateLineItems(items, invoice.currency)}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    return xml;
  } catch (error) {
    console.error("Error generating Factur-X XML:", error);
    throw new Error("Failed to generate Factur-X XML");
  }
}

function getProfileGuideline(profile: keyof typeof FacturXProfileEnum.enum): string {
  switch (profile) {
    case "MINIMUM":
      return "urn:factur-x.eu:1p0:minimum";
    case "BASIC_WL":
      return "urn:factur-x.eu:1p0:basicwl";
    case "EN16931":
      return "urn:cen.eu:en16931:2017";
    default:
      return "urn:cen.eu:en16931:2017";
  }
}

function generateTaxSummary(items: InvoiceItem[], currency: string): string {
  // Group items by VAT rate
  const vatRates = new Map<number, number>();
  
  items.forEach(item => {
    const vatRate = item.vatRate;
    const vatAmount = (item.unitPrice * item.quantity * vatRate) / 100;
    
    if (vatRates.has(vatRate)) {
      vatRates.set(vatRate, vatRates.get(vatRate)! + vatAmount);
    } else {
      vatRates.set(vatRate, vatAmount);
    }
  });
  
  let taxSummaryXml = '';
  
  vatRates.forEach((vatAmount, vatRate) => {
    const taxableAmount = items
      .filter(item => item.vatRate === vatRate)
      .reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    taxSummaryXml += `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${vatAmount.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${taxableAmount.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${vatRate.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`;
  });
  
  return taxSummaryXml;
}

function generateLineItems(items: InvoiceItem[], currency: string): string {
  let lineItemsXml = '';
  
  items.forEach((item, index) => {
    const lineNumber = index + 1;
    const netAmount = item.unitPrice * item.quantity;
    const vatAmount = (netAmount * item.vatRate) / 100;
    
    lineItemsXml += `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${lineNumber}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${item.description}</ram:Name>
        ${item.productId ? `<ram:SellerAssignedID>${item.productId}</ram:SellerAssignedID>` : ''}
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unitPrice.toFixed(2)}</ram:ChargeAmount>
          <ram:BasisQuantity unitCode="${item.unitOfMeasure}">1</ram:BasisQuantity>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${item.unitOfMeasure}">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${item.vatRate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${netAmount.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  });
  
  return lineItemsXml;
}
