
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SignupForm } from "@/components/auth/SignupForm";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "@/components/auth/LoginForm";
import { EmailConfirmationAlert } from "@/components/auth/EmailConfirmationAlert";
import { LoginError } from "@/components/auth/LoginError";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSignup, setShowSignup] = useState(false);
  const [searchParams] = useSearchParams();
  const [emailConfirmationError, setEmailConfirmationError] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

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
      handleEmailConfirmation(token_hash, type);
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Listen for auth errors
    window.addEventListener('supabase.auth.error', handleAuthError as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('supabase.auth.error', handleAuthError as EventListener);
    };
  }, [navigate, toast, searchParams]);

  const handleEmailConfirmation = async (token_hash: string, type: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });
      
      if (!error) {
        navigate("/success-confirmation");
      } else {
        console.error("Email verification error:", error);
        toast({
          title: "Error",
          description: "Invalid or expired verification link",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Email verification error:", error);
    }
  };

  const handleAuthStateChange = async (event: string, session: any) => {
    console.log("Auth state changed:", event, session);
    
    if (event === "SIGNED_IN" && session) {
      toast({
        title: "Success",
        description: "Successfully signed in",
      });
      navigate("/");
    } else if (event === "USER_UPDATED") {
      resetErrors();
    } else if (event === "SIGNED_OUT") {
      resetErrors();
    }
  };

  const handleAuthError = async (e: CustomEvent<any>) => {
    const error = e.detail?.error;
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    const email = emailInput?.value;

    if (error?.message === "Email not confirmed") {
      setEmailConfirmationError(true);
      setUnconfirmedEmail(email || null);
    } else if (error?.message.includes("Invalid login credentials")) {
      setLoginError("Invalid email or password. Please try again.");
      await logFailedLoginAttempt(email);
    }
  };

  const logFailedLoginAttempt = async (email: string) => {
    try {
      const response = await fetch(`${window.location.origin}/functions/v1/handle-failed-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        console.error('Failed to log login attempt');
      }
    } catch (error) {
      console.error('Error logging failed login:', error);
    }
  };

  const handleResendVerification = async () => {
    if (!unconfirmedEmail) return;

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unconfirmedEmail,
      });

      if (error) {
        console.error("Resend verification error:", error);
        toast({
          title: "Error",
          description: "Failed to resend verification email",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Verification email sent",
        });
      }
    } catch (error) {
      console.error("Resend verification error:", error);
    }
  };

  const resetErrors = () => {
    setEmailConfirmationError(false);
    setUnconfirmedEmail(null);
    setLoginError(null);
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {showSignup ? (
            <>
              <SignupForm />
              <p className="text-center mt-6 text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setShowSignup(false)}
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Sign in to your account to continue
                </p>
              </div>

              <EmailConfirmationAlert 
                email={unconfirmedEmail} 
                onResend={handleResendVerification} 
              />

              <LoginError error={loginError} />

              <div className="mt-8">
                <LoginForm />
              </div>

              <p className="text-center mt-6 text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => setShowSignup(true)}
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Login;
