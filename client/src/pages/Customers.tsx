import AppLayout from "@/components/layouts/AppLayout";
import { useState, useEffect } from "react";
import { Customer } from "@shared/types";
import { apiRequest } from "@/lib/queryClient";
import CreateCustomerModal from "@/components/customers/CreateCustomerModal";

export default function Customers() {
  console.log("[Customers] Component rendering");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCustomers = async () => {
    console.log("[Customers] Fetching customers...");
    try {
      const response = await apiRequest("GET", "/api/customers");
      const data = await response.json();
      console.log("[Customers] Fetched customers:", data);
      setCustomers(data);
    } catch (error) {
      console.error("[Customers] Error fetching customers:", error);
    }
  };

  useEffect(() => {
    console.log("[Customers] Component mounted");
    fetchCustomers();
  }, []);

  const handleCreateCustomer = () => {
    console.log("[Customers] Create button clicked");
    console.log("[Customers] Current showCreateModal before update:", showCreateModal);
    setShowCreateModal(true);
    console.log("[Customers] showCreateModal set to true");
  };

  const handleCloseCreateModal = () => {
    console.log("[Customers] Close modal clicked");
    console.log("[Customers] Current showCreateModal before update:", showCreateModal);
    setShowCreateModal(false);
    console.log("[Customers] showCreateModal set to false");
  };

  const handleCustomerCreated = () => {
    console.log("[Customers] Customer created, refreshing list");
    fetchCustomers();
  };

  useEffect(() => {
    console.log("[Customers] showCreateModal state changed to:", showCreateModal);
  }, [showCreateModal]);

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-neutral-dark">Customers</h1>
          <p className="text-sm text-gray-500">Manage your customers</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button 
            className="bg-primary text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700 flex items-center"
            onClick={handleCreateCustomer}
          >
            <span className="material-icons mr-1 text-base">add</span>
            New Customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VAT Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.length > 0 ? (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{customer.vat_number || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {customer.address}, {customer.postal_code} {customer.city}, {customer.country}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {customer.contact_person && <div>{customer.contact_person}</div>}
                      {customer.email && <div>{customer.email}</div>}
                      {customer.phone && <div>{customer.phone}</div>}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateCustomerModal 
          open={showCreateModal} 
          onClose={handleCloseCreateModal}
          onCustomerCreated={handleCustomerCreated}
        />
      )}
    </AppLayout>
  );
} 