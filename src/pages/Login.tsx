import { useEffect, useState } from "react";
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
  const [showSignup, setShowSignup] = useState(false);
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
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        {showSignup ? (
          <>
            <SignupForm />
            <p className="text-center mt-4">
              Already have an account?{" "}
              <button
                onClick={() => setShowSignup(false)}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center">Welcome Back</h1>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#2563eb',
                      brandAccent: '#1d4ed8',
                    },
                  },
                },
              }}
              providers={[]}
              localization={{
                variables: {
                  sign_in: {
                    email_label: "Outlook Email",
                    email_input_placeholder: "your.email@outlook.com",
                  },
                  sign_up: {
                    email_label: "Outlook Email",
                    email_input_placeholder: "your.email@outlook.com",
                  },
                },
              }}
            />
            <p className="text-center mt-4">
              Don't have an account?{" "}
              <button
                onClick={() => setShowSignup(true)}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </p>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Login;