import pytest
from pathlib import Path
import shutil
from ..services.xml_service import XMLService

def test_xml_service_initialization():
    """Test XML service initialization."""
    # Create a temporary output directory
    output_dir = Path("test_output")
    service = XMLService(str(output_dir))
    
    # Check if output directory was created
    assert output_dir.exists()
    assert output_dir.is_dir()
    
    # Cleanup
    shutil.rmtree(output_dir)

def test_generate_facturx_xml_with_sample_data():
    """Test XML generation with sample invoice data."""
    # Create test directory
    output_dir = Path("test_output")
    service = XMLService(str(output_dir))
    
    # Sample invoice data
    invoice_data = {
        "profile": "EN16931",
        "invoice_number": "2020140205458",
        "invoice_date": "2020-05-15",
        "due_date": "2020-06-14",
        "currency": "EUR",
        "amount_untaxed": 21333.11,
        "amount_tax": 4266.63,
        "amount_total": 25599.74,
        "payment_terms": "Paiement à 30 jours - échéance au 14/06/2020",
        
        "seller": {
            "name": "AZIMUT",
            "vat_number": "FR48528925589",
            "siret": "52892558900038",
            "address": {
                "line1": "38 rue Carnot",
                "postcode": "75013",
                "city": "Paris",
                "country": "FR",
            },
            "email": "",
            "phone": "+33 (0)1.02.03.04.05",
        },

        "buyer": {
            "name": "CASTAFIORE",
            "vat_number": "FR64300508560",
            "address": {
                "line1": "54 AV GUILHEM DE POITIERS",
                "postcode": "34080",
                "city": "Montpellier",
                "country": "FR",
            },
            "email": "",
        },

        "items": [
            {
                "description": "Contrat de maintenance - prestations intellectuelles (Ligne 1)",
                "quantity": 366.887,
                "unit_price": 0.009,
                "tax_percent": 20.0,
            },
            {
                "description": "Contrat de maintenance - prestations intellectuelles (Ligne 2)",
                "quantity": 18031.130,
                "unit_price": 0.001,
                "tax_percent": 20.0,
            },
        ],
    }
    
    # Generate XML
    xml_path = service.generate_facturx_xml(invoice_data)
    
    # Verify XML was created
    assert xml_path.exists()
    assert xml_path.is_file()
    assert xml_path.stat().st_size > 0
    
    # Read XML content and verify basic structure
    with open(xml_path, 'rb') as f:
        content = f.read()
        assert b'<?xml' in content
        assert b'<rsm:CrossIndustryInvoice' in content
        assert b'EN16931' in content
        assert b'AZIMUT' in content
        assert b'CASTAFIORE' in content
    
    # Cleanup
    xml_path.unlink()
    shutil.rmtree(output_dir) 