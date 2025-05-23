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

export default function CreateInvoiceModal({ open, onClose }: CreateInvoiceModalProps) {
  useEffect(() => {
    console.log('[Modal] Mount');
    return () => console.log('[Modal] Unmount');
  }, []);
  useEffect(() => {
    console.log('[Modal] Open state changed:', open);
  }, [open]);
  const [currentStep, setCurrentStep] = useState<"basic" | "items" | "compliance" | "review">("basic");
  const { toast } = useToast();
  const [profileSelectOpen, setProfileSelectOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const form = useForm<InvoiceWithItems>({
    resolver: zodResolver(invoiceWithItemsSchema),
    defaultValues: {
      invoice_number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      customer_id: 0,
      company_profile_id: 1,
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
      setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  const createInvoice = async (data: InvoiceWithItems) => {
    console.log('[Form] Submitting invoice:', data);
    try {
      // Convert to snake_case for the API
      const apiData = {
        invoice_number: data.invoice_number,
        customer_id: data.customer_id,
        company_profile_id: data.company_profile_id,
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
          unit_price: item.unitPrice,
          vat_rate: item.vatRate,
          unit_of_measure: item.unitOfMeasure,
          line_total: item.lineTotal
        }))
      };

      const response = await apiRequest("POST", "/api/invoices", apiData);
      const invoice = await response.json();
      
      // Download the PDF
      const pdfResponse = await fetch(`/api/invoices/${invoice.id}/download`);
      const pdfBlob = await pdfResponse.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Invoice created",
        description: "Your invoice has been created and downloaded successfully",
      });
      onClose();
    } catch (error) {
      console.error("[Form] Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNextStep = () => {
    if (profileSelectOpen) setProfileSelectOpen(false);
    console.log('[Button] Next step clicked. Current:', currentStep);
    switch(currentStep) {
      case "basic":
        setCurrentStep("items");
        break;
      case "items":
        setCurrentStep("compliance");
        break;
      case "compliance":
        setCurrentStep("review");
        break;
      case "review":
        form.handleSubmit(createInvoice)();
        break;
    }
  };

  const handlePreviousStep = () => {
    if (profileSelectOpen) setProfileSelectOpen(false);
    console.log('[Button] Previous step clicked. Current:', currentStep);
    switch(currentStep) {
      case "items":
        setCurrentStep("basic");
        break;
      case "compliance":
        setCurrentStep("items");
        break;
      case "review":
        setCurrentStep("compliance");
        break;
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
                        const value = parseInt(e.target.value);
                        form.setValue("customer_id", value, { 
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {form.watch("items").length > 0 ? (
                        form.watch("items").map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{item.description}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{item.quantity} {item.unitOfMeasure}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(item.unitPrice)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{item.vatRate}%</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(item.lineTotal)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                type="button"
                                className="text-primary hover:text-blue-800"
                                onClick={() => {
                                  const items = [...form.getValues("items")];
                                  items.splice(index, 1);
                                  form.setValue("items", items);
                                }}
                              >
                                <span className="material-icons">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-center text-gray-500">
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
                      unitPrice: 0,
                      vatRate: 20,
                      unitOfMeasure: "EA",
                      lineTotal: 0,
                      productId: undefined
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
                          <td className="text-right py-2">{item.quantity} {item.unitOfMeasure}</td>
                          <td className="text-right py-2">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(item.unitPrice)}</td>
                          <td className="text-right py-2">{item.vatRate}%</td>
                          <td className="text-right py-2">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(item.lineTotal)}</td>
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
