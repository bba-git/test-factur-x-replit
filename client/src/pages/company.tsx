import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CompanyProfile } from "@shared/schema";
import { useEffect, useState } from "react";
import CreateCompanyModal from "@/components/companies/CreateCompanyModal";

export default function CompanyPage() {
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchCompanies = async () => {
    try {
      const response = await apiRequest("GET", "/api/company-profiles");
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error",
        description: "Failed to fetch companies. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          Create Company
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VAT Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.vatNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.city}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.country}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateCompanyModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCompanyCreated={fetchCompanies}
      />
    </div>
  );
} 