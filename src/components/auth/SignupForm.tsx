
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@/types/auth";
import { handleAuthError } from "@/utils/auth";
import { PersonalInfoFields } from "./PersonalInfoFields";
import { ContactInfoFields } from "./ContactInfoFields";
import { AdditionalInfoFields } from "./AdditionalInfoFields";
import { supabase } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";

export const SignupForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  });

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
        return;
      }

      // Sign up with Supabase auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            full_name: data.full_name,
            birthdate: data.birthdate,
            contact_number: data.contact_number,
            address: data.address,
            gender: data.gender,
            position: data.position
          },
          emailRedirectTo: `${window.location.origin}/success-confirmation`
        }
      });

      if (signUpError) {
        console.error("Signup error details:", signUpError);
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error("Failed to create user account");
      }

      // Show success message
      toast({
        title: "Account created",
        description: "Please check your email to verify your account.",
      });

      // Navigate to success page
      navigate("/success-confirmation");
      
    } catch (error: any) {
      console.error("Signup error:", error);
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>
                <AdditionalInfoFields form={form} loading={loading} />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white" 
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};
