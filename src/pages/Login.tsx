
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginError } from "@/components/auth/LoginError";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      setLoginError(null);

      if (email !== "hradmin@yourcompany.com") {
        setLoginError("Only admin login is allowed.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setLoginError(signInError.message);
        return;
      }

      // After successful login, send magic link for 2FA
      const { error: mfaError } = await supabase.auth.signInWithOtp({
        email,
      });

      if (mfaError) {
        setLoginError(mfaError.message);
        return;
      }

      setMfaEnabled(true);
      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link",
      });

    } catch (error: any) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Login</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to manage employees
            </p>
          </div>

          {mfaEnabled ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                A verification link has been sent to your email. Please check your inbox and click the link to complete the login process.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <LoginError error={loginError} />
              <div className="mt-8">
                <LoginForm onSubmit={handleLogin} loading={loading} />
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Login;
