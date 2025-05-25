import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Customer } from "@shared/types";
import { customerFormSchema } from "@shared/schemas";
import { createCustomer } from "@/lib/services/customerService";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface CreateCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCustomerCreated?: () => void;
}

type CustomerFormData = {
  name: string;
  vatNumber: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  contactPerson: string | null;
};

export default function CreateCustomerModal({ open, onClose, onCustomerCreated }: CreateCustomerModalProps) {
  console.log("[CreateCustomerModal] Component rendering with open:", open);
  
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("[CreateCustomerModal] Modal open state changed:", open);
  }, [open]);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      vatNumber: null,
      address: null,
      email: null,
      phone: null,
      city: null,
      postalCode: null,
      country: null,
      contactPerson: null
    }
  });

  const onSubmit = async (data: CustomerFormData) => {
    console.log("[CreateCustomerModal] Form submitted with raw data:", JSON.stringify(data, null, 2));
    setIsLoading(true);
    try {
      // Convert camelCase to snake_case for API
      const apiData = {
        name: data.name,
        vat_number: data.vatNumber,
        address: data.address,
        email: data.email,
        phone: data.phone,
        city: data.city || "", // Ensure city is never null
        postal_code: data.postalCode || "", // Ensure postal_code is never null
        country: data.country || "", // Ensure country is never null
        contact_person: data.contactPerson,
        company_profile_id: null
      } as Omit<Customer, 'id' | 'created_at' | 'updated_at'>;

      console.log("[CreateCustomerModal] Transformed data for API:", JSON.stringify(apiData, null, 2));
      console.log("[CreateCustomerModal] Sending API request with data:", JSON.stringify(apiData, null, 2));
      
      const response = await createCustomer(apiData);
      console.log("[CreateCustomerModal] API response:", JSON.stringify(response, null, 2));
      
      console.log("[CreateCustomerModal] Customer created successfully");
      toast({
        title: "Customer created",
        description: "The customer has been created successfully",
      });
      
      // Dispatch custom event for customer creation
      window.dispatchEvent(new Event('customerCreated'));
      
      if (onCustomerCreated) {
        console.log("[CreateCustomerModal] Calling onCustomerCreated callback");
        onCustomerCreated();
      }
      
      form.reset();
      onClose();
    } catch (error) {
      console.error("[CreateCustomerModal] Error creating customer:", error);
      console.error("[CreateCustomerModal] Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    console.log("[CreateCustomerModal] Modal not open, returning null");
    return null;
  }

  console.log("[CreateCustomerModal] Rendering modal content");
  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg sm:max-w-2xl w-full p-6">
        <div className="mb-4 border-b pb-2">
          <h2 className="text-xl font-bold">Create New Customer</h2>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Customer Name *</Label>
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
              onClick={() => {
                console.log("[CreateCustomerModal] Submit button clicked");
                console.log("[CreateCustomerModal] Form state:", form.getValues());
                console.log("[CreateCustomerModal] Form errors:", form.formState.errors);
              }}
            >
              {isLoading ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
} 