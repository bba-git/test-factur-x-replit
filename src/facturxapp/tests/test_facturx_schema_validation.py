from lxml import etree
from facturxapp.services.xml_service import XMLService
from facturxapp.tests.fixtures.invoice_data import sample_invoice_data
from facturxapp.validators.xml_schema_validator import validate_invoice_xml

def test_valid_invoice_schema(tmp_path):
    xml_service = XMLService(output_dir=tmp_path)
    xml_path = xml_service.generate_facturx_xml(sample_invoice_data)
    with open(xml_path, 'rb') as f:
        xml_bytes = f.read()
    root = etree.fromstring(xml_bytes)
    # Should not raise
    validate_invoice_xml(root) 