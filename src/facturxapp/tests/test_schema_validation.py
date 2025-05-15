import os
from lxml import etree

SCHEMA_FILE = "src/schemas/Factur-X.xsd"

def validate_facturx(xml_string):
    xml_doc = etree.fromstring(xml_string.encode("utf-8"))
    with open(SCHEMA_FILE, "rb") as f:
        schema_root = etree.XML(f.read())
    schema = etree.XMLSchema(schema_root)
    schema.assertValid(xml_doc)

def test_facturx_schema_compliance():
    with open("src/facturxapp/tests/assets/sample_invoice.xml", "r", encoding="utf-8") as f:
        xml = f.read()
    validate_facturx(xml) 