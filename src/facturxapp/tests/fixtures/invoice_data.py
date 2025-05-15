"""Sample invoice data for testing."""

sample_invoice_data = {
    'invoice_number': 'INV-2024-001',
    'invoice_date': '2024-02-14',
    'due_date': '2024-03-14',
    'currency': 'EUR',
    'seller': {
        'name': 'Seller GmbH',
        'vat_number': 'DE123456789',
        'address': {
            'street': 'Verkäuferstraße 123',
            'postal_code': '10115',
            'city': 'Berlin',
            'country': 'DE'
        }
    },
    'buyer': {
        'name': 'Buyer AG',
        'vat_number': 'DE987654321',
        'address': {
            'street': 'Kundenweg 456',
            'postal_code': '20095',
            'city': 'Hamburg',
            'country': 'DE'
        }
    },
    'line_items': [
        {
            'description': 'Test Product',
            'quantity': 1,
            'unit_price': 100.00,
            'tax_percent': 20
        }
    ],
    'totals': {
        'net_amount': 100.00,
        'tax_amount': 20.00,
        'total_amount': 120.00
    }
} 