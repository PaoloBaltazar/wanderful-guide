import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@/types/auth";
import { handleSignup, handleAuthError } from "@/utils/auth";
import { PersonalInfoFields } from "./PersonalInfoFields";
import { ContactInfoFields } from "./ContactInfoFields";
import { AdditionalInfoFields } from "./AdditionalInfoFields";
import { supabase } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export const SignupForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      birthdate: "",
      contact_number: "",
      address: "",
      gender: "other",
      security_code: "",
      position: "",
      full_name: "",
    },
    mode: "onChange",
  });

  const email = form.watch("email");
  const debouncedEmail = useDebounce(email, 500);

  // Check for existing email on change
  useEffect(() => {
    const checkEmail = async () => {
      if (!debouncedEmail) return;

      try {
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', debouncedEmail)
          .maybeSingle();

        if (profileError) {
          console.error("Error checking email:", profileError);
          return;
        }

        if (existingProfile) {
          setEmailError("This email is already registered");
          form.setError("email", {
            type: "manual",
            message: "This email is already registered"
          });
        } else {
          setEmailError(null);
          form.clearErrors("email");
        }
      } catch (error) {
        console.error("Error checking email:", error);
      }
    };

    checkEmail();
  }, [debouncedEmail, form]);

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check security code
      if (data.security_code !== "hrd712") {
        toast({
          title: "Invalid Security Code",
          description: "Please enter the correct security code to create an account.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check for existing email one more time before submission
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', data.email)
        .maybeSingle();

      if (existingProfile) {
        setError("This email is already registered. Please use a different email.");
        setEmailError("This email is already registered");
        form.setError("email", {
          type: "manual",
          message: "This email is already registered"
        });
        setLoading(false);
        return;
      }

      const result = await handleSignup(data);
      if (result.success) {
        navigate("/success-confirmation");
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      const errorMessage = error.message || handleAuthError(error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create an Account</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Fill in your details to get started
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6 shadow-lg border-0 bg-white/50 backdrop-blur-sm dark:bg-gray-800/50">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <PersonalInfoFields form={form} loading={loading} />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact Information</h3>
                <ContactInfoFields form={form} loading={loading} />
                {emailError && (
                  <div className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {emailError}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>
                <AdditionalInfoFields form={form} loading={loading} />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white" 
              disabled={loading || !!emailError}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};