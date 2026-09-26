import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { authStorage } from "@/lib/rememberMe";
import { LanguageProvider } from "@/hooks/use-language";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const PatientHome = lazy(() => import("./pages/app/PatientHome.tsx"));
const PhotoGame = lazy(() => import("./pages/app/PhotoGame.tsx"));
const TreeGame = lazy(() => import("./pages/app/TreeGame.tsx"));
const Jigsaw = lazy(() => import("./pages/app/Jigsaw.tsx"));
const PatientReminders = lazy(() => import("./pages/app/PatientReminders.tsx"));
const PatientHelpers = lazy(() => import("./pages/app/PatientHelpers.tsx"));
const CareOverview = lazy(() => import("./pages/care/CareOverview.tsx"));
const CareFamily = lazy(() => import("./pages/care/CareFamily.tsx"));
const CareReminders = lazy(() => import("./pages/care/CareReminders.tsx"));
const CareHelpers = lazy(() => import("./pages/care/CareHelpers.tsx"));
const CareProfile = lazy(() => import("./pages/care/CareProfile.tsx"));
const MemoryLibrary = lazy(() => import("./pages/app/MemoryLibrary.tsx"));
const CareLibraryInfo = lazy(() => import("./pages/care/CareLibraryInfo.tsx"));
const PatientMusic = lazy(() => import("./pages/app/PatientMusic.tsx"));
const CareMusic = lazy(() => import("./pages/care/CareMusic.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


function TitledRoute({ title, children }: { title: string; children: React.ReactNode }) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex} storage={authStorage}>
        <LanguageProvider>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<TitledRoute title="Memento — personalized dementia care"><Landing /></TitledRoute>} />
              <Route
                path="/auth"
                element={
                  <TitledRoute title="Sign in — Memento">
                    <AuthPage redirectAfterAuth="/app" />
                  </TitledRoute>
                }
              />
              <Route
                path="/app"
                element={                    <TitledRoute title="Memento — Activities">
                    <RequireAuth>
                      <PatientHome />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/app/game/photo"
                element={                    <TitledRoute title="Photo recognition — Memento">
                    <RequireAuth>
                      <PhotoGame />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/app/game/tree"
                element={                    <TitledRoute title="Family connections — Memento">
                    <RequireAuth>
                      <TreeGame />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/app/jigsaw"
                element={                    <TitledRoute title="Photo puzzle — Memento">
                    <RequireAuth>
                      <Jigsaw />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/app/reminders"
                element={                    <TitledRoute title="Reminders — Memento">
                    <RequireAuth>
                      <PatientReminders />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/app/helpers"
                element={
                  <TitledRoute title="Helpers — Memento">
                    <RequireAuth>
                      <PatientHelpers />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/app/music"
                element={
                  <TitledRoute title="Music — Memento">
                    <RequireAuth>
                      <PatientMusic />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/app/library"
                element={
                  <TitledRoute title="Memory library — Memento">
                    <RequireAuth>
                      <MemoryLibrary />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/care"
                element={
                  <TitledRoute title="Caregiver dashboard — Memento">
                    <RequireAuth>
                      <CareOverview />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/care/music"
                element={
                  <TitledRoute title="Activity music — Memento">
                    <RequireAuth>
                      <CareMusic />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/care/library"
                element={
                  <TitledRoute title="Memory library — Memento">
                    <RequireAuth>
                      <CareLibraryInfo />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/care/family"
                element={
                  <TitledRoute title="Family & photos — Memento">
                    <RequireAuth>
                      <CareFamily />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/care/reminders"
                element={
                  <TitledRoute title="Manage reminders — Memento">
                    <RequireAuth>
                      <CareReminders />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/care/helpers"
                element={
                  <TitledRoute title="Community helpers — Memento">
                    <RequireAuth>
                      <CareHelpers />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route
                path="/care/profile"
                element={
                  <TitledRoute title="Patient profile — Memento">
                    <RequireAuth>
                      <CareProfile />
                    </RequireAuth>
                  </TitledRoute>
                }
              />
              <Route path="*" element={<TitledRoute title="Not found — Memento"><NotFound /></TitledRoute>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
        </LanguageProvider>
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
