import { useRouter } from 'next/router';
import { ValidationWorkflow } from '../../components/invoices/ValidationWorkflow';

export default function InvoiceDetails() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Invoice Details</h1>
        {/* ... existing invoice details ... */}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Factur-X Validation</h2>
        <ValidationWorkflow 
          invoiceId={id as string} 
          onValidationComplete={(results) => {
            console.log('Validation completed:', results);
            // You can add additional handling here
          }}
        />
      </div>

      {/* ... rest of the component ... */}
    </div>
  );
} 