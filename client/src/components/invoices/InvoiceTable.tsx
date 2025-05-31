import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Invoice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceTableProps {
  onValidateInvoice: (invoice: Invoice) => void;
}

type SortField = 'invoice_number' | 'customer_id' | 'issue_date' | 'total' | 'profile' | 'validation_status';
type SortDirection = 'asc' | 'desc';

export default function InvoiceTable({ onValidateInvoice }: InvoiceTableProps) {
  const [currentTab, setCurrentTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <span className="material-icons text-gray-400 text-sm">unfold_more</span>;
    return sortDirection === 'asc' 
      ? <span className="material-icons text-gray-500 text-sm">arrow_upward</span>
      : <span className="material-icons text-gray-500 text-sm">arrow_downward</span>;
  };

  const filteredAndSortedInvoices = invoices?.filter(invoice => {
    // Filter by tab
    if (currentTab !== "all" && invoice.status.toLowerCase() !== currentTab) {
      return false;
    }
    
    // Filter by search query
    if (
      searchQuery && 
      !invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    
    // Filter by profile
    if (selectedProfile !== "all" && invoice.profile !== selectedProfile) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'invoice_number':
        return direction * a.invoice_number.localeCompare(b.invoice_number);
      case 'customer_id':
        return direction * a.customer_id.localeCompare(b.customer_id);
      case 'issue_date':
        return direction * (new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());
      case 'total':
        return direction * (a.total - b.total);
      case 'profile':
        return direction * a.profile.localeCompare(b.profile);
      case 'validation_status':
        return direction * (a.validation_status || '').localeCompare(b.validation_status || '');
      default:
        return 0;
    }
  });

  const handleView = (invoice: Invoice) => {
    // View invoice implementation
    console.log("View invoice", invoice);
  };

  const handleEdit = (invoice: Invoice) => {
    // Edit invoice implementation
    console.log("Edit invoice", invoice);
  };

  const handleDownload = (invoice: Invoice) => {
    // Download invoice implementation
    window.open(`/api/invoices/${invoice.id}/download`, "_blank");
  };

  const handleDownloadXMP = (invoice: Invoice) => {
    // Download XMP metadata
    window.open(`/api/invoices/${invoice.id}/metadata`, "_blank");
  };

  const handleDownloadXML = (invoice: Invoice) => {
    // Download XML content
    window.open(`/api/invoices/${invoice.id}/xml`, "_blank");
  };

  const getStatusBadgeClasses = (status: string | undefined | null) => {
    switch ((status || '').toLowerCase()) {
      case 'valid':
        return 'compliance-valid';
      case 'invalid':
        return 'compliance-invalid';
      case 'pending':
        return 'compliance-pending';
      default:
        return 'compliance-unknown';
    }
  };

  const getProfileBadgeClasses = () => {
    return 'profile-badge';
  };

  return (
    <>
      {/* Tabs */}
      <div className="bg-white rounded-t-lg shadow-sm">
        <div className="flex border-b">
          <button 
            className={`px-4 py-3 font-medium ${currentTab === 'all' ? 'tab-active' : 'text-gray-500 hover:text-neutral-dark'}`}
            onClick={() => setCurrentTab('all')}
          >
            All Invoices
          </button>
          <button 
            className={`px-4 py-3 ${currentTab === 'draft' ? 'tab-active' : 'text-gray-500 hover:text-neutral-dark'}`}
            onClick={() => setCurrentTab('draft')}
          >
            Drafts
          </button>
          <button 
            className={`px-4 py-3 ${currentTab === 'sent' ? 'tab-active' : 'text-gray-500 hover:text-neutral-dark'}`}
            onClick={() => setCurrentTab('sent')}
          >
            Sent
          </button>
          <button 
            className={`px-4 py-3 ${currentTab === 'paid' ? 'tab-active' : 'text-gray-500 hover:text-neutral-dark'}`}
            onClick={() => setCurrentTab('paid')}
          >
            Paid
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-b-lg overflow-hidden mb-6">
        {/* Filters and Search */}
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center w-full md:w-64 mb-4 md:mb-0 relative">
            <span className="material-icons text-gray-400 absolute ml-3">search</span>
            <input 
              type="text" 
              placeholder="Search invoices..." 
              className="pl-10 pr-4 py-2 border rounded w-full focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select 
              className="border rounded px-3 py-2 bg-white"
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
            >
              <option value="all">All Profiles</option>
              <option value="MINIMUM">MINIMUM</option>
              <option value="BASIC_WL">BASIC WL</option>
              <option value="EN16931">EN16931 (FULL)</option>
            </select>
            <select 
              className="border rounded px-3 py-2 bg-white"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">This year</option>
              <option value="all">All time</option>
            </select>
            <button className="border rounded p-2">
              <span className="material-icons">filter_list</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex space-x-4 mb-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('invoice_number')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Invoice #</span>
                      {getSortIcon('invoice_number')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('customer_id')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Customer</span>
                      {getSortIcon('customer_id')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('issue_date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      {getSortIcon('issue_date')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      {getSortIcon('total')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('profile')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Profile</span>
                      {getSortIcon('profile')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('validation_status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {getSortIcon('validation_status')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedInvoices && filteredAndSortedInvoices.length > 0 ? (
                  filteredAndSortedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary">{invoice.invoice_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.customer_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{invoice.issue_date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getProfileBadgeClasses()}`}>
                          {invoice.profile}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClasses(invoice.validation_status)}`}>
                          {invoice.validation_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-primary hover:text-blue-800 mr-3"
                          onClick={() => handleView(invoice)}
                        >
                          <span className="material-icons">visibility</span>
                        </button>
                        <button 
                          className="text-primary hover:text-blue-800 mr-3"
                          onClick={() => handleEdit(invoice)}
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button 
                          className="text-primary hover:text-blue-800 mr-3"
                          onClick={() => handleDownload(invoice)}
                        >
                          <span className="material-icons">file_download</span>
                        </button>
                        <button 
                          className="text-primary hover:text-blue-800 mr-3"
                          onClick={() => handleDownloadXMP(invoice)}
                          title="Download XMP Metadata"
                        >
                          <span className="material-icons">description</span>
                        </button>
                        <button 
                          className="text-primary hover:text-blue-800"
                          onClick={() => handleDownloadXML(invoice)}
                          title="Download XML Content"
                        >
                          <span className="material-icons">code</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button variant="outline" size="sm">Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">4</span> of <span className="font-medium">12</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="material-icons text-sm">chevron_left</span>
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-primary text-sm font-medium text-white">
                  1
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  2
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  3
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="material-icons text-sm">chevron_right</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
