import { useState } from "react";
import { Loader2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import FileUploadZone from "../FileUploadZone";

const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400";
const LABEL_CLASS = "block text-sm font-bold text-gray-700 dark:text-slate-300";

export interface AppStoreLandingPageData {
  type: "appstore";
  appName: string;
  description: string;
  companyName: string;
  ctaButtonText: string;
  appStoreUrl: string;
  googlePlayUrl: string;
  appIconUrl: string | null;
  screenshotUrl: string;
  name: string;
  styleData: string;
  logoData: string | null;
  thumbnailData: string | null;
}

interface AppStoreTabProps {
  onSave: (data: AppStoreLandingPageData) => Promise<void>;
  isSaving: boolean;
  userTier: "free" | "starter" | "pro" | null;
  isSignedIn: boolean;
}

export default function AppStoreTab({ onSave, isSaving, userTier, isSignedIn }: AppStoreTabProps) {
  const [appName, setAppName] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ctaButtonText, setCtaButtonText] = useState("");
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [googlePlayUrl, setGooglePlayUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");

  const [appIconFile, setAppIconFile] = useState<File | null>(null);
  const [appIconError, setAppIconError] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const [appNameError, setAppNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const maxSizeMB = userTier === "pro" ? 25 : 10;

  const handleAppIconSelect = (file: File | null) => {
    setAppIconError(null);
    if (file === null && appIconFile !== null) {
      const prevFile = appIconFile;
      setAppIconFile(null);
      if (prevFile && prevFile.size > maxSizeMB * 1024 * 1024) {
        setAppIconError(
          userTier === "pro"
            ? "File exceeds the 25 MB limit."
            : "File exceeds the 10 MB limit for the Free plan. Upgrade to Pro for 25 MB uploads."
        );
      }
      return;
    }
    if (!file) return;
    // Validate image type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAppIconError("Only image files (JPEG, PNG, WebP) are accepted here.");
      return;
    }
    setAppIconFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    let hasError = false;
    if (!appName.trim()) {
      setAppNameError("App name is required.");
      hasError = true;
    } else {
      setAppNameError(null);
    }
    if (!description.trim()) {
      setDescriptionError("Description is required.");
      hasError = true;
    } else {
      setDescriptionError(null);
    }
    if (hasError) return;

    // Upload app icon if provided
    let appIconUrl: string | null = null;

    if (appIconFile) {
      setIsUploadingIcon(true);
      try {
        const blob = await upload(appIconFile.name, appIconFile, {
          access: "public",
          handleUploadUrl: "/api/landing/upload",
        });
        appIconUrl = blob.url;
      } catch {
        setAppIconError("Upload failed. Check your connection and try again.");
        setIsUploadingIcon(false);
        return;
      }
      setIsUploadingIcon(false);
    }

    // Check if upload error occurred during upload
    if (appIconError) return;

    const saveName = appName.trim().slice(0, 60) || "App Store QR";

    await onSave({
      type: "appstore",
      appName: appName.trim(),
      description: description.trim(),
      companyName: companyName.trim(),
      ctaButtonText: ctaButtonText.trim(),
      appStoreUrl: appStoreUrl.trim(),
      googlePlayUrl: googlePlayUrl.trim(),
      appIconUrl,
      screenshotUrl: screenshotUrl.trim(),
      name: saveName,
      styleData: "",
      logoData: null,
      thumbnailData: null,
    });
  };

  if (!isSignedIn) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Sign in to create an App Store landing page QR code.
        </p>
        <a
          href="/sign-in"
          className="inline-block px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* App Name */}
      <div className="space-y-2">
        <label htmlFor="appstore-name" className={LABEL_CLASS}>
          App Name <span className="text-red-500">*</span>
        </label>
        <input
          id="appstore-name"
          type="text"
          value={appName}
          onChange={(e) => { setAppName(e.target.value); setAppNameError(null); }}
          placeholder="My Awesome App"
          required
          className={INPUT_CLASS}
          aria-describedby={appNameError ? "appstore-name-error" : undefined}
        />
        {appNameError && (
          <p id="appstore-name-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
            {appNameError}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="appstore-description" className={LABEL_CLASS}>
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="appstore-description"
          rows={3}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setDescriptionError(null); }}
          placeholder="A brief description of your app."
          required
          className={INPUT_CLASS}
          aria-describedby={descriptionError ? "appstore-description-error" : undefined}
        />
        {descriptionError && (
          <p id="appstore-description-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
            {descriptionError}
          </p>
        )}
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <label htmlFor="appstore-company" className={LABEL_CLASS}>
          Company Name
        </label>
        <input
          id="appstore-company"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Corp"
          className={INPUT_CLASS}
        />
      </div>

      {/* CTA Button Text */}
      <div className="space-y-2">
        <label htmlFor="appstore-cta" className={LABEL_CLASS}>
          CTA Button Text
        </label>
        <input
          id="appstore-cta"
          type="text"
          value={ctaButtonText}
          onChange={(e) => setCtaButtonText(e.target.value)}
          placeholder="Get the App"
          className={INPUT_CLASS}
        />
      </div>

      {/* iOS App Store URL */}
      <div className="space-y-2">
        <label htmlFor="appstore-ios" className={LABEL_CLASS}>
          iOS App Store URL
        </label>
        <input
          id="appstore-ios"
          type="url"
          value={appStoreUrl}
          onChange={(e) => setAppStoreUrl(e.target.value)}
          placeholder="https://apps.apple.com/app/my-app/id123456789"
          className={INPUT_CLASS}
        />
      </div>

      {/* Google Play URL */}
      <div className="space-y-2">
        <label htmlFor="appstore-google" className={LABEL_CLASS}>
          Google Play URL
        </label>
        <input
          id="appstore-google"
          type="url"
          value={googlePlayUrl}
          onChange={(e) => setGooglePlayUrl(e.target.value)}
          placeholder="https://play.google.com/store/apps/details?id=com.example.app"
          className={INPUT_CLASS}
        />
      </div>

      {/* App Icon Upload */}
      <div className="space-y-2">
        <label className={LABEL_CLASS}>App Icon</label>
        <FileUploadZone
          label="Drop app icon here or click to browse"
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={maxSizeMB}
          file={appIconFile}
          onFileSelect={handleAppIconSelect}
          errorMessage={appIconError}
          helperText="Max 10 MB (Free plan) · 25 MB (Pro plan)"
          isUploading={isUploadingIcon}
        />
      </div>

      {/* Screenshot/Trailer URL */}
      <div className="space-y-2">
        <label htmlFor="appstore-screenshot" className={LABEL_CLASS}>
          Screenshot/Trailer URL
        </label>
        <input
          id="appstore-screenshot"
          type="url"
          value={screenshotUrl}
          onChange={(e) => setScreenshotUrl(e.target.value)}
          placeholder="https://example.com/screenshot.png"
          className={INPUT_CLASS}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSaving || isUploadingIcon}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold
                   text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Create App Store Page"
        )}
      </button>
    </form>
  );
}
