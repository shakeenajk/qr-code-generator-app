import { useState } from "react";
import QRCodeStyling from "qr-code-styling";
import type { ColorSectionState } from "./customize/ColorSection";
import type { ShapeSectionState } from "./customize/ShapeSection";
import type { LogoSectionState } from "./customize/LogoSection";

type CopyState = "idle" | "copied" | "unsupported";

const COPY_LABELS: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied!",
  unsupported: "Copy not supported",
};

export interface ExportButtonsProps {
  qrCodeRef: React.RefObject<QRCodeStyling | null>;
  isEmpty: boolean;
  colorOptions: ColorSectionState;
  shapeOptions: ShapeSectionState;
  logoOptions: LogoSectionState;
  debouncedContent: string;
}

export function ExportButtons({
  qrCodeRef,
  isEmpty,
  colorOptions,
  shapeOptions,
  logoOptions,
  debouncedContent,
}: ExportButtonsProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function handlePngDownload() {
    const {
      dotColor,
      bgColor,
      gradientEnabled,
      gradientType,
      gradientStop1,
      gradientStop2,
    } = colorOptions;
    const { dotType, cornerSquareType, cornerDotType } = shapeOptions;
    const { logoSrc } = logoOptions;

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

    const tempQr = new QRCodeStyling({
      width: 768,
      height: 768,
      type: "canvas",
      data: debouncedContent,
      dotsOptions,
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: cornerSquareType },
      cornersDotOptions: { type: cornerDotType },
      ...(logoSrc ? { image: logoSrc } : {}),
      imageOptions: { imageSize: 0.3, hideBackgroundDots: true, margin: 4 },
      qrOptions: { errorCorrectionLevel: logoSrc ? "H" : "Q" },
    });

    await tempQr.download({ name: "qrcraft-code", extension: "png" });
  }

  async function handleSvgDownload() {
    await qrCodeRef.current?.download({ name: "qrcraft-code", extension: "svg" });
  }

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.write) {
        setCopyState("unsupported");
        setTimeout(() => setCopyState("idle"), 2000);
        return;
      }
      const blob = await qrCodeRef.current?.getRawData("png");
      if (!blob) {
        setCopyState("unsupported");
        setTimeout(() => setCopyState("idle"), 2000);
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob as Blob }),
      ]);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("unsupported");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  const buttonClass =
    "flex-1 border border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white rounded-lg text-sm font-medium py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";

  return (
    <div className="flex gap-2 mt-4 w-full">
      <button
        data-testid="export-png"
        disabled={isEmpty}
        onClick={handlePngDownload}
        className={buttonClass}
      >
        Download PNG
      </button>
      <button
        data-testid="export-svg"
        disabled={isEmpty}
        onClick={handleSvgDownload}
        className={buttonClass}
      >
        Download SVG
      </button>
      <button
        data-testid="export-copy"
        disabled={isEmpty}
        onClick={handleCopy}
        className={buttonClass}
      >
        {COPY_LABELS[copyState]}
      </button>
    </div>
  );
}
