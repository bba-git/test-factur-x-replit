import pytest
from lxml import etree
from pathlib import Path
from facturxapp.services.xml_service import XMLService
from facturxapp.tests.fixtures.invoice_data import sample_invoice_data

def test_facturx_structure_snapshot(tmp_path):
    """Test that the generated XML structure matches the reference snapshot."""
    # Arrange
    xml_service = XMLService(output_dir=tmp_path)
    
    # Act
    xml_path = xml_service.generate_facturx_xml(sample_invoice_data)
    with open(xml_path, 'rb') as f:
        xml_bytes = f.read()
    
    # Parse and pretty print for comparison
    root = etree.fromstring(xml_bytes)
    generated_xml = etree.tostring(root, pretty_print=True, encoding='unicode')
    
    # Load reference snapshot
    snapshot_path = Path(__file__).parent / 'snapshots' / 'invoice_reference.xml'
    if not snapshot_path.exists():
        # First run - create snapshot
        snapshot_path.parent.mkdir(exist_ok=True)
        with open(snapshot_path, 'w') as f:
            f.write(generated_xml)
        pytest.skip("Created initial snapshot - run test again to validate")
    
    # Compare with snapshot
    with open(snapshot_path) as f:
        expected_xml = f.read()
    
    # Assert
    assert generated_xml.strip() == expected_xml.strip(), \
        "XML structure does not match reference snapshot. Run test with -v for diff."

def test_xml_element_order():
    """Test that elements appear in the correct order under SupplyChainTradeTransaction."""
    # Arrange
    xml_service = XMLService()
    
    # Act
    xml_path = xml_service.generate_facturx_xml(sample_invoice_data)
    with open(xml_path, 'rb') as f:
        root = etree.fromstring(f.read())
    
    # Get transaction node
    transaction = root.find('.//{*}SupplyChainTradeTransaction')
    assert transaction is not None, "SupplyChainTradeTransaction not found"
    
    # Get all direct children
    children = list(transaction)
    
    # Assert order
    assert len(children) >= 3, "Transaction must have at least 3 children"
    
    # First: All line items
    line_items = [c for c in children if c.tag.endswith('IncludedSupplyChainTradeLineItem')]
    assert line_items, "No line items found"
    assert all(c == children[i] for i, c in enumerate(line_items)), \
        "Line items must come first"
    
    # Second: Header agreement
    agreement = children[len(line_items)]
    assert agreement.tag.endswith('ApplicableHeaderTradeAgreement'), \
        "Header agreement must come after line items"
    
    # Last: Settlement
    settlement = children[-1]
    assert settlement.tag.endswith('ApplicableHeaderTradeSettlement'), \
        "Settlement must come last" 