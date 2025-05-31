import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

interface ValidationResult {
  isValid: boolean;
  results: {
    [key: string]: boolean;
  };
  errors: string[];
}

export async function validateInvoice(xmlContent: string, profile: 'MINIMUM' | 'BASIC_WL' | 'EN16931' = 'EN16931'): Promise<ValidationResult> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'facturx_validator.py'),
      '--xml-content', xmlContent,
      '--profile', profile
    ]);

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${error}`));
        return;
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (e: unknown) {
        reject(new Error(`Failed to parse Python output: ${e instanceof Error ? e.message : String(e)}`));
      }
    });
  });
}

// TypeScript-specific validation functions for basic checks
export function validateMinimumProfile(xml: Document): boolean {
  const requiredFields = [
    '//rsm:ExchangedDocument/ram:ID',
    '//rsm:ExchangedDocument/ram:TypeCode',
    '//rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString',
    '//ram:ApplicableSupplyChainTradeAgreement/ram:SellerTradeParty/ram:Name',
    '//ram:ApplicableSupplyChainTradeAgreement/ram:BuyerTradeParty/ram:Name',
    '//ram:ApplicableSupplyChainTradeSettlement/ram:InvoiceCurrencyCode',
    '//ram:ApplicableSupplyChainTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:GrandTotalAmount'
  ];

  return requiredFields.every(field => xml.evaluate(field, xml, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue !== null);
}

export function validateBasicWLProfile(xml: Document): boolean {
  const basicChecks = validateMinimumProfile(xml);
  if (!basicChecks) return false;

  const additionalFields = [
    '//ram:ApplicableSupplyChainTradeAgreement/ram:SellerTradeParty/ram:PostalTradeAddress',
    '//ram:ApplicableSupplyChainTradeAgreement/ram:BuyerTradeParty/ram:PostalTradeAddress',
    '//ram:ApplicableSupplyChainTradeSettlement/ram:PaymentTerms',
    '//ram:IncludedSupplyChainTradeLineItem',
    '//ram:ApplicableSupplyChainTradeSettlement/ram:ApplicableTradeTax'
  ];

  return additionalFields.every(field => xml.evaluate(field, xml, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue !== null);
}

export function validateEN16931Profile(xml: Document): boolean {
  const basicWLChecks = validateBasicWLProfile(xml);
  if (!basicWLChecks) return false;

  const additionalFields = [
    '//ram:ApplicableSupplyChainTradeAgreement/ram:SellerTradeParty/ram:SpecifiedTaxRegistration/ram:ID[@schemeID="VA"]',
    '//ram:ApplicableSupplyChainTradeAgreement/ram:SellerTradeParty/ram:PostalTradeAddress/ram:PostcodeCode',
    '//ram:ApplicableSupplyChainTradeAgreement/ram:SellerTradeParty/ram:PostalTradeAddress/ram:CountryID',
    '//ram:IncludedSupplyChainTradeLineItem/ram:AssociatedDocumentLineDocument',
    '//ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedTradeProduct',
    '//ram:ApplicableSupplyChainTradeSettlement/ram:SpecifiedTradePaymentMeans',
    '//ram:ApplicableSupplyChainTradeSettlement/ram:SpecifiedTradeSettlementHeaderMonetarySummation/ram:LineTotalAmount'
  ];

  return additionalFields.every(field => xml.evaluate(field, xml, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue !== null);
}

export function validateDateFormat(dateStr: string): boolean {
  const dateRegex = /^\d{8}$/;
  if (!dateRegex.test(dateStr)) return false;

  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
