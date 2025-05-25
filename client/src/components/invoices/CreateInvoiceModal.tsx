import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceWithItemsSchema, InvoiceWithItems, FacturXProfileEnum, Customer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import React from "react";

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

const steps = ["basic", "items", "compliance", "review"] as const;
type Step = typeof steps[number];

export default function CreateInvoiceModal({ open, onClose }: CreateInvoiceModalProps) {
  useEffect(() => {
    console.log('[Modal] Mount');
    return () => console.log('[Modal] Unmount');
  }, []);
  useEffect(() => {
    console.log('[Modal] Open state changed:', open);
  }, [open]);
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const currentStepIndex = steps.indexOf(currentStep);
  const { toast } = useToast();
  const [profileSelectOpen, setProfileSelectOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const form = useForm<InvoiceWithItems>({
    resolver: zodResolver(invoiceWithItemsSchema),
    defaultValues: {
      invoice_number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      customer_id: "",
      company_profile_id: "",
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: "EUR",
      subtotal: 0,
      vat_total: 0,
      total: 0,
      items: [],
      notes: "",
      payment_terms: "Net 30",
      purchase_order_ref: "",
      status: "DRAFT",
      profile: "EN16931"
    }
  });

  useEffect(() => {
    console.log('[Modal] Current step:', currentStep);
  }, [currentStep]);

  const fetchCustomers = async () => {
    try {
      const response = await apiRequest("GET", "/api/customers");
      const data = await response.json();
      console.log('[Modal] Fetched customers:', data);
      setCustomers(data);
    } catch (error) {
      console.error("[Modal] Error fetching customers:", error);
    }
  };

  // Refresh customers when modal opens
  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  // Add event listener for customer creation
  useEffect(() => {
    const handleCustomerCreated = () => {
      console.log('[Modal] Customer created, refreshing list');
      fetchCustomers();
    };

    window.addEventListener('customerCreated', handleCustomerCreated);
    return () => {
      window.removeEventListener('customerCreated', handleCustomerCreated);
    };
  }, []);

  const createInvoice = async (data: InvoiceWithItems) => {
    console.log('[INVOICE][CLIENT] Starting invoice creation process');
    console.log('[INVOICE][CLIENT] Raw form data:', JSON.stringify(data, null, 2));
    
    try {
      // Convert to snake_case for the API, excluding company_profile_id
      const apiData = {
        invoice_number: data.invoice_number,
        customer_id: data.customer_id,
        issue_date: data.issue_date,
        due_date: data.due_date,
        currency: data.currency,
        subtotal: data.subtotal,
        vat_total: data.vat_total,
        total: data.total,
        notes: data.notes,
        payment_terms: data.payment_terms,
        purchase_order_ref: data.purchase_order_ref,
        status: data.status,
        profile: data.profile,
        items: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          unit_of_measure: item.unit_of_measure,
          line_total: item.line_total
        }))
      };

      console.log('[INVOICE][CLIENT] Transformed API data:', JSON.stringify(apiData, null, 2));
      console.log('[INVOICE][CLIENT] Sending API request to /api/invoices');
      
      const response = await apiRequest("POST", "/api/invoices", apiData);
      console.log('[INVOICE][CLIENT] API Response status:', response.status);
      
      const invoice = await response.json();
      console.log('[INVOICE][CLIENT] Invoice created successfully:', JSON.stringify(invoice, null, 2));
      
      console.log('[INVOICE][CLIENT] Requesting PDF download for invoice:', invoice.id);
      const pdfResponse = await fetch(`/api/invoices/${invoice.id}/download`);
      console.log('[INVOICE][CLIENT] PDF Response status:', pdfResponse.status);
      console.log('[INVOICE][CLIENT] PDF Response headers:', Object.fromEntries(pdfResponse.headers.entries()));
      
      const pdfBlob = await pdfResponse.blob();
      console.log('[INVOICE][CLIENT] PDF Blob size:', pdfBlob.size, 'bytes');
      console.log('[INVOICE][CLIENT] PDF Blob type:', pdfBlob.type);
      
      if (pdfBlob.type !== 'application/pdf') {
        console.error('[INVOICE][CLIENT] Invalid PDF response type:', pdfBlob.type);
        throw new Error('Invalid PDF response type');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('[INVOICE][CLIENT] PDF download initiated');
      
      toast({
        title: "Invoice created",
        description: "Your invoice has been created and downloaded successfully",
      });
      onClose();
    } catch (error) {
      console.error("[INVOICE][CLIENT] Error creating invoice:", error);
      console.error("[INVOICE][CLIENT] Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNextStep = () => {
    console.log('[INVOICE][CLIENT] Step changed:', currentStep);
    if (currentStep === "review") {
      console.log('[INVOICE][CLIENT] Form submit payload:', form.getValues());
      createInvoice(form.getValues());
    } else {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const getStepTitle = () => {
    switch(currentStep) {
      case "basic": return "Basic Info";
      case "items": return "Line Items";
      case "compliance": return "Compliance";
      case "review": return "Review";
    }
  };

  // Helper for Select logging
  function logSelectEvent(name: string, event: string, value?: any) {
    console.log(`[Select:${name}] ${event}`, value);
  }

  return (
    open ? (
      <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-lg shadow-lg sm:max-w-4xl max-h-screen overflow-auto w-full p-6">
          <div className="mb-4 border-b pb-2">
            <h2 className="text-xl font-bold">Create New Invoice</h2>
          </div>
          {/* Step Navigation */}
          <div className="flex border-b mb-6">
            <button 
              className={`px-4 py-2 ${currentStep === 'basic' ? 'font-medium tab-active' : 'text-gray-500'}`}
              onClick={() => setCurrentStep('basic')}
            >
              Basic Info
            </button>
            <button 
              className={`px-4 py-2 ${currentStep === 'items' ? 'font-medium tab-active' : 'text-gray-500'}`}
              onClick={() => setCurrentStep('items')}
            >
              Line Items
            </button>
            <button 
              className={`px-4 py-2 ${currentStep === 'compliance' ? 'font-medium tab-active' : 'text-gray-500'}`}
              onClick={() => setCurrentStep('compliance')}
            >
              Compliance
            </button>
            <button 
              className={`px-4 py-2 ${currentStep === 'review' ? 'font-medium tab-active' : 'text-gray-500'}`}
              onClick={() => setCurrentStep('review')}
            >
              Review
            </button>
          </div>
          <div>
            {currentStep === "basic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invoice Info */}
                <div>
                  <h3 className="font-medium mb-4 text-neutral-dark">Invoice Information</h3>
                  
                  <div className="mb-4">
                    <Label htmlFor="invoice_number">Invoice Number</Label>
                    <Input 
                      id="invoice_number"
                      {...form.register("invoice_number")}
                      className="mt-1"
                      onChange={e => { logSelectEvent('Input', 'invoice_number changed', e.target.value); form.setValue('invoice_number', e.target.value); }}
                    />
                    {form.formState.errors.invoice_number && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.invoice_number.message}</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="issue_date">Invoice Date</Label>
                    <Input 
                      id="issue_date"
                      type="date"
                      {...form.register("issue_date")}
                      className="mt-1"
                      onChange={e => { logSelectEvent('Input', 'issue_date changed', e.target.value); form.setValue('issue_date', e.target.value); }}
                    />
                    {form.formState.errors.issue_date && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.issue_date.message}</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input 
                      id="due_date"
                      type="date"
                      {...form.register("due_date")}
                      className="mt-1"
                      onChange={e => { logSelectEvent('Input', 'due_date changed', e.target.value); form.setValue('due_date', e.target.value); }}
                    />
                    {form.formState.errors.due_date && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.due_date.message}</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      className="w-full border rounded-md px-3 py-2 mt-1"
                      value={form.getValues("currency")}
                      onChange={(e) => {
                        logSelectEvent('Currency', 'changed', e.target.value);
                        form.setValue("currency", e.target.value);
                      }}
                    >
                      <option value="EUR">EUR - Euro</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                    {form.formState.errors.currency && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.currency.message}</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="payment_terms">Payment Terms</Label>
                    <select
                      id="payment_terms"
                      className="w-full border rounded-md px-3 py-2 mt-1"
                      value={form.getValues("payment_terms") || undefined}
                      onChange={(e) => {
                        logSelectEvent('PaymentTerms', 'changed', e.target.value);
                        form.setValue("payment_terms", e.target.value);
                      }}
                    >
                      <option value="Net 30">Net 30</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                    </select>
                    {form.formState.errors.payment_terms && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.payment_terms.message}</p>
                    )}
                  </div>
                </div>
                
                {/* Customer Info */}
                <div>
                  <h3 className="font-medium mb-4 text-neutral-dark">Customer Information</h3>
                  
                  <div className="mb-4">
                    <Label htmlFor="customer_id">Customer</Label>
                    <select
                      id="customer_id"
                      className="w-full border rounded-md px-3 py-2 mt-1"
                      value={form.getValues("customer_id")}
                      onChange={(e) => {
                        logSelectEvent('Customer', 'changed', e.target.value);
                        form.setValue("customer_id", e.target.value, { 
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true
                        });
                      }}
                    >
                      <option value="">Select a customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.customer_id && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.customer_id.message}</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="purchase_order_ref">Reference</Label>
                    <Input 
                      id="purchase_order_ref"
                      placeholder="PO-2023-1234"
                      {...form.register("purchase_order_ref")}
                      className="mt-1"
                      onChange={e => { logSelectEvent('Input', 'purchase_order_ref changed', e.target.value); form.setValue('purchase_order_ref', e.target.value); }}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="profile">Factur-X/ZUGFeRD Profile</Label>
                    <select
                      id="profile"
                      className="w-full border rounded-md px-3 py-2 mt-1"
                      value={form.getValues("profile")}
                      onChange={(e) => {
                        logSelectEvent('Profile', 'changed', e.target.value);
                        form.setValue("profile", e.target.value as keyof typeof FacturXProfileEnum.enum);
                      }}
                    >
                      <option value="MINIMUM">MINIMUM</option>
                      <option value="BASIC_WL">BASIC WL</option>
                      <option value="EN16931">EN16931 (FULL)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Profile determines required fields and XML schema.</p>
                    {form.formState.errors.profile && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.profile.message}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea 
                      id="notes"
                      className="w-full border rounded-md px-3 py-2 mt-1"
                      placeholder="Additional information..."
                      {...form.register("notes")}
                      onChange={e => { logSelectEvent('Input', 'notes changed', e.target.value); form.setValue('notes', e.target.value); }}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === "items" && (
              <div>
                <h3 className="font-medium mb-4 text-neutral-dark">Invoice Line Items</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 mb-4">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VAT %</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {form.watch("items").length > 0 ? (
                        form.watch("items").map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Input
                                value={item.description}
                                onChange={(e) => {
                                  const items = [...form.getValues("items")];
                                  items[index] = {
                                    ...items[index],
                                    description: e.target.value
                                  };
                                  form.setValue("items", items);
                                }}
                                className="w-full"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const items = [...form.getValues("items")];
                                  const quantity = parseFloat(e.target.value) || 0;
                                  items[index] = {
                                    ...items[index],
                                    quantity,
                                    line_total: quantity * items[index].unit_price
                                  };
                                  form.setValue("items", items);
                                  // Update totals
                                  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
                                  const vatTotal = items.reduce((sum, item) => sum + (item.line_total * item.vat_rate / 100), 0);
                                  form.setValue("subtotal", subtotal);
                                  form.setValue("vat_total", vatTotal);
                                  form.setValue("total", subtotal + vatTotal);
                                }}
                                className="w-20"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => {
                                  const items = [...form.getValues("items")];
                                  const unitPrice = parseFloat(e.target.value) || 0;
                                  items[index] = {
                                    ...items[index],
                                    unit_price: unitPrice,
                                    line_total: items[index].quantity * unitPrice
                                  };
                                  form.setValue("items", items);
                                  // Update totals
                                  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
                                  const vatTotal = items.reduce((sum, item) => sum + (item.line_total * item.vat_rate / 100), 0);
                                  form.setValue("subtotal", subtotal);
                                  form.setValue("vat_total", vatTotal);
                                  form.setValue("total", subtotal + vatTotal);
                                }}
                                className="w-24"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Input
                                type="number"
                                value={item.vat_rate}
                                onChange={(e) => {
                                  const items = [...form.getValues("items")];
                                  const vatRate = parseFloat(e.target.value) || 0;
                                  items[index] = {
                                    ...items[index],
                                    vat_rate: vatRate
                                  };
                                  form.setValue("items", items);
                                  // Update VAT total
                                  const vatTotal = items.reduce((sum, item) => sum + (item.line_total * item.vat_rate / 100), 0);
                                  form.setValue("vat_total", vatTotal);
                                  form.setValue("total", form.getValues("subtotal") + vatTotal);
                                }}
                                className="w-20"
                                min="0"
                                max="100"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={item.unit_of_measure}
                                onChange={(e) => {
                                  const items = [...form.getValues("items")];
                                  items[index] = {
                                    ...items[index],
                                    unit_of_measure: e.target.value
                                  };
                                  form.setValue("items", items);
                                }}
                                className="w-20 border rounded px-2 py-1"
                              >
                                <option value="EA">EA</option>
                                <option value="HRS">HRS</option>
                                <option value="KG">KG</option>
                                <option value="L">L</option>
                                <option value="M">M</option>
                                <option value="M2">M²</option>
                                <option value="M3">M³</option>
                                <option value="PCS">PCS</option>
                                <option value="T">T</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(item.line_total)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                type="button"
                                className="text-primary hover:text-blue-800"
                                onClick={() => {
                                  const items = [...form.getValues("items")];
                                  items.splice(index, 1);
                                  form.setValue("items", items);
                                  // Update totals
                                  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
                                  const vatTotal = items.reduce((sum, item) => sum + (item.line_total * item.vat_rate / 100), 0);
                                  form.setValue("subtotal", subtotal);
                                  form.setValue("vat_total", vatTotal);
                                  form.setValue("total", subtotal + vatTotal);
                                }}
                              >
                                <span className="material-icons">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 text-center text-gray-500">
                            No items added yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <Button
                  type="button"
                  className="flex items-center"
                  onClick={() => {
                    // Add a new item
                    const items = [...form.getValues("items")];
                    items.push({
                      description: "New Item",
                      quantity: 1,
                      unit_price: 0,
                      vat_rate: 20,
                      unit_of_measure: "EA",
                      line_total: 0,
                      product_id: undefined
                    });
                    form.setValue("items", items);
                  }}
                >
                  <span className="material-icons mr-1 text-base">add</span>
                  Add Item
                </Button>
              </div>
            )}

            {currentStep === "compliance" && (
              <div>
                <h3 className="font-medium mb-4 text-neutral-dark">Compliance Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">PDF/A-3 Compliance</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      All invoices will be generated in PDF/A-3 format with embedded fonts and color profiles according to the standard requirements.
                    </p>
                    
                    <div className="flex items-start mb-2">
                      <div className="flex items-center h-5">
                        <input
                          id="embedFonts"
                          type="checkbox"
                          className="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
                          defaultChecked
                          disabled
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="embedFonts" className="font-medium text-gray-700">Embed all fonts</label>
                        <p className="text-gray-500">Required for PDF/A-3 compliance</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="colorProfile"
                          type="checkbox"
                          className="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
                          defaultChecked
                          disabled
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="colorProfile" className="font-medium text-gray-700">Include ICC color profiles</label>
                        <p className="text-gray-500">Required for PDF/A-3 compliance</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">XML Schema</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Generate Factur-X XML according to the selected profile requirements.
                    </p>
                    
                    <div className="mb-4">
                      <Label htmlFor="profile">XML Schema Version</Label>
                      <select defaultValue="FACTUR-X" disabled>
                        <option value="FACTUR-X">Factur-X (EN 16931)</option>
                        <option value="ZUGFERD">ZUGFeRD 2.1</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">XML schema version to use for generation</p>
                    </div>
                    
                    <div className="mb-4">
                      <Label htmlFor="validate">XML Validation</Label>
                      <select defaultValue="automatic">
                        <option value="automatic">Validate automatically</option>
                        <option value="manual">Validate manually</option>
                        <option value="none">No validation</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Whether to validate the invoice before generation</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "review" && (
              <div>
                <h3 className="font-medium mb-4 text-neutral-dark">Review Invoice</h3>
                
                <div className="border rounded-lg p-4 mb-4">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-lg">{form.getValues("invoice_number")}</h4>
                      <p className="text-sm text-gray-600">Issue Date: {form.getValues("issue_date")}</p>
                      <p className="text-sm text-gray-600">Due Date: {form.getValues("due_date")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Profile: <span className="font-medium">{form.getValues("profile")}</span></p>
                      <p className="text-sm">Currency: <span className="font-medium">{form.getValues("currency")}</span></p>
                    </div>
                  </div>
                  
                  <table className="min-w-full mb-4">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Quantity</th>
                        <th className="text-right py-2">Unit Price</th>
                        <th className="text-right py-2">VAT</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.watch("items").map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{item.description}</td>
                          <td className="text-right py-2">{item.quantity} {item.unit_of_measure}</td>
                          <td className="text-right py-2">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(item.unit_price)}</td>
                          <td className="text-right py-2">{item.vat_rate}%</td>
                          <td className="text-right py-2">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(item.line_total)}</td>
                        </tr>
                      ))}
                      <tr className="border-b">
                        <td colSpan={4} className="text-right py-2 font-medium">Subtotal:</td>
                        <td className="text-right py-2">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(form.getValues("subtotal"))}</td>
                      </tr>
                      <tr className="border-b">
                        <td colSpan={4} className="text-right py-2 font-medium">VAT Total:</td>
                        <td className="text-right py-2">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(form.getValues("vat_total"))}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="text-right py-2 font-medium">Total:</td>
                        <td className="text-right py-2 font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(form.getValues("total"))}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm"><span className="font-medium">Notes:</span> {form.getValues("notes")}</p>
                    <p className="text-sm"><span className="font-medium">Payment Terms:</span> {form.getValues("payment_terms")}</p>
                    {form.getValues("purchase_order_ref") && (
                      <p className="text-sm"><span className="font-medium">Reference:</span> {form.getValues("purchase_order_ref")}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            {currentStep !== "basic" && (
              <Button variant="outline" onClick={() => { logSelectEvent('Button', 'Back clicked'); handlePreviousStep(); }} className="mr-auto">
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => { logSelectEvent('Button', 'Cancel clicked'); onClose(); }}>
              Cancel
            </Button>
            <Button onClick={() => { logSelectEvent('Button', 'Next/Create clicked'); handleNextStep(); }}>
              {currentStep === "review" ? "Create Invoice" : "Next"}
            </Button>
          </div>
        </div>
      </dialog>
    ) : null
  );
}
