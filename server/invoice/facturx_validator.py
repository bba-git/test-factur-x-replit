from lxml import etree
import datetime
import os
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional

REGISTRY_FILE = "cursor_registry.json"

def cursor_log_action(action: str, success: bool = True, note: str = "") -> None:
    """Log actions to the cursor registry for tracking workflow progress."""
    registry = []
    if Path(REGISTRY_FILE).exists():
        with open(REGISTRY_FILE) as f:
            registry = json.load(f)
    registry.append({"action": action, "success": success, "note": note})
    with open(REGISTRY_FILE, "w") as f:
        json.dump(registry, f, indent=2)

def try_call(description: str, cmd: str) -> Optional[str]:
    """Safely execute a command and log the result."""
    print(f"[TRY] {description}")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True)
        print("[✔] Success")
        cursor_log_action(description, success=True)
        return result.stdout.decode()
    except subprocess.CalledProcessError as e:
        print(f"[⚠] Skipped failing step: {description}")
        cursor_log_action(description, success=False, note=str(e))
        return None

class FacturXValidator:
    def __init__(self, xml_content: str):
        """Initialize validator with XML content string."""
        self.xml_content = xml_content
        self.tree = etree.fromstring(xml_content.encode())
        self.ns = {
            "rsm": "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
            "ram": "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
            "qdt": "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
            "udt": "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
        }
        self.errors: List[str] = []
        self.results: Dict[str, bool] = {}

    def validate_profile_id(self) -> bool:
        """Validate the Factur-X profile ID."""
        xpath = "//ram:GuidelineSpecifiedDocumentContextParameter/ram:ID"
        elements = self.tree.xpath(xpath, namespaces=self.ns)
        if not elements:
            self.errors.append("Missing profile ID definition")
            return False
        profile_id = elements[0].text.strip()
        accepted_prefixes = [
            "urn:factur-x.eu:1p0:en16931",
            "urn:cen.eu:en16931:2017"
        ]
        if not any(profile_id.startswith(prefix) for prefix in accepted_prefixes):
            self.errors.append(f"Invalid profile ID: '{profile_id}'")
            return False
        return True

    def validate_invoice_basics(self) -> bool:
        """Validate basic invoice data."""
        try:
            doc = self.tree.xpath("//rsm:ExchangedDocument", namespaces=self.ns)[0]
            assert doc.find("ram:ID", self.ns) is not None
            assert doc.find("ram:TypeCode", self.ns) is not None
            date_elem = doc.find("ram:IssueDateTime/udt:DateTimeString", self.ns)
            assert date_elem is not None and date_elem.get("format") == "102"
            return True
        except Exception as e:
            self.errors.append(f"Invoice basic data invalid: {str(e)}")
            return False

    def validate_currency(self) -> bool:
        """Validate currency code."""
        path = "//ram:InvoiceCurrencyCode"
        code = self.tree.xpath(path, namespaces=self.ns)
        if not code or code[0].text.strip() != "EUR":
            self.errors.append("Currency must be EUR")
            return False
        return True

    def validate_with_xsd(self, xsd_path: str) -> bool:
        """Validate against XSD schema."""
        try:
            with open(xsd_path, 'rb') as f:
                xmlschema_doc = etree.parse(f)
                xmlschema = etree.XMLSchema(xmlschema_doc)
                xmlschema.assertValid(self.tree)
            return True
        except Exception as e:
            self.errors.append(f"XSD validation error: {str(e)}")
            return False

    def validate_with_schematron(self, sch_path: str) -> bool:
        """Validate against Schematron rules."""
        try:
            with open(sch_path, 'rb') as f:
                schematron_doc = etree.parse(f)
                schematron = etree.Schematron(schematron_doc)
                if not schematron.validate(self.tree):
                    self.errors.append(f"Schematron validation failed: {schematron.error_log.filter_from_errors()[0]}")
                    return False
            return True
        except Exception as e:
            self.errors.append(f"Schematron validation error: {str(e)}")
            return False

    def run_all(self, xsd_path: Optional[str] = None, sch_path: Optional[str] = None) -> Tuple[Dict[str, bool], List[str]]:
        """Run all validations and return results."""
        self.results = {
            "Profile ID Validation": self.validate_profile_id(),
            "Invoice Basic Data": self.validate_invoice_basics(),
            "Currency Code": self.validate_currency(),
        }
        
        if xsd_path:
            self.results["XSD Validation"] = self.validate_with_xsd(xsd_path)
        if sch_path:
            self.results["Schematron Validation"] = self.validate_with_schematron(sch_path)
            
        return self.results, self.errors

def generate_xmp_metadata(invoice_number: str, issue_date: str, seller_name: str) -> str:
    """Generate XMP metadata for PDF/A-3."""
    create_date = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "+00:00"
    return f"""<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      pdfaid:part="3"
      pdfaid:conformance="B"
      xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
      xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
      xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentFileName</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>name of the embedded XML invoice file</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentType</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>INVOICE</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>Version</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>1.0</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>EN16931</pdfaProperty:description>
                </rdf:li>
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""

def validate_invoice(xml_content: str, xsd_path: Optional[str] = None, sch_path: Optional[str] = None) -> Dict:
    """Main validation function that can be called from TypeScript."""
    validator = FacturXValidator(xml_content)
    results, errors = validator.run_all(xsd_path, sch_path)
    
    return {
        "isValid": len(errors) == 0,
        "results": results,
        "errors": errors
    } 