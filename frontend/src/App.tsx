import { useEffect, useState } from "react";
import { AppIcon } from "./components/AppIcon";
import { AppSidebar } from "./components/AppSidebar";
import { StatusMessage } from "./components/StatusMessage";
import { authApi, AuthenticationApiError } from "./lib/authApi";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "./lib/authToken";
import { brandguardApi } from "./lib/brandguardApi";
import { BrandGuidelinesPage } from "./pages/BrandGuidelinesPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { ContentCheckerPage } from "./pages/ContentCheckerPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ReviewHistoryPage } from "./pages/ReviewHistoryPage";
import type { AuthenticatedUser, AuthSession } from "./types/auth";
import type {
  AppPage,
  BrandGuideline,
  CheckerReview,
} from "./types/brandGuideline";

const pageTitles: Record<AppPage, string> = {
  dashboard: "Dashboard",
  guidelines: "Brand Guidelines",
  checker: "Content Checker",
  history: "Review History",
};

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    getAuthToken(),
  );
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authNotice, setAuthNotice] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [activePage, setActivePage] = useState<AppPage>("dashboard");
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [reviews, setReviews] = useState<CheckerReview[]>([]);
  const [selectedGuidelineId, setSelectedGuidelineId] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let active = true;
    if (!accessToken) {
      setCurrentUser(null);
      setGuidelines([]);
      setReviews([]);
      setSelectedGuidelineId("");
      setSelectedReviewId("");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setStorageError("");
    authApi
      .me(accessToken)
      .then(async (user) => {
        if (!active) {
          return;
        }
        setCurrentUser(user);
        const [savedGuidelines, savedReviews] = await loadBackendDataOnce();
        if (!active) {
          return;
        }
        setGuidelines(savedGuidelines);
        setSelectedGuidelineId(savedGuidelines[0]?.id ?? "");
        setReviews(savedReviews);
      })
      .catch((error: unknown) => {
        if (active) {
          if (
            error instanceof AuthenticationApiError &&
            error.status === 401
          ) {
            clearAuthToken();
            setAccessToken(null);
            setAuthNotice("Your session expired. Please sign in again.");
            return;
          }
          setStorageError(
            error instanceof Error
              ? error.message
              : "Could not load saved brand profiles and review history from the backend.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    function handleUnauthorized() {
      clearAuthToken();
      setAccessToken(null);
      setCurrentUser(null);
      setGuidelines([]);
      setReviews([]);
      setSelectedGuidelineId("");
      setSelectedReviewId("");
      setAuthNotice("Your session expired. Please sign in again.");
    }
    window.addEventListener("brandguard:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("brandguard:unauthorized", handleUnauthorized);
  }, []);

  function handleLogin(session: AuthSession) {
    setAuthToken(session.access_token);
    setCurrentUser(session.user);
    setAuthNotice("");
    setAccessToken(session.access_token);
  }

  function handleLogout() {
    clearAuthToken();
    setAccessToken(null);
    setCurrentUser(null);
    setGuidelines([]);
    setReviews([]);
    setSelectedGuidelineId("");
    setSelectedReviewId("");
    setActivePage("dashboard");
    setAuthNotice("You signed out.");
  }

  if (!accessToken) {
    return authMode === "register" ? (
      <RegisterPage
        onLogin={() => {
          setAuthNotice("");
          setAuthMode("login");
        }}
        onRegistered={(email) => {
          setAuthNotice(`Account created for ${email}. Please sign in.`);
          setAuthMode("login");
        }}
      />
    ) : (
      <LoginPage
        notice={authNotice}
        onLogin={handleLogin}
        onRegister={() => {
          setAuthNotice("");
          setAuthMode("register");
        }}
      />
    );
  }

  async function saveGuideline(guideline: BrandGuideline): Promise<BrandGuideline> {
    const exists = guidelines.some(
      (savedGuideline) => savedGuideline.id === guideline.id,
    );
    const savedGuideline = exists
      ? await brandguardApi.updateBrand(guideline)
      : await brandguardApi.createBrand(guideline);

    setGuidelines((current) =>
      exists
        ? current.map((item) =>
            item.id === savedGuideline.id ? savedGuideline : item,
          )
        : [...current, savedGuideline],
    );
    setSelectedGuidelineId(savedGuideline.id);
    setStorageError("");
    return savedGuideline;
  }

  async function saveReview(review: CheckerReview): Promise<CheckerReview> {
    const exists = reviews.some(
      (savedReview) => savedReview.id === review.id,
    );
    const savedReview = exists
      ? await brandguardApi.updateReview(review)
      : await brandguardApi.createReview(review);

    setReviews((current) =>
      exists
        ? current.map((item) =>
            item.id === savedReview.id ? savedReview : item,
          )
        : [savedReview, ...current],
    );
    setStorageError("");
    return savedReview;
  }

  async function updateSuggestion(
    reviewId: string,
    issue: CheckerReview["issues"][number],
  ): Promise<CheckerReview> {
    const updatedReview = await brandguardApi.saveSuggestionDecision(
      reviewId,
      issue.id,
      issue,
    );
    setReviews((current) =>
      current.map((item) =>
        item.id === updatedReview.id ? updatedReview : item,
      ),
    );
    return updatedReview;
  }

  function renderPage() {
    if (activePage === "dashboard") {
      return (
        <DashboardPage
          guidelines={guidelines}
          reviews={reviews}
          onNavigate={setActivePage}
          onOpenReview={(reviewId) => {
            setSelectedReviewId(reviewId);
            setActivePage("checker");
          }}
          onSelectGuideline={setSelectedGuidelineId}
          selectedGuidelineId={selectedGuidelineId}
        />
      );
    }
    if (activePage === "guidelines") {
      return (
        <BrandGuidelinesPage
          guidelines={guidelines}
          onSave={saveGuideline}
          onSelectGuideline={setSelectedGuidelineId}
          selectedGuidelineId={selectedGuidelineId}
        />
      );
    }
    if (activePage === "checker") {
      return (
        <ContentCheckerPage
          guidelines={guidelines}
          onNavigate={setActivePage}
          onSaveReview={saveReview}
          onSaveSuggestion={updateSuggestion}
          onSelectGuideline={setSelectedGuidelineId}
          onSelectReview={setSelectedReviewId}
          reviews={reviews}
          selectedReviewId={selectedReviewId}
          selectedGuidelineId={selectedGuidelineId}
        />
      );
    }
    if (activePage === "history") {
      return (
        <ReviewHistoryPage
          reviews={reviews}
          onOpenReview={(reviewId) => {
            setSelectedReviewId(reviewId);
            setActivePage("checker");
          }}
        />
      );
    }
    return <ComingSoonPage page={activePage} />;
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900 lg:flex">
      <AppSidebar
        activePage={activePage}
        onLogout={handleLogout}
        onNavigate={setActivePage}
        userEmail={currentUser?.email ?? ""}
        userName={currentUser?.name ?? ""}
      />
      <main className="min-w-0 flex-1">
        <header className="flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur sm:px-8">
          <p className="text-sm font-semibold text-slate-700">
            {pageTitles[activePage]}
          </p>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
            <AppIcon name="shield" className="h-3.5 w-3.5 text-indigo-600" />
            <span>Human-led review</span>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
          {storageError && (
            <StatusMessage kind="error">{storageError}</StatusMessage>
          )}
          {loading ? (
            <div
              aria-label="Loading saved brand profiles"
              className="flex min-h-[50vh] items-center justify-center"
              role="status"
            >
              <span className="loading-spinner h-5 w-5 border-indigo-600" />
              <span className="ml-3 text-sm text-slate-500">
                Loading your workspace…
              </span>
            </div>
          ) : (
            renderPage()
          )}
        </div>
      </main>
    </div>
  );
}

async function loadBackendDataOnce(): Promise<
  [BrandGuideline[], CheckerReview[]]
> {
  const [backendGuidelines, backendReviews] = await Promise.all([
    brandguardApi.listBrands(),
    brandguardApi.listReviews(),
  ]);
  return [backendGuidelines, backendReviews];
}

export default App;
