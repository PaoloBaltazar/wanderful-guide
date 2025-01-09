import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@/types/auth";
import { handleSignup, handleAuthError } from "@/utils/auth";
import { PersonalInfoFields } from "./PersonalInfoFields";
import { ContactInfoFields } from "./ContactInfoFields";
import { AdditionalInfoFields } from "./AdditionalInfoFields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Mail, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const SignupForm = () => {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
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
      setValidationError(null);
      
      // Check if security code matches
      if (data.security_code !== "hrd712") {
        toast({
          title: "Invalid Security Code",
          description: "Please enter the correct security code to create an account.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if email exists in profiles table
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', data.email)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error checking email:", profileError);
        setValidationError("An error occurred while checking email availability. Please try again.");
        setLoading(false);
        return;
      }

      if (existingProfile) {
        setValidationError("This email is already registered and confirmed. Please use a different email or login instead.");
        setLoading(false);
        return;
      }

      // Check for unconfirmed signups
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      });

      if (authError) {
        console.error("Error checking unconfirmed users:", authError);
        setValidationError("An error occurred while checking email status. Please try again.");
        setLoading(false);
        return;
      }

      const unconfirmedUser = users?.find(user => 
        user.email === data.email && !user.email_confirmed_at
      );

      if (unconfirmedUser) {
        setValidationError("This email address is already registered but not confirmed. Please check your email for the verification link.");
        setLoading(false);
        return;
      }
      
      const result = await handleSignup(data);
      if (result.success) {
        setShowConfirmation(true);
      }
      
    } catch (error: any) {
      const errorMessage = error.message || handleAuthError(error);
      console.error("Signup error:", errorMessage);
      setValidationError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    window.location.href = "/login";
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create an Account</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Fill in your details to get started
        </p>
      </div>

      {validationError && (
        <Alert variant="destructive" className="mb-6 border-2 border-destructive/50">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="ml-2">Error</AlertTitle>
          <AlertDescription className="ml-2 mt-1">
            {validationError}
          </AlertDescription>
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

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Account Created Successfully
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p>
                Your account has been created successfully! Please check your email to verify your account.
              </p>
              <div className="flex justify-center">
                <Mail className="h-12 w-12 text-blue-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                A verification link has been sent to your email address. Click the link to activate your account.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={handleConfirmationClose}>
              Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};