"""XML schema validation for Factur-X documents."""

import os
from lxml import etree

def validate_invoice_xml(xml_content):
    """
    Validate XML content against the Factur-X schema.
    
    Args:
        xml_content: The XML content to validate (can be string or Element)
        
    Returns:
        bool: True if valid, False otherwise
    """
    schema_file = os.path.join(os.path.dirname(__file__), '../../schemas/CrossIndustryInvoice.xsd')
    
    # Parse the schema
    schema_doc = etree.parse(schema_file)
    schema = etree.XMLSchema(schema_doc)
    
    # Parse the XML content
    parser = etree.XMLParser(schema=schema)
    try:
        if isinstance(xml_content, str):
            etree.fromstring(xml_content.encode('utf-8'), parser)
        else:
            # If it's already an Element, validate it directly
            schema.assertValid(xml_content)
        return True
    except (etree.XMLSyntaxError, etree.DocumentInvalid) as e:
        print(f"XML validation error: {e}")
        return False 