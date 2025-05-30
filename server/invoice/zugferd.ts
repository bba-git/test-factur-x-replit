import { Invoice, InvoiceItem, FacturXProfileEnum } from "@shared/schema";
import { supabase } from "../supabaseClient";
import { logger, WORKFLOW, safeLog } from "../utils/logger";

// Function to generate Factur-X/ZUGFeRD XML
export async function generateZugferdXml(invoice: Invoice, items: InvoiceItem[], fixIssues: boolean = false): Promise<string> {
  try {
    logger.debug({ 
      workflow: WORKFLOW.INVOICE,
      invoiceId: invoice.id,
      customerId: invoice.customer_id,
      companyProfileId: invoice.company_profile_id,
      invoice: safeLog(invoice),
      items: safeLog(items)
    }, 'Starting XML generation');

    // Validate required invoice fields
    if (!invoice.invoice_number || !invoice.issue_date || !invoice.due_date || !invoice.currency) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: invoice.id,
        invoice: safeLog(invoice)
      }, 'Missing required invoice fields');
      throw new Error("Missing required invoice fields (invoice_number, issue_date, due_date, currency)");
    }

    // Validate items
    if (!items || items.length === 0) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: invoice.id
      }, 'No items in invoice');
      throw new Error("Invoice must contain at least one item");
    }

    // Fetch related data from Supabase
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', invoice.customer_id)
      .single();

    if (customerError || !customer) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: invoice.id,
        customerId: invoice.customer_id,
        error: customerError
      }, 'Customer not found');
      throw new Error("Customer not found");
    }

    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('id', invoice.company_profile_id)
      .single();

    if (companyError || !companyProfile) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: invoice.id,
        companyProfileId: invoice.company_profile_id,
        error: companyError
      }, 'Company profile not found');
      throw new Error("Company profile not found");
    }

    // Validate required customer fields
    if (!customer.name || !customer.address || !customer.city || !customer.postal_code || !customer.country) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: invoice.id,
        customer: safeLog(customer)
      }, 'Customer missing required fields');
      throw new Error("Customer missing required fields (name, address, city, postal_code, country)");
    }

    // Validate required company profile fields
    if (!companyProfile.name || !companyProfile.address || !companyProfile.city || 
        !companyProfile.postal_code || !companyProfile.country || !companyProfile.vat_number) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: invoice.id,
        companyProfile: safeLog(companyProfile)
      }, 'Company profile missing required fields');
      throw new Error("Company profile missing required fields (name, address, city, postal_code, country, vat_number)");
    }

    // Validate and format dates
    let formattedIssueDate: string;
    let formattedDueDate: string;
    try {
      const issueDate = new Date(invoice.issue_date);
      const dueDate = new Date(invoice.due_date);
      
      if (isNaN(issueDate.getTime()) || isNaN(dueDate.getTime())) {
        throw new Error("Invalid date format");
      }
      
      formattedIssueDate = issueDate.toISOString().split('T')[0].replace(/-/g, '');
      formattedDueDate = dueDate.toISOString().split('T')[0].replace(/-/g, '');
    } catch (error) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: invoice.id,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        error
      }, 'Error formatting dates');
      throw new Error("Invalid date format in invoice");
    }

    logger.debug({ 
      workflow: WORKFLOW.INVOICE,
      invoiceId: invoice.id,
      formattedIssueDate,
      formattedDueDate
    }, 'Dates formatted successfully');

    // Validate and format numbers
    const subtotal = Number(invoice.subtotal);
    const vatTotal = Number(invoice.vat_total);
    const total = Number(invoice.total);

    if (isNaN(subtotal) || isNaN(vatTotal) || isNaN(total)) {
      logger.error({ 
        workflow: WORKFLOW.INVOICE,
        invoiceId: invoice.id,
        subtotal,
        vatTotal,
        total
      }, 'Invalid number format in invoice');
      throw new Error("Invalid number format in invoice totals");
    }

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
    <ram:ID>${escapeXml(invoice.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formattedIssueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${invoice.notes ? `<ram:IncludedNote>
      <ram:Content>${escapeXml(invoice.notes)}</ram:Content>
    </ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(companyProfile.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(companyProfile.address)}</ram:LineOne>
          <ram:CityName>${escapeXml(companyProfile.city)}</ram:CityName>
          <ram:PostcodeCode>${escapeXml(companyProfile.postal_code)}</ram:PostcodeCode>
          <ram:CountryID>${escapeXml(companyProfile.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${companyProfile.vat_number ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(companyProfile.vat_number)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(customer.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(customer.address)}</ram:LineOne>
          <ram:CityName>${escapeXml(customer.city)}</ram:CityName>
          <ram:PostcodeCode>${escapeXml(customer.postal_code)}</ram:PostcodeCode>
          <ram:CountryID>${escapeXml(customer.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${customer.vat_number ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(customer.vat_number)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>
      ${invoice.purchase_order_ref ? `<ram:BuyerOrderReferencedDocument>
        <ram:IssuerAssignedID>${escapeXml(invoice.purchase_order_ref)}</ram:IssuerAssignedID>
      </ram:BuyerOrderReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formattedIssueDate}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${escapeXml(invoice.invoice_number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${escapeXml(invoice.currency)}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formattedDueDate}</udt:DateTimeString>
        </ram:DueDateDateTime>
        ${invoice.payment_terms ? `<ram:Description>${escapeXml(invoice.payment_terms)}</ram:Description>` : ''}
      </ram:SpecifiedTradePaymentTerms>
      ${generateTaxSummary(items, invoice.currency)}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${subtotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${escapeXml(invoice.currency)}">${vatTotal.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${total.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${total.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
    ${generateLineItems(items, invoice.currency)}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    logger.debug({ 
      workflow: WORKFLOW.INVOICE,
      invoiceId: invoice.id,
      xmlLength: xml.length,
      xmlPreview: xml.substring(0, 100) + '...'
    }, 'XML generated successfully');

    return xml;
  } catch (error) {
    logger.error({ 
      workflow: WORKFLOW.INVOICE,
      error,
      stack: error instanceof Error ? error.stack : undefined,
      invoiceId: invoice.id
    }, 'Error generating Factur-X XML');
    throw error;
  }
}

// Helper function to escape XML special characters
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
    const vatRate = Number(item.vat_rate);
    const vatAmount = (Number(item.unit_price) * Number(item.quantity) * vatRate) / 100;
    
    if (vatRates.has(vatRate)) {
      vatRates.set(vatRate, vatRates.get(vatRate)! + vatAmount);
    } else {
      vatRates.set(vatRate, vatAmount);
    }
  });
  
  let taxSummaryXml = '';
  
  vatRates.forEach((vatAmount, vatRate) => {
    const taxableAmount = items
      .filter(item => Number(item.vat_rate) === vatRate)
      .reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
    
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
    const netAmount = Number(item.unit_price) * Number(item.quantity);
    const vatAmount = (netAmount * Number(item.vat_rate)) / 100;
    
    lineItemsXml += `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${lineNumber}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description)}</ram:Name>
        ${item.product_id ? `<ram:SellerAssignedID>${escapeXml(item.product_id.toString())}</ram:SellerAssignedID>` : ''}
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${Number(item.unit_price).toFixed(2)}</ram:ChargeAmount>
          <ram:BasisQuantity unitCode="${escapeXml(item.unit_of_measure)}">1</ram:BasisQuantity>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${escapeXml(item.unit_of_measure)}">${Number(item.quantity)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${Number(item.vat_rate).toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${netAmount.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  });
  
  return lineItemsXml;
}
