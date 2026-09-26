import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { isRemembered, setRememberMe } from "@/lib/rememberMe";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.svg";
import { ArrowRight, Loader2, Mail, ShieldCheck, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/app") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

/** Translate raw server errors into calm, human wording. */
function friendlyAuthError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const msg = raw.toLowerCase();
  if (msg.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (msg.includes("invalid credentials")) {
    return "That email and password don't match an account. Please try again.";
  }
  if (msg.includes("invalid password") || msg.includes("at least 8")) {
    return "Please choose a password of at least 8 characters.";
  }
  if (msg.includes("could not verify code") || msg.includes("invalid verification code")) {
    return "That code didn't match. Please check the most recent email and try again.";
  }
  if (msg.includes("too many")) {
    return "Too many attempts just now. Please wait a minute and try again.";
  }
  return raw || fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signIn" | "signUp">(
    searchParams.get("mode") === "signup" ? "signUp" : "signIn",
  );
  const [step, setStep] = useState<"form" | "remember" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(isRemembered());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const switchMode = (next: "signIn" | "signUp") => {
    setMode(next);
    setStep("form");
    setError(null);
    setNotice(null);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || password.length < 8) {
      setError("Please enter your email and a password of at least 8 characters.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setNotice(null);
    setEmail(nextEmail);
    try {
      if (mode === "signUp") {
        // First-time sign-up: creates the account and emails a one-time code.
        await signIn("password", { flow: "signUp", email: nextEmail, password });
        setStep("remember");
      } else {
        // Record the remember-me choice BEFORE signing in, so the session
        // tokens land in the right place (kept for a month, or this tab only).
        setRememberMe(remember);
        const result = await signIn("password", {
          flow: "signIn",
          email: nextEmail,
          password,
        });
        if (result.signingIn) {
          navigate(redirect);
        } else {
          // The account exists but never finished email verification — a fresh
          // code was just sent, so complete verification now.
          setStep("verify");
        }
      }
    } catch (e) {
      setError(friendlyAuthError(e, "Something went wrong. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRememberChoice = (choice: boolean) => {
    setRemember(choice);
    setRememberMe(choice);
    setStep("verify");
  };

  const handleVerifySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("password", {
        flow: "email-verification",
        email,
        code,
      });
      if (!result.signingIn) {
        throw new Error("Could not verify code");
      }
      navigate(redirect);
    } catch (e) {
      setError(friendlyAuthError(e, "That code didn't match. Please check the most recent email."));
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      await signIn("password", { flow: "signUp", email, password });
      setNotice(`A fresh code is on its way to ${email}.`);
    } catch (e) {
      setError(friendlyAuthError(e, "Couldn't send a new code. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (e) {
      setError(friendlyAuthError(e, "Couldn't start a guest session. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const modeButtonClass = (m: "signIn" | "signUp") =>
    cn(
      "h-11 text-base font-semibold transition-colors",
      mode === m
        ? "bg-swiss-red text-white"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-2 border-foreground shadow-md">
          {step === "form" ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center">
                  <img
                    src={logo}
                    alt="Memento"
                    width={64}
                    height={64}
                    className="rounded-lg mb-2 mt-2 cursor-pointer"
                    onClick={() => navigate("/")}
                  />
                </div>
                <CardTitle className="type-display text-3xl">
                  {mode === "signIn" ? "Welcome back" : "Create your family account"}
                </CardTitle>
                <CardDescription className="text-base">
                  {mode === "signIn"
                    ? "Sign in with your email and password."
                    : "Just an email and a password — your family is set up in the next step."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-1 border-2 border-foreground/30 p-1">
                  <button type="button" onClick={() => switchMode("signIn")} className={modeButtonClass("signIn")}>
                    Sign in
                  </button>
                  <button type="button" onClick={() => switchMode("signUp")} className={modeButtonClass("signUp")}>
                    Create account
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="auth-email" className="label-caps text-muted-foreground">
                      Email
                    </label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="auth-email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@example.com"
                        className="h-14 pl-10 text-lg"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="auth-password" className="label-caps text-muted-foreground">
                      Password
                    </label>
                    <Input
                      id="auth-password"
                      type="password"
                      autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                      placeholder={mode === "signUp" ? "At least 8 characters" : "Your password"}
                      className="mt-2 h-14 text-lg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {mode === "signIn" && (
                    <label className="flex cursor-pointer items-center gap-3 border-2 border-foreground/30 px-4 py-3 text-base transition-colors hover:border-foreground">
                      <Checkbox
                        checked={remember}
                        onCheckedChange={(v) => setRemember(v === true)}
                        className="size-5"
                      />
                      <span>Remember me on this device for a month</span>
                    </label>
                  )}

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <Button type="submit" className="h-14 w-full text-lg font-bold" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {mode === "signUp" ? "Create account" : "Sign in"}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 h-12 w-full border-2 text-base"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Continue as guest
                  </Button>
                </div>
              </CardContent>
            </>
          ) : step === "remember" ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center">
                  <img
                    src={logo}
                    alt="Memento"
                    width={64}
                    height={64}
                    className="rounded-lg mb-2 mt-2 cursor-pointer"
                    onClick={() => navigate("/")}
                  />
                </div>
                <CardTitle className="type-display text-3xl">Stay signed in?</CardTitle>
                <CardDescription className="text-base">
                  Should this device remember you? If yes, Memento opens straight
                  to your family's space for the next month — no password needed
                  when you return.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-6">
                <Button
                  type="button"
                  className="h-16 w-full text-lg font-bold"
                  onClick={() => handleRememberChoice(true)}
                  disabled={isLoading}
                >
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  Yes — remember me for a month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-16 w-full border-2 text-lg"
                  onClick={() => handleRememberChoice(false)}
                  disabled={isLoading}
                >
                  No thanks — ask for my password each time
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  You can change your mind any time by signing out and signing in
                  again.
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center">
                  <img
                    src={logo}
                    alt="Memento"
                    width={64}
                    height={64}
                    className="rounded-lg mb-2 mt-2 cursor-pointer"
                    onClick={() => navigate("/")}
                  />
                </div>
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <CardDescription className="text-base">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold text-foreground">{email}</span>.
                  It's needed only the first time you sign up — next time, your
                  email and password are enough.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleVerifySubmit}>
                <CardContent className="pb-4">
                  <div className="flex justify-center">
                    <InputOTP
                      value={code}
                      onChange={setCode}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && code.length === 6 && !isLoading) {
                          const form = (e.target as HTMLElement).closest("form");
                          if (form) {
                            form.requestSubmit();
                          }
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
                  {notice && <p className="mt-2 text-center text-sm text-swiss-blue">{notice}</p>}
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Didn't get it?{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0"
                      onClick={handleResendCode}
                      disabled={isLoading}
                    >
                      Send a new code
                    </Button>
                  </p>
                </CardContent>
                <CardFooter className="flex-col gap-2 pb-6">
                  <Button
                    type="submit"
                    className="h-14 w-full text-lg font-bold"
                    disabled={isLoading || code.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify code
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setStep("form");
                      setError(null);
                      setCode("");
                    }}
                    disabled={isLoading}
                  >
                    Use a different email
                  </Button>
                </CardFooter>
              </form>
            </>
          )}

          <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted border-t rounded-b-lg">
            Secured by{" "}
            <a
              href="https://freebuff.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              freebuff.com
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
