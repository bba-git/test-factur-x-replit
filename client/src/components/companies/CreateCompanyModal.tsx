import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CompanyProfile } from "@shared/types";
import { companyProfileFormSchema } from "@shared/schemas";
import { createCompany } from "@/lib/services/companyService";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface CreateCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onCompanyCreated?: () => void;
}

type CompanyFormData = {
  name: string;
  vatNumber: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  contactPerson: string | null;
  bankAccount: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
};

export default function CreateCompanyModal({ open, onClose, onCompanyCreated }: CreateCompanyModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyProfileFormSchema),
    defaultValues: {
      name: "",
      vatNumber: null,
      address: null,
      email: null,
      phone: null,
      city: null,
      postalCode: null,
      country: null,
      contactPerson: null,
      bankAccount: null,
      bankName: null,
      iban: null,
      bic: null
    }
  });

  const onSubmit = async (data: CompanyFormData) => {
    setIsLoading(true);
    try {
      // Convert camelCase to snake_case for API
      const apiData = {
        name: data.name,
        vat_number: data.vatNumber,
        address: data.address,
        email: data.email,
        phone: data.phone,
        city: data.city,
        postal_code: data.postalCode,
        country: data.country,
        contact_person: data.contactPerson,
        bank_account: data.bankAccount,
        bank_name: data.bankName,
        iban: data.iban,
        bic: data.bic
      } as Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>;

      await createCompany(apiData as CompanyProfile);
      
      toast({
        title: "Company created",
        description: "The company has been created successfully",
      });
      
      if (onCompanyCreated) {
        onCompanyCreated();
      }
      
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error creating company:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create company. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg sm:max-w-2xl w-full p-6">
        <div className="mb-4 border-b pb-2">
          <h2 className="text-xl font-bold">Create New Company</h2>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input
                id="vatNumber"
                {...form.register("vatNumber")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.vatNumber && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.vatNumber.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...form.register("address")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...form.register("city")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.city && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                {...form.register("postalCode")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.postalCode && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.postalCode.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...form.register("country")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.country && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.country.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                {...form.register("contactPerson")}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Input
                id="bankAccount"
                {...form.register("bankAccount")}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                {...form.register("bankName")}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                {...form.register("iban")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.iban && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.iban.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bic">BIC</Label>
              <Input
                id="bic"
                {...form.register("bic")}
                className="mt-1"
                disabled={isLoading}
              />
              {form.formState.errors.bic && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.bic.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Company"}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
} 