import { FacturXProfileEnum } from "@shared/schema";
import { DOMParser } from "xmldom";

// Function to validate invoice XML against Factur-X/ZUGFeRD standard
export async function validateInvoice(
  xmlContent: string,
  profile: string
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Parse the XML for validation
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "application/xml");
    
    // Validate based on the profile
    switch (profile as keyof typeof FacturXProfileEnum.enum) {
      case "MINIMUM":
        validateMinimumProfile(xmlDoc, errors);
        break;
      case "BASIC_WL":
        validateBasicWLProfile(xmlDoc, errors);
        break;
      case "EN16931":
        validateEN16931Profile(xmlDoc, errors);
        break;
      default:
        validateEN16931Profile(xmlDoc, errors);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error("Error validating invoice:", error);
    errors.push("XML parsing error: Invalid XML structure");
    
    return {
      isValid: false,
      errors
    };
  }
}

// Validation for MINIMUM profile
function validateMinimumProfile(xmlDoc: Document, errors: string[]): void {
  // Check for required fields in MINIMUM profile
  validatePresence(xmlDoc, "//rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:ID", "Invoice number is missing", errors);
  validatePresence(xmlDoc, "//rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:TypeCode", "Invoice type code is missing", errors);
  validatePresence(xmlDoc, "//rsm:CrossIndustryInvoice/rsm:ExchangedDocument/ram:IssueDateTime", "Invoice issue date is missing", errors);
  
  // Seller information
  validatePresence(xmlDoc, "//ram:SellerTradeParty/ram:Name", "Seller name is missing", errors);
  
  // Buyer information
  validatePresence(xmlDoc, "//ram:BuyerTradeParty/ram:Name", "Buyer name is missing", errors);
  
  // Payment information
  validatePresence(xmlDoc, "//ram:ApplicableHeaderTradeSettlement/ram:InvoiceCurrencyCode", "Invoice currency code is missing", errors);
  validatePresence(xmlDoc, "//ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:GrandTotalAmount", "Grand total amount is missing", errors);
  
  // Check currency code format
  validateCurrencyCode(xmlDoc, errors);
  
  // Check date format
  validateDateFormat(xmlDoc, errors);
}

// Validation for BASIC WL profile (includes MINIMUM and additional fields)
function validateBasicWLProfile(xmlDoc: Document, errors: string[]): void {
  // First, validate MINIMUM profile requirements
  validateMinimumProfile(xmlDoc, errors);
  
  // Additional BASIC WL requirements
  validatePresence(xmlDoc, "//ram:SellerTradeParty/ram:PostalTradeAddress", "Seller postal address is missing", errors);
  validatePresence(xmlDoc, "//ram:BuyerTradeParty/ram:PostalTradeAddress", "Buyer postal address is missing", errors);
  
  // Payment terms
  validatePresence(xmlDoc, "//ram:SpecifiedTradePaymentTerms", "Payment terms are missing", errors);
  
  // Line items
  validatePresence(xmlDoc, "//ram:IncludedSupplyChainTradeLineItem", "Line items are missing", errors);
  
  // Tax summary
  validatePresence(xmlDoc, "//ram:ApplicableTradeTax", "Tax information is missing", errors);
  
  // Line item details
  const lineItems = xmlDoc.getElementsByTagName("ram:IncludedSupplyChainTradeLineItem");
  for (let i = 0; i < lineItems.length; i++) {
    const lineItem = lineItems[i];
    
    // Check if each line item has required fields
    if (!lineItem.getElementsByTagName("ram:LineID").length) {
      errors.push(`Line item #${i + 1}: Line ID is missing`);
    }
    
    if (!lineItem.getElementsByTagName("ram:Name").length) {
      errors.push(`Line item #${i + 1}: Product name is missing`);
    }
    
    if (!lineItem.getElementsByTagName("ram:BilledQuantity").length) {
      errors.push(`Line item #${i + 1}: Billed quantity is missing`);
    }
    
    if (!lineItem.getElementsByTagName("ram:LineTotalAmount").length) {
      errors.push(`Line item #${i + 1}: Line total amount is missing`);
    }
  }
}

// Validation for EN16931 profile (most comprehensive profile)
function validateEN16931Profile(xmlDoc: Document, errors: string[]): void {
  // First, validate BASIC WL profile requirements
  validateBasicWLProfile(xmlDoc, errors);
  
  // Additional EN16931 requirements
  
  // Seller VAT identification
  validatePresence(xmlDoc, "//ram:SellerTradeParty/ram:SpecifiedTaxRegistration/ram:ID[@schemeID='VA']", "Seller VAT number is missing", errors);
  
  // Detailed postal addresses
  validatePresence(xmlDoc, "//ram:SellerTradeParty/ram:PostalTradeAddress/ram:CountryID", "Seller country code is missing", errors);
  validatePresence(xmlDoc, "//ram:BuyerTradeParty/ram:PostalTradeAddress/ram:CountryID", "Buyer country code is missing", errors);
  
  // Detailed line items
  const lineItems = xmlDoc.getElementsByTagName("ram:IncludedSupplyChainTradeLineItem");
  for (let i = 0; i < lineItems.length; i++) {
    const lineItem = lineItems[i];
    
    // Check for unit price
    if (!lineItem.getElementsByTagName("ram:ChargeAmount").length) {
      errors.push(`Line item #${i + 1}: Unit price is missing`);
    }
    
    // Check for VAT information
    const tradeTax = lineItem.getElementsByTagName("ram:ApplicableTradeTax");
    if (!tradeTax.length) {
      errors.push(`Line item #${i + 1}: VAT information is missing`);
    } else {
      if (!tradeTax[0].getElementsByTagName("ram:RateApplicablePercent").length) {
        errors.push(`Line item #${i + 1}: VAT rate is missing`);
      }
    }
  }
  
  // Check for payment means
  validatePresence(xmlDoc, "//ram:SpecifiedTradePaymentTerms/ram:DueDateDateTime", "Payment due date is missing", errors);
  
  // Check for monetary summary details
  validatePresence(xmlDoc, "//ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:LineTotalAmount", "Invoice line total amount is missing", errors);
  validatePresence(xmlDoc, "//ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TaxBasisTotalAmount", "Tax basis total amount is missing", errors);
  validatePresence(xmlDoc, "//ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:TaxTotalAmount", "Tax total amount is missing", errors);
}

// Helper function to check if a node exists
function validatePresence(xmlDoc: Document, xpath: string, errorMessage: string, errors: string[]): void {
  // Simple implementation to check if elements exist
  // In a real implementation, you would use XPath properly

  const path = xpath.split("/");
  const elementName = path[path.length - 1];
  
  // Very simplified XPath-like check (this is not a real XPath implementation)
  if (elementName.includes("[")) {
    const [name, attr] = elementName.split("[");
    const elements = xmlDoc.getElementsByTagName(name);
    let found = false;
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (attr.includes("@schemeID")) {
        const schemeId = attr.match(/'([^']+)'/)?.[1];
        if (element.getAttribute("schemeID") === schemeId) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      errors.push(errorMessage);
    }
  } else {
    if (!xmlDoc.getElementsByTagName(elementName).length) {
      errors.push(errorMessage);
    }
  }
}

// Helper function to validate currency code format
function validateCurrencyCode(xmlDoc: Document, errors: string[]): void {
  const currencyElements = xmlDoc.getElementsByTagName("ram:InvoiceCurrencyCode");
  if (currencyElements.length > 0) {
    const currencyCode = currencyElements[0].textContent?.trim();
    const validCurrencyCodes = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY"];
    
    if (!currencyCode || !validCurrencyCodes.includes(currencyCode)) {
      errors.push(`Invalid currency code: ${currencyCode}. Expected one of: ${validCurrencyCodes.join(", ")}`);
    }
  }
}

// Helper function to validate date format
function validateDateFormat(xmlDoc: Document, errors: string[]): void {
  const dateElements = xmlDoc.getElementsByTagName("udt:DateTimeString");
  
  for (let i = 0; i < dateElements.length; i++) {
    const dateElement = dateElements[i];
    const format = dateElement.getAttribute("format");
    const dateValue = dateElement.textContent?.trim();
    
    if (format === "102" && dateValue) {
      // Format 102 represents YYYYMMDD
      if (!/^\d{8}$/.test(dateValue)) {
        errors.push(`Invalid date format: ${dateValue}. Expected YYYYMMDD.`);
      } else {
        const year = parseInt(dateValue.substring(0, 4));
        const month = parseInt(dateValue.substring(4, 6));
        const day = parseInt(dateValue.substring(6, 8));
        
        // Basic date validation
        if (month < 1 || month > 12) {
          errors.push(`Invalid month in date: ${dateValue}`);
        }
        
        if (day < 1 || day > 31) {
          errors.push(`Invalid day in date: ${dateValue}`);
        }
      }
    }
  }
}
