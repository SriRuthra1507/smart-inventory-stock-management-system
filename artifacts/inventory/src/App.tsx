import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  useAuth,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import ProductForm from "@/pages/product-form";
import {
  LandingPage,
  LoadingPage,
  SignInPage,
  SignUpPage,
} from "@/pages/auth-pages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 mins
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY.");
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#6366f1",
    colorForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#fb7185",
    colorBackground: "#101827",
    colorInput: "#151f32",
    colorInputForeground: "#f8fafc",
    colorNeutral: "#334155",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[#101827] rounded-2xl w-[440px] max-w-full overflow-hidden border border-slate-700/80 shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-50 text-xl font-semibold",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-slate-200",
    formFieldLabel: "text-slate-200",
    footerActionLink: "text-indigo-300 hover:text-indigo-200",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-indigo-300",
    formFieldSuccessText: "text-emerald-300",
    alertText: "text-rose-200",
    logoBox: "mb-2",
    logoImage: "max-h-10",
    socialButtonsBlockButton:
      "border border-slate-700 bg-slate-800/70 hover:bg-slate-700",
    formButtonPrimary:
      "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-950/40",
    formFieldInput:
      "bg-slate-900/80 text-slate-50 border-slate-700 focus:border-indigo-400",
    footerAction: "border-t border-slate-700/70",
    dividerLine: "bg-slate-700",
    alert: "border border-rose-500/30 bg-rose-500/10",
    otpCodeFieldInput: "bg-slate-900 text-slate-50 border-slate-700",
    formFieldRow: "gap-1.5",
    main: "gap-5",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        previousUserId.current !== undefined &&
        previousUserId.current !== userId
      ) {
        queryClient.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <LoadingPage />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function ProtectedInventoryRoutes() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <LoadingPage />;
  if (!isSignedIn) return <Redirect to="/login" />;

  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/inventory/new" component={ProductForm} />
        <Route path="/inventory/:id/edit" component={ProductForm} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Sign in to your account",
            subtitle: "Welcome back to Smart Inventory",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Get started with Smart Inventory",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/login">
          <Redirect to="/sign-in" />
        </Route>
        <Route path="/register">
          <Redirect to="/sign-up" />
        </Route>
        <Route path="/" component={HomeRoute} />
        <Route component={ProtectedInventoryRoutes} />
      </Switch>
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkRoutes />
        </WouterRouter>
        <Toaster theme="dark" position="bottom-right" className="!bg-card !border-border !text-foreground" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
