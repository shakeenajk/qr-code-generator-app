import QRCodeStyling from "qr-code-styling";
import type { DotType, CornerSquareType, CornerDotType } from "qr-code-styling";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useDebounce } from "../hooks/useDebounce";
import {
  encodeWifi,
  encodeVCard,
  isContentEmpty,
  type WifiState,
  type VCardState,
} from "../lib/qrEncoding";
import QRPreview from "./QRPreview";
import UrlTab from "./tabs/UrlTab";
import TextTab from "./tabs/TextTab";
import WifiTab from "./tabs/WifiTab";
import VCardTab from "./tabs/VCardTab";
import { ColorSection, type ColorSectionState } from "./customize/ColorSection";
import { ShapeSection, type ShapeSectionState } from "./customize/ShapeSection";
import { LogoSection, type LogoSectionState } from "./customize/LogoSection";

type TabId = "url" | "text" | "wifi" | "vcard";

const TABS: { id: TabId; label: string }[] = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "wifi", label: "WiFi" },
  { id: "vcard", label: "vCard" },
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

export default function QRGeneratorIsland() {
  // QRCodeStyling instance — created client-side only (useEffect) to avoid SSR window access
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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

  // Derive the raw QR data string from active tab state
  const rawContent = useMemo(() => {
    switch (activeTab) {
      case "url":   return urlValue;
      case "text":  return textValue;
      case "wifi":  return encodeWifi(wifiValue);
      case "vcard": return encodeVCard(vcardValue);
    }
  }, [activeTab, urlValue, textValue, wifiValue, vcardValue]);

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

  // Debounce for 300ms — PREV-01
  const debouncedContent = useDebounce(rawContent, 300);

  // Debounced customization options
  const debouncedColor = useDebounce(colorOptions, 300);
  const debouncedShape = useDebounce(shapeOptions, 300);
  const debouncedLogo = useDebounce(logoOptions, 300);

  // isPulsing: true during the debounce window (rawContent updated, debouncedContent not yet)
  const isPulsing = rawContent !== debouncedContent;

  // isEmpty drives ghost placeholder — PREV-03
  // Use debouncedContent for isEmpty so placeholder doesn't flicker during debounce
  const isEmpty = isContentEmpty(debouncedContent);

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
        data: debouncedContent,
        dotsOptions,
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: cornerSquareType },
        cornersDotOptions: { type: cornerDotType },
        ...(logoSrc ? { image: logoSrc } : {}),
        imageOptions: { imageSize: 0.25, hideBackgroundDots: true, margin: 4 },
        qrOptions: { errorCorrectionLevel: logoSrc ? "H" : "Q" },
      });
    } catch {
      // Content too long or encoding error — handled silently
    }
  }, [debouncedContent, debouncedColor, debouncedShape, debouncedLogo, isEmpty]);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Form panel — 60% on desktop */}
        <div className="w-full lg:w-3/5">

          {/* Tab bar */}
          <div
            role="tablist"
            aria-label="Content type"
            className="flex border-b border-gray-200 mb-6"
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
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
            <UrlTab value={urlValue} onChange={setUrlValue} />
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

          {/* Customization section — CUST-01 through CUST-07, LOGO-01 through LOGO-04 */}
          <div className="mt-8 border-t border-gray-200 pt-6 space-y-6">
            <h2 className="text-base font-semibold text-gray-900">Customize</h2>
            <ColorSection value={colorOptions} onChange={setColorOptions} />
            <ShapeSection value={shapeOptions} onChange={setShapeOptions} />
            <LogoSection value={logoOptions} onChange={setLogoOptions} />
          </div>
        </div>

        {/* Preview panel — 40% on desktop, sticky */}
        <div className="w-full lg:w-2/5 lg:sticky lg:top-8 flex justify-center lg:justify-start">
          <QRPreview
            ref={previewRef}
            isEmpty={isEmpty}
            isPulsing={isPulsing}
          />
        </div>

      </div>
    </div>
  );
}
