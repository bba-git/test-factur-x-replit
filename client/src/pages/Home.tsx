import AppLayout from "@/components/layouts/AppLayout";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import ComplianceStatusCard from "@/components/invoices/ComplianceStatusCard";
import { useState } from "react";
import CreateInvoiceModal from "@/components/invoices/CreateInvoiceModal";
import ValidationModal from "@/components/invoices/ValidationModal";
import { Invoice } from "@shared/schema";

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const handleCreateInvoice = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleInvoiceValidation = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowValidationModal(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-neutral-dark">Invoices</h1>
          <p className="text-sm text-gray-500">Create and manage Factur-X/ZUGFeRD compliant invoices</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button 
            className="bg-primary text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700 flex items-center"
            onClick={handleCreateInvoice}
          >
            <span className="material-icons mr-1 text-base">add</span>
            New Invoice
          </button>
        </div>
      </div>

      <InvoiceTable onValidateInvoice={handleInvoiceValidation} />
      <ComplianceStatusCard />

      {showCreateModal && (
        <CreateInvoiceModal 
          open={showCreateModal} 
          onClose={handleCloseCreateModal}
        />
      )}

      {showValidationModal && selectedInvoice && (
        <ValidationModal 
          open={showValidationModal} 
          onClose={() => setShowValidationModal(false)}
          invoice={selectedInvoice}
        />
      )}
    </AppLayout>
  );
}
