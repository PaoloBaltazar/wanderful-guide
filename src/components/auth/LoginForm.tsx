
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";

export const LoginForm = () => {
  return (
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
        style: {
          anchor: { display: 'none' },
          message: { display: 'none' },
        },
        className: {
          anchor: 'hidden',
          button: 'w-full bg-primary hover:bg-primary/90 text-white',
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
      view="sign_in"
    />
  );
};
