import { useState } from "react";
import QRCodeStyling from "qr-code-styling";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { composeQRWithFrame } from "../lib/frameComposer";
import type { FrameSectionState } from "../types/frames";
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
  frameOptions: FrameSectionState;   // ← NEW
}

export function ExportButtons({
  qrCodeRef,
  isEmpty,
  colorOptions,
  shapeOptions,
  logoOptions,
  debouncedContent,
  frameOptions,        // ← NEW
}: ExportButtonsProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [isComposing, setIsComposing] = useState(false);

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

    // No frame active — use existing download path
    if (frameOptions.frameType === "none") {
      await tempQr.download({ name: "qrcraft-code", extension: "png" });
      return;
    }

    // Frame active — compose via Canvas 2D
    setIsComposing(true);
    try {
      const rawBlob = await tempQr.getRawData("png");
      if (!rawBlob) throw new Error("QR data unavailable");

      const composedBlob = await composeQRWithFrame(rawBlob as Blob, {
        frameType: frameOptions.frameType,
        frameText: frameOptions.frameText,
        frameColor: dotColor,   // D-10: frame follows QR foreground color
        bgColor,
      });

      // Trigger download
      const url = URL.createObjectURL(composedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcraft-code.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Frame composition failed:", err);
      toast.error("Export failed. Try again.");
    } finally {
      setIsComposing(false);
    }
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

      let blob: Blob | undefined;

      if (frameOptions.frameType !== "none") {
        // Get raw blob and compose with frame
        const rawBlob = await qrCodeRef.current?.getRawData("png");
        if (!rawBlob) { setCopyState("unsupported"); setTimeout(() => setCopyState("idle"), 2000); return; }
        blob = await composeQRWithFrame(rawBlob as Blob, {
          frameType: frameOptions.frameType,
          frameText: frameOptions.frameText,
          frameColor: colorOptions.dotColor,
          bgColor: colorOptions.bgColor,
        });
      } else {
        blob = await qrCodeRef.current?.getRawData("png") as Blob | undefined;
      }

      if (!blob) { setCopyState("unsupported"); setTimeout(() => setCopyState("idle"), 2000); return; }

      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
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
        disabled={isEmpty || isComposing}
        onClick={handlePngDownload}
        className={buttonClass}
      >
        {isComposing ? (
          <span className="flex items-center justify-center gap-1">
            <Loader2 size={14} className="animate-spin" />
            Exporting…
          </span>
        ) : "Download PNG"}
      </button>
      <button
        data-testid="export-svg"
        disabled={isEmpty || frameOptions.frameType !== "none"}
        onClick={handleSvgDownload}
        title={frameOptions.frameType !== "none" ? "SVG export is frameless. Use PNG to include the frame." : undefined}
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
