import QRCodeStyling from "qr-code-styling";
import type { DotType, CornerSquareType, CornerDotType } from "qr-code-styling";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { $userStore, $isLoadedStore } from "@clerk/astro/client";
import { Toaster, toast } from "sonner";
import { Lock } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import {
  encodeWifi,
  encodeVCard,
  isContentEmpty,
  isWifiEmpty,
  isVCardEmpty,
  type WifiState,
  type VCardState,
} from "../lib/qrEncoding";
import QRPreview from "./QRPreview";
import { ExportButtons } from "./ExportButtons";
import UrlTab from "./tabs/UrlTab";
import TextTab from "./tabs/TextTab";
import WifiTab from "./tabs/WifiTab";
import VCardTab from "./tabs/VCardTab";
import PdfTab, { type PdfLandingPageData } from "./tabs/PdfTab";
import AppStoreTab, { type AppStoreLandingPageData } from "./tabs/AppStoreTab";
import { ColorSection, type ColorSectionState } from "./customize/ColorSection";
import { ShapeSection, type ShapeSectionState } from "./customize/ShapeSection";
import { LogoSection, type LogoSectionState } from "./customize/LogoSection";
import { FrameSection } from "./customize/FrameSection";
import { TemplateSection } from "./customize/TemplateSection";
import type { TemplatePreset, FrameSectionState } from "../types/frames";
import { SaveQRModal } from "./SaveQRModal";

type TabId = "url" | "text" | "wifi" | "vcard" | "pdf" | "appstore";
type UserTier = "free" | "starter" | "pro" | null;

const TABS: { id: TabId; label: string }[] = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "wifi", label: "WiFi" },
  { id: "vcard", label: "vCard" },
  { id: "pdf", label: "PDF" },
  { id: "appstore", label: "App Store" },
];

// QRCodeStyling instance is created once and reused — official React pattern
const qrInitialOptions = {
  width: 256,
  height: 256,
  type: "svg" as const,
  data: "",
  dotsOptions: { type: "rounded" as const, color: "#1e293b" },
  cornersSquareOptions: { type: "extra-rounded" as const },
  backgroundOptions: { color: "#ffffff" },
};

const REDIRECT_BASE = "https://qr-code-generator-app.com/r/";

export default function QRGeneratorIsland() {
  // QRCodeStyling instance — created client-side only (useEffect) to avoid SSR window access
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Auth state — use @clerk/astro/client nanostores (compatible with Astro's Clerk integration)
  const [isLoaded, setIsLoaded] = useState(() => $isLoadedStore.get());
  const [isSignedIn, setIsSignedIn] = useState(() => !!$userStore.get());
  const [userTier, setUserTier] = useState<UserTier>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [landingSaving, setLandingSaving] = useState(false);
  const [landingDynamicSlug, setLandingDynamicSlug] = useState<string | null>(null);

  // Subscribe to Clerk nanostores to keep isLoaded / isSignedIn in sync
  useEffect(() => {
    const unsubLoaded = $isLoadedStore.subscribe((loaded) => setIsLoaded(loaded));
    const unsubUser = $userStore.subscribe((user) => setIsSignedIn(!!user));
    return () => { unsubLoaded(); unsubUser(); };
  }, []);

  // Edit-mode state
  const [editName, setEditName] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>("url");

  // Per-tab state slices — each tab preserves its values when switching (CONT-05)
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [wifiValue, setWifiValue] = useState<WifiState>({
    ssid: "",
    password: "",
    security: "WPA",
  });
  const [vcardValue, setVcardValue] = useState<VCardState>({
    name: "",
    phone: "",
    email: "",
    org: "",
  });

  // Dynamic QR state
  const [isDynamic, setIsDynamic] = useState(false);
  const [dynamicCount, setDynamicCount] = useState<number | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  // Customization state — defaults match Phase 2 initial options (no visual change on launch)
  const [colorOptions, setColorOptions] = useState<ColorSectionState>({
    dotColor: "#1e293b",
    bgColor: "#ffffff",
    gradientEnabled: false,
    gradientType: "linear",
    gradientStop1: "#1e293b",
    gradientStop2: "#4f46e5",
  });

  const [shapeOptions, setShapeOptions] = useState<ShapeSectionState>({
    dotType: "rounded",
    cornerSquareType: "extra-rounded",
    cornerDotType: "square",
  });

  const [logoOptions, setLogoOptions] = useState<LogoSectionState>({
    logoSrc: null,
    logoFilename: null,
  });

  const [frameOptions, setFrameOptions] = useState<FrameSectionState>({
    frameType: "none",
    frameText: "",
  });

  // Track which template preset is selected (null = no template active)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Derived: is the user at the dynamic QR limit?
  // dynamicLocked = true only for signed-in non-pro users at/over the 3-QR limit
  const dynamicLocked = userTier !== "pro" && userTier !== null && isSignedIn && (dynamicCount ?? 0) >= 3;

  // Fetch dynamic QR count once user auth resolves (for limit gate)
  useEffect(() => {
    if (!isLoaded || !isSignedIn || userTier === "pro") return;
    fetch("/api/qr/list")
      .then((r) => r.json())
      .then((data: Array<{ isDynamic?: boolean }>) => {
        const items = Array.isArray(data) ? data : [];
        const count = items.filter((item) => item.isDynamic === true).length;
        setDynamicCount(count);
      })
      .catch(() => {
        // Fail open — don't lock the toggle if we can't fetch count
        setDynamicCount(0);
      });
  }, [isLoaded, isSignedIn, userTier]);

  // Toggle handler — intercepts if locked or not signed in
  const handleToggleDynamic = useCallback((enabled: boolean) => {
    if (!isSignedIn) {
      toast.error("Sign in to create dynamic QR codes");
      return;
    }
    if (dynamicLocked) {
      toast.error("Upgrade to Pro for unlimited dynamic QR codes", {
        action: { label: "Upgrade to Pro", onClick: () => { window.location.href = "/pricing"; } },
      });
      return;
    }
    setIsDynamic(enabled);
  }, [isSignedIn, dynamicLocked]);

  // Derive the raw QR data string from active tab state
  const rawContent = useMemo(() => {
    switch (activeTab) {
      case "url":      return urlValue;
      case "text":     return textValue;
      case "wifi":     return encodeWifi(wifiValue);
      case "vcard":    return encodeVCard(vcardValue);
      case "pdf":
      case "appstore": return landingDynamicSlug
        ? `${REDIRECT_BASE}${landingDynamicSlug}`
        : `${REDIRECT_BASE}--------`;
    }
  }, [activeTab, urlValue, textValue, wifiValue, vcardValue, landingDynamicSlug]);

  // Debounce for 300ms — PREV-01
  const debouncedContent = useDebounce(rawContent, 300);

  // Debounced customization options
  const debouncedColor = useDebounce(colorOptions, 300);
  const debouncedShape = useDebounce(shapeOptions, 300);
  const debouncedLogo = useDebounce(logoOptions, 300);

  // The actual data to encode in the QR code.
  // When dynamic + URL tab: encode the redirect URL (using savedSlug if available, else placeholder dashes)
  const qrData = useMemo(() => {
    if (isDynamic && activeTab === "url") {
      return `${REDIRECT_BASE}${savedSlug || "--------"}`;
    }
    return debouncedContent;
  }, [isDynamic, activeTab, savedSlug, debouncedContent]);

  // isPulsing: true during the debounce window (rawContent updated, debouncedContent not yet)
  const isPulsing = rawContent !== debouncedContent;

  // isEmpty drives ghost placeholder — PREV-03
  // URL/text: use debouncedContent (string is empty iff field is empty — safe to debounce).
  // WiFi/vCard: use raw field state — encoders always produce non-empty strings even when fields
  // are blank, so debouncedContent cannot be used; raw check gives immediate placeholder on tab switch.
  const isEmpty = useMemo(() => {
    switch (activeTab) {
      case "url":      return isContentEmpty(debouncedContent);
      case "text":     return isContentEmpty(debouncedContent);
      case "wifi":     return isWifiEmpty(wifiValue);
      case "vcard":    return isVCardEmpty(vcardValue);
      case "pdf":
      case "appstore": return landingDynamicSlug === null; // empty until landing page is created
    }
  }, [activeTab, debouncedContent, wifiValue, vcardValue, landingDynamicSlug]);

  // Edit-mode: detect ?edit= URL param (client-side only)
  const editId = useMemo(
    () => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("edit") : null,
    []
  );

  // Tier fetch — runs when Clerk finishes loading
  // CRITICAL: defaults to null (unlocked) while loading — no flash of locked state for anonymous users
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUserTier(null);
      return;
    }
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((d) => setUserTier(d.tier as UserTier))
      .catch(() => setUserTier("free"));
  }, [isLoaded, isSignedIn]);

  // Edit-mode fetch: load saved QR and hydrate all state slices
  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    fetch(`/api/qr/${editId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        // Hydrate name for banner
        setEditName(data.name ?? "Untitled");

        // Hydrate tab
        if (data.contentType && ["url", "text", "wifi", "vcard", "pdf", "appstore"].includes(data.contentType)) {
          setActiveTab(data.contentType as TabId);
        }

        // Hydrate content
        const content = data.contentData ?? {};
        if (data.contentType === "url") setUrlValue(content.url ?? "");
        if (data.contentType === "text") setTextValue(content.text ?? "");
        if (data.contentType === "wifi") setWifiValue(content as WifiState);
        if (data.contentType === "vcard") setVcardValue(content as VCardState);

        // Edit-mode: restore isDynamic toggle state and slug from dynamic metadata
        if (data.isDynamic === true) {
          setIsDynamic(true);
          if (data.slug) {
            setSavedSlug(data.slug);
          }
        }

        // Hydrate style
        if (data.styleData) {
          const s = data.styleData;
          setColorOptions((prev) => ({
            ...prev,
            dotColor: s.dotColor ?? prev.dotColor,
            bgColor: s.bgColor ?? prev.bgColor,
            gradientEnabled: s.gradientEnabled ?? prev.gradientEnabled,
            gradientType: s.gradientType ?? prev.gradientType,
            gradientStop1: s.gradientStop1 ?? prev.gradientStop1,
            gradientStop2: s.gradientStop2 ?? prev.gradientStop2,
          }));
          setShapeOptions((prev) => ({
            ...prev,
            dotType: (s.dotType as DotType) ?? prev.dotType,
            cornerSquareType: (s.cornerSquareType as CornerSquareType) ?? prev.cornerSquareType,
            cornerDotType: (s.cornerDotType as CornerDotType) ?? prev.cornerDotType,
          }));
        }

        // Hydrate logo
        if (data.logoData) {
          setLogoOptions({ logoSrc: data.logoData, logoFilename: "logo" });
        }
      })
      .catch(() => toast.error("Could not load QR for editing"))
      .finally(() => setEditLoading(false));
  }, [editId]);

  // Derive default save name from current content
  const defaultSaveName = useMemo(() => {
    switch (activeTab) {
      case "url":      return urlValue.replace(/^https?:\/\//, "").split("/")[0].slice(0, 60) || "My QR";
      case "text":     return textValue.split("\n")[0].slice(0, 60) || "My QR";
      case "wifi":     return wifiValue.ssid.slice(0, 60) || "WiFi QR";
      case "vcard":    return vcardValue.name.slice(0, 60) || "Contact QR";
      case "pdf":      return "PDF QR";
      case "appstore": return "App Store QR";
    }
  }, [activeTab, urlValue, textValue, wifiValue, vcardValue]);

  // Generate a thumbnail (base64 data URL PNG) from the QR instance
  async function generateThumbnail(): Promise<string | null> {
    try {
      const blob = await qrCodeRef.current?.getRawData("png");
      if (!blob) return null;
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string ?? null);
        reader.onerror = () => reject(null);
        reader.readAsDataURL(blob as Blob);
      });
    } catch {
      return null;
    }
  }

  // Save handler — POST /api/qr/save
  const handleSave = useCallback(async (name: string) => {
    setIsSaving(true);
    try {
      const thumbnailData = await generateThumbnail();

      // Build contentData from active tab.
      // For dynamic QRs, include isDynamic:true and slug (after save, slug is stored in contentData
      // so edit-mode can restore it). On first save, slug is not yet known — it will be set after response.
      let contentData: Record<string, unknown>;
      switch (activeTab) {
        case "url":      contentData = { url: urlValue }; break;
        case "text":     contentData = { text: textValue }; break;
        case "wifi":     contentData = { ...wifiValue }; break;
        case "vcard":    contentData = { ...vcardValue }; break;
        case "pdf":
        case "appstore": contentData = {}; break; // landing pages managed via /api/landing/create
      }

      const body: Record<string, unknown> = {
        name,
        contentType: activeTab,
        contentData,
        styleData: { ...colorOptions, ...shapeOptions },
        logoData: logoOptions.logoSrc ?? null,
        thumbnailData,
      };

      // Add dynamic fields when toggle is on and we're on URL tab
      if (isDynamic && activeTab === "url") {
        body.isDynamic = true;
        body.destinationUrl = urlValue;
      }

      const res = await fetch("/api/qr/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error === "dynamic_limit_reached") {
          toast.error("Upgrade to Pro for unlimited dynamic QR codes", {
            action: { label: "Upgrade to Pro", onClick: () => { window.location.href = "/pricing"; } },
          });
          return;
        }
        throw new Error("Save failed");
      }

      const responseData = await res.json();
      setShowSaveModal(false);

      // Handle dynamic QR slug from response
      if (isDynamic && responseData.slug) {
        setSavedSlug(responseData.slug);
        // Increment count so limit gate updates without refetch
        setDynamicCount((prev) => (prev ?? 0) + 1);
      }

      toast("Saved to library", {
        action: { label: "Go to Library", onClick: () => { window.location.href = "/dashboard"; } },
      });
    } catch {
      toast.error("Failed to save — please try again");
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, urlValue, textValue, wifiValue, vcardValue, colorOptions, shapeOptions, logoOptions, isDynamic]);

  // Edit save handler — PUT /api/qr/[id]
  const handleEditSave = useCallback(async () => {
    if (!editId) return;
    setIsSaving(true);
    try {
      const thumbnailData = await generateThumbnail();

      let contentData: Record<string, unknown>;
      switch (activeTab) {
        case "url":      contentData = { url: urlValue }; break;
        case "text":     contentData = { text: textValue }; break;
        case "wifi":     contentData = { ...wifiValue }; break;
        case "vcard":    contentData = { ...vcardValue }; break;
        case "pdf":
        case "appstore": contentData = {}; break; // landing pages managed via /api/landing routes
      }

      const res = await fetch(`/api/qr/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          contentType: activeTab,
          contentData,
          styleData: { ...colorOptions, ...shapeOptions },
          logoData: logoOptions.logoSrc ?? null,
          thumbnailData,
        }),
      });

      if (!res.ok) throw new Error("Update failed");
      toast("Changes saved");
      // Navigate back to dashboard after brief delay
      setTimeout(() => { window.location.href = "/dashboard"; }, 1000);
    } catch {
      toast.error("Failed to save changes — please try again");
    } finally {
      setIsSaving(false);
    }
  }, [editId, editName, activeTab, urlValue, textValue, wifiValue, vcardValue, colorOptions, shapeOptions, logoOptions]);

  // Landing page save handler — POST /api/landing/create
  const handleLandingPageSave = useCallback(async (tabData: PdfLandingPageData | AppStoreLandingPageData) => {
    setLandingSaving(true);
    try {
      const thumbnailData = await generateThumbnail();

      const body = {
        ...tabData,
        styleData: JSON.stringify({ ...colorOptions, ...shapeOptions }),
        logoData: logoOptions.logoSrc ?? null,
        thumbnailData,
      };

      const res = await fetch("/api/landing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 403) {
        toast.error("You've reached your QR code limit. Upgrade your plan to create more.", {
          action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
        });
        return;
      }

      if (!res.ok) {
        toast.error("Could not save your landing page. Please try again.");
        return;
      }

      const responseData = await res.json();
      const dynamicSlug: string = responseData.dynamicSlug;

      // Set landing slug so QR encodes the /r/ redirect URL
      setLandingDynamicSlug(dynamicSlug);

      toast("Landing page created", {
        action: { label: "Go to Library", onClick: () => { window.location.href = "/dashboard"; } },
      });
    } catch {
      toast.error("Could not save your landing page. Please try again.");
    } finally {
      setLandingSaving(false);
    }
  }, [colorOptions, shapeOptions, logoOptions]);

  // Mount effect — create QR instance client-side only and append to preview div
  // useEffect never runs during SSR, so qr-code-styling's window access is safe
  useEffect(() => {
    const qr = new QRCodeStyling(qrInitialOptions);
    qrCodeRef.current = qr;
    if (previewRef.current && previewRef.current.childNodes.length === 0) {
      qr.append(previewRef.current);
    }
  }, []); // empty deps — run once on mount

  // Update effect — single merged effect for content + all customization options
  useEffect(() => {
    if (!qrCodeRef.current || isEmpty) return; // don't update QR when empty — let placeholder show
    try {
      const { dotColor, bgColor, gradientEnabled, gradientType, gradientStop1, gradientStop2 } = debouncedColor;
      const { dotType, cornerSquareType, cornerDotType } = debouncedShape;
      const { logoSrc } = debouncedLogo;

      const dotsOptions = gradientEnabled
        ? {
            type: dotType,
            gradient: {
              type: gradientType,
              rotation: Math.PI / 4,
              colorStops: [
                { offset: 0, color: gradientStop1 },
                { offset: 1, color: gradientStop2 },
              ],
            },
          }
        : { type: dotType, color: dotColor };

      qrCodeRef.current.update({
        data: qrData,
        dotsOptions,
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: cornerSquareType },
        cornersDotOptions: { type: cornerDotType },
        ...(logoSrc ? { image: logoSrc } : {}),
        imageOptions: { imageSize: 0.3, hideBackgroundDots: true, margin: 4 },
        qrOptions: { errorCorrectionLevel: logoSrc ? "H" : "Q" },
      });
    } catch {
      // Content too long or encoding error — handled silently
    }
  }, [qrData, debouncedColor, debouncedShape, debouncedLogo, isEmpty]);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  const handleApplyTemplate = useCallback((preset: TemplatePreset) => {
    // Apply frame
    setFrameOptions({ frameType: preset.frameType, frameText: preset.frameText });

    // Apply color — update dotColor and bgColor (leave gradient settings unchanged)
    setColorOptions((prev) => ({
      ...prev,
      dotColor: preset.dotColor,
      bgColor: preset.bgColor,
      gradientEnabled: false, // templates always use solid color (clean apply)
    }));

    // Apply shape
    setShapeOptions((prev) => ({
      ...prev,
      dotType: preset.dotType,
      cornerSquareType: preset.cornerSquareType,
      // cornerDotType unchanged — templates don't specify pupil style
    }));

    setSelectedTemplateId(preset.id);
  }, []);

  // Determine save button rendering
  // - anonymous (userTier === null): hide button
  // - signed-in non-Pro: greyed button with lock (for static saves)
  //   BUT signed-in non-Pro CAN save dynamic QRs (if not at limit)
  // - Pro: active save button
  const isPro = userTier === "pro";
  const isNonProSignedIn = isLoaded && isSignedIn && userTier !== null && userTier !== "pro";

  // Non-Pro users can save if they're saving a dynamic QR and haven't hit the limit
  const canSaveDynamic = isDynamic && activeTab === "url" && isSignedIn && !dynamicLocked;
  const showSaveButton = isPro || canSaveDynamic;
  const showLockedSaveButton = isNonProSignedIn && !editId && !canSaveDynamic;

  // Save button label
  const saveButtonLabel = isDynamic && activeTab === "url" ? "Save Dynamic QR" : "Save to Library";

  return (
    <div className="w-full">
      <Toaster theme="system" position="bottom-right" />

      {/* Edit-mode banner */}
      {editId && (
        <div className="w-full mb-6 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {editLoading ? (
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Loading QR…</span>
            ) : (
              <>
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200 shrink-0">Editing:</span>
                <input
                  type="text"
                  value={editName ?? ""}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 min-w-0 text-sm px-2 py-1 rounded border border-amber-300 dark:border-amber-600
                             bg-white dark:bg-amber-900/50 text-amber-900 dark:text-amber-100
                             focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEditSave}
              disabled={isSaving || editLoading}
              className="px-4 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700
                         rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              className="px-4 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200
                         bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800
                         rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Form panel — 60% on desktop */}
        <div className="w-full lg:w-3/5">

          {/* Tab bar */}
          <div
            role="tablist"
            aria-label="Content type"
            className="flex border-b border-gray-200 mb-6 dark:border-slate-700"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                data-tab={tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-gray-200 dark:hover:border-slate-500"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab panels — ALL four always in DOM, hidden class toggled (CONT-05) */}
          <div
            id="panel-url"
            role="tabpanel"
            data-tab-panel="url"
            aria-labelledby="tab-url"
            className={activeTab === "url" ? "" : "hidden"}
          >
            <UrlTab
              value={urlValue}
              onChange={setUrlValue}
              isDynamic={isDynamic}
              onToggleDynamic={handleToggleDynamic}
              dynamicLocked={dynamicLocked}
              isUrlTab={activeTab === "url"}
              showDynamicToggle={isSignedIn}
            />
          </div>

          <div
            id="panel-text"
            role="tabpanel"
            data-tab-panel="text"
            aria-labelledby="tab-text"
            className={activeTab === "text" ? "" : "hidden"}
          >
            <TextTab value={textValue} onChange={setTextValue} />
          </div>

          <div
            id="panel-wifi"
            role="tabpanel"
            data-tab-panel="wifi"
            aria-labelledby="tab-wifi"
            className={activeTab === "wifi" ? "" : "hidden"}
          >
            <WifiTab value={wifiValue} onChange={setWifiValue} />
          </div>

          <div
            id="panel-vcard"
            role="tabpanel"
            data-tab-panel="vcard"
            aria-labelledby="tab-vcard"
            className={activeTab === "vcard" ? "" : "hidden"}
          >
            <VCardTab value={vcardValue} onChange={setVcardValue} />
          </div>

          <div
            id="panel-pdf"
            role="tabpanel"
            data-tab-panel="pdf"
            aria-labelledby="tab-pdf"
            className={activeTab === "pdf" ? "" : "hidden"}
          >
            <PdfTab
              onSave={handleLandingPageSave}
              isSaving={landingSaving}
              userTier={userTier}
              isSignedIn={isSignedIn}
            />
          </div>

          <div
            id="panel-appstore"
            role="tabpanel"
            data-tab-panel="appstore"
            aria-labelledby="tab-appstore"
            className={activeTab === "appstore" ? "" : "hidden"}
          >
            <AppStoreTab
              onSave={handleLandingPageSave}
              isSaving={landingSaving}
              userTier={userTier}
              isSignedIn={isSignedIn}
            />
          </div>

          {/* Customization section — CUST-01 through CUST-07, LOGO-01 through LOGO-04 */}
          <div className="mt-8 border-t border-gray-200 pt-6 space-y-6 dark:border-slate-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Customize</h2>
            {/* Template picker at the TOP per D-07 */}
            <TemplateSection
              selectedId={selectedTemplateId}
              onApply={handleApplyTemplate}
            />
            {/* Frame picker */}
            <FrameSection
              value={frameOptions}
              onChange={(next) => {
                setFrameOptions(next);
                setSelectedTemplateId(null); // deselect template when manually changing frame
              }}
            />
            <ColorSection
              value={colorOptions}
              onChange={(next) => {
                setColorOptions(next);
                setSelectedTemplateId(null); // deselect template when manually changing colors
              }}
            />
            <ShapeSection value={shapeOptions} onChange={setShapeOptions} userTier={userTier} />
            <LogoSection value={logoOptions} onChange={setLogoOptions} userTier={userTier} />
          </div>
        </div>

        {/* Preview panel — 40% on desktop, sticky */}
        <div className="w-full lg:w-2/5 lg:sticky lg:top-8 flex flex-col items-center lg:items-start gap-4">
          <QRPreview
            ref={previewRef}
            isEmpty={isEmpty}
            isPulsing={isPulsing}
          />
          <ExportButtons
            qrCodeRef={qrCodeRef}
            isEmpty={isEmpty}
            colorOptions={debouncedColor}
            shapeOptions={debouncedShape}
            logoOptions={debouncedLogo}
            debouncedContent={debouncedContent}
            frameOptions={frameOptions}
          />

          {/* Save to Library button — locked state for non-Pro users without dynamic toggle */}
          {showLockedSaveButton && (
            <button
              data-testid="save-to-library-locked"
              onClick={() => toast("Upgrade to Pro to save QR codes to your library", {
                action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
              })}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                         text-gray-400 bg-gray-100 dark:bg-slate-700 dark:text-slate-500
                         border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer
                         transition-colors"
              aria-label="Save to Library — Pro feature, upgrade to unlock"
            >
              <Lock size={14} />
              Save to Library
            </button>
          )}

          {showSaveButton && !editId && (
            <button
              data-testid="save-to-library"
              onClick={() => setShowSaveModal(true)}
              disabled={isEmpty}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                         text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveButtonLabel}
            </button>
          )}
        </div>

      </div>

      {/* Save modal */}
      <SaveQRModal
        isOpen={showSaveModal}
        defaultName={defaultSaveName}
        onSave={handleSave}
        onClose={() => setShowSaveModal(false)}
        isSaving={isSaving}
        isDynamic={isDynamic && activeTab === "url"}
      />
    </div>
  );
}
