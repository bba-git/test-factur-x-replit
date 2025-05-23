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
    open ? (
      <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-lg shadow-lg sm:max-w-3xl max-h-screen overflow-auto w-full p-6">
          <div className="mb-4 border-b pb-2">
            <h2 className="text-xl font-bold">Invoice Validation</h2>
          </div>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Validating invoice...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className={`flex items-center mb-4 p-4 rounded-lg border ${validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {validationResult.isValid ? (
                    <>
                      <span className="material-icons text-success mr-3 text-2xl">check_circle</span>
                      <div>
                        <h3 className="font-medium text-lg text-green-800">Invoice is Valid</h3>
                        <p className="text-sm text-green-700">This invoice meets all Factur-X/ZUGFeRD requirements</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-error mr-3 text-2xl">error</span>
                      <div>
                        <h3 className="font-medium text-lg text-red-800">Validation Issues Found</h3>
                        <p className="text-sm text-red-700">The invoice doesn't comply with Factur-X/ZUGFeRD standards</p>
                      </div>
                    </>
                  )}
                </div>
                {!validationResult.isValid && (
                  <>
                    <p className="text-gray-600 mb-4">Please fix the following issues to ensure compliance:</p>
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <ul className="list-disc pl-5 space-y-2 text-red-800">
                        {validationResult.errors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
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
                    <pre className={`text-xs font-mono ${validationResult.xmlValid ? 'text-gray-800' : 'text-red-600'}`}>{validationResult.xmlContent}</pre>
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
              <div className="flex gap-2 justify-end mt-6 border-t pt-4">
                <button className="btn btn-outline" onClick={onClose}>
                  Close
                </button>
                {!validationResult.isValid && (
                  <button className="btn btn-primary" onClick={handleFixIssues}>
                    Fix Issues
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </dialog>
    ) : null
  );
}
