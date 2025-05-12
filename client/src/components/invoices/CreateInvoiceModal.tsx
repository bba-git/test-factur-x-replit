import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceWithItemsSchema, InvoiceWithItems, FacturXProfileEnum } from "@shared/schema";
import { SelectField } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateInvoiceModal({ open, onClose }: CreateInvoiceModalProps) {
  const [currentStep, setCurrentStep] = useState("basic"); // "basic", "items", "compliance", "review"
  const { toast } = useToast();

  const form = useForm<InvoiceWithItems>({
    resolver: zodResolver(invoiceWithItemsSchema),
    defaultValues: {
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      customerId: 0,
      companyProfileId: 1,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: "EUR",
      subtotal: 0,
      vatTotal: 0,
      total: 0,
      paymentTerms: "Net 30",
      profile: "BASIC_WL",
      status: "DRAFT",
      items: []
    }
  });

  const createInvoice = async (data: InvoiceWithItems) => {
    try {
      await apiRequest("POST", "/api/invoices", data);
      toast({
        title: "Invoice created",
        description: "Your invoice has been created successfully",
      });
      onClose();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNextStep = () => {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-screen overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Invoice</DialogTitle>
        </DialogHeader>
        
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
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input 
                    id="invoiceNumber"
                    {...form.register("invoiceNumber")}
                    className="mt-1"
                  />
                  {form.formState.errors.invoiceNumber && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.invoiceNumber.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="issueDate">Invoice Date</Label>
                  <Input 
                    id="issueDate"
                    type="date"
                    {...form.register("issueDate")}
                    className="mt-1"
                  />
                  {form.formState.errors.issueDate && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.issueDate.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input 
                    id="dueDate"
                    type="date"
                    {...form.register("dueDate")}
                    className="mt-1"
                  />
                  {form.formState.errors.dueDate && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.dueDate.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="currency">Currency</Label>
                  <Select defaultValue={form.getValues("currency")} onValueChange={(value) => form.setValue("currency", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.currency && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.currency.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select defaultValue={form.getValues("paymentTerms")} onValueChange={(value) => form.setValue("paymentTerms", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.paymentTerms && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.paymentTerms.message}</p>
                  )}
                </div>
              </div>
              
              {/* Customer Info */}
              <div>
                <h3 className="font-medium mb-4 text-neutral-dark">Customer Information</h3>
                
                <div className="mb-4">
                  <Label htmlFor="customerId">Customer</Label>
                  <Select defaultValue={String(form.getValues("customerId"))} onValueChange={(value) => form.setValue("customerId", parseInt(value))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Acme Corporation</SelectItem>
                      <SelectItem value="2">TechSolutions SAS</SelectItem>
                      <SelectItem value="3">Global Imports GmbH</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.customerId && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.customerId.message}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="purchaseOrderRef">Reference</Label>
                  <Input 
                    id="purchaseOrderRef"
                    placeholder="PO-2023-1234"
                    {...form.register("purchaseOrderRef")}
                    className="mt-1"
                  />
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="profile">Factur-X/ZUGFeRD Profile</Label>
                  <Select defaultValue={form.getValues("profile")} onValueChange={(value) => form.setValue("profile", value as keyof typeof FacturXProfileEnum.enum)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select profile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MINIMUM">MINIMUM</SelectItem>
                      <SelectItem value="BASIC_WL">BASIC WL</SelectItem>
                      <SelectItem value="EN16931">EN16931 (FULL)</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Select defaultValue="FACTUR-X" disabled>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select schema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FACTUR-X">Factur-X (EN 16931)</SelectItem>
                        <SelectItem value="ZUGFERD">ZUGFeRD 2.1</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">XML schema version to use for generation</p>
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="validate">XML Validation</Label>
                    <Select defaultValue="automatic">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select validation option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatic">Validate automatically</SelectItem>
                        <SelectItem value="manual">Validate manually</SelectItem>
                        <SelectItem value="none">No validation</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <h4 className="font-medium text-lg">{form.getValues("invoiceNumber")}</h4>
                    <p className="text-sm text-gray-600">Issue Date: {form.getValues("issueDate")}</p>
                    <p className="text-sm text-gray-600">Due Date: {form.getValues("dueDate")}</p>
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
                      <td className="text-right py-2">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(form.getValues("vatTotal"))}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="text-right py-2 font-medium">Total:</td>
                      <td className="text-right py-2 font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: form.getValues("currency") }).format(form.getValues("total"))}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="border-t pt-4">
                  <p className="text-sm"><span className="font-medium">Notes:</span> {form.getValues("notes")}</p>
                  <p className="text-sm"><span className="font-medium">Payment Terms:</span> {form.getValues("paymentTerms")}</p>
                  {form.getValues("purchaseOrderRef") && (
                    <p className="text-sm"><span className="font-medium">Reference:</span> {form.getValues("purchaseOrderRef")}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {currentStep !== "basic" && (
            <Button variant="outline" onClick={handlePreviousStep} className="mr-auto">
              Back
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleNextStep}>
            {currentStep === "review" ? "Create Invoice" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
