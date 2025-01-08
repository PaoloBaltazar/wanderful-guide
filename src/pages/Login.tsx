import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SignupForm } from "@/components/auth/SignupForm";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };

    checkSession();

    // Handle email confirmation from URL
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    
    if (token_hash && type) {
      const handleEmailConfirmation = async () => {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });
        
        if (!error) {
          navigate("/success-confirmation");
        } else {
          toast({
            title: "Error",
            description: "Invalid or expired verification link",
            variant: "destructive",
          });
        }
      };
      
      handleEmailConfirmation();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          toast({
            title: "Success",
            description: "Successfully signed in",
          });
          navigate("/");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast, searchParams]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to your account to continue
            </p>
          </div>
          <div className="mt-8">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#1E40AF',
                      brandAccent: '#1E40AF',
                    },
                  },
                },
                className: {
                  anchor: 'hidden', // This hides the "Forgot your password" link
                  container: 'space-y-0', // Removes extra spacing
                },
              }}
              providers={[]}
              localization={{
                variables: {
                  sign_in: {
                    email_label: "Outlook Email",
                    email_input_placeholder: "your.email@outlook.com",
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;