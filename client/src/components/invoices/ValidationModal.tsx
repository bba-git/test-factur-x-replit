import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Invoice } from "@shared/schema";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface ValidationModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export default function ValidationModal({ open, onClose, invoice }: ValidationModalProps) {
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    pdfValid: boolean;
    xmlValid: boolean;
    errors: string[];
    xmlContent?: string;
  }>({
    isValid: false,
    pdfValid: false,
    xmlValid: false,
    errors: [],
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && invoice) {
      validateInvoice();
    }
  }, [open, invoice]);

  const validateInvoice = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("GET", `/api/invoices/${invoice.id}/validate`, undefined);
      const data = await response.json();
      setValidationResult(data);
    } catch (error) {
      console.error("Error validating invoice:", error);
      setValidationResult({
        isValid: false,
        pdfValid: false,
        xmlValid: false,
        errors: ["Failed to validate invoice. Please try again."],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixIssues = async () => {
    try {
      await apiRequest("POST", `/api/invoices/${invoice.id}/fix`, undefined);
      onClose();
    } catch (error) {
      console.error("Error fixing issues:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-screen overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Invoice Validation</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Validating invoice...</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center mb-4">
                {validationResult.isValid ? (
                  <>
                    <span className="material-icons text-success mr-2">check_circle</span>
                    <h3 className="font-medium text-lg">Invoice is Valid</h3>
                  </>
                ) : (
                  <>
                    <span className="material-icons text-error mr-2">error</span>
                    <h3 className="font-medium text-lg">Validation Issues Found</h3>
                  </>
                )}
              </div>
              
              {!validationResult.isValid && (
                <>
                  <p className="text-gray-600 mb-4">The invoice doesn't comply with Factur-X/ZUGFeRD standards. Please fix the following issues:</p>
                  
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <ul className="list-disc pl-5 space-y-2">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">XML Validation</h3>
              {validationResult.xmlContent ? (
                <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                  <pre className={`text-xs font-mono ${validationResult.xmlValid ? 'text-gray-800' : 'text-red-600'}`}>
                    {validationResult.xmlContent}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-600">No XML content available for validation.</p>
              )}
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">PDF/A-3 Validation</h3>
              <div className={`flex items-center ${validationResult.pdfValid ? 'text-success' : 'text-error'}`}>
                <span className="material-icons mr-2">{validationResult.pdfValid ? 'check_circle' : 'error'}</span>
                <span>
                  {validationResult.pdfValid 
                    ? 'PDF/A-3 structure is valid (fonts embedded, color profiles included)' 
                    : 'PDF/A-3 structure is invalid'}
                </span>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {!validationResult.isValid && (
                <Button onClick={handleFixIssues}>
                  Fix Issues
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
