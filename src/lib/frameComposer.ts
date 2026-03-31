import type { FrameConfig, FrameType } from "../types/frames";

// Frame layout constants (pixel values for a 768px QR source)
const FRAME_PADDING = 80;    // px added on each side
const CTA_ZONE_HEIGHT = 80;  // px reserved for CTA text band (bottom/top banners)
const TEXT_FONT = "bold 28px system-ui, -apple-system, sans-serif";
const TEXT_FONT_SIZE = 28;   // px — must match font declaration

interface CanvasDimensions {
  width: number;
  height: number;
  qrX: number;  // where to draw the QR bitmap
  qrY: number;
}

function getDimensions(frameType: FrameType, qrSize: number): CanvasDimensions {
  const pad = FRAME_PADDING;
  const ctaH = CTA_ZONE_HEIGHT;
  switch (frameType) {
    case "none":
      return { width: qrSize, height: qrSize, qrX: 0, qrY: 0 };
    case "simple-border":
    case "rounded-border":
      return { width: qrSize + pad * 2, height: qrSize + pad + ctaH + pad, qrX: pad, qrY: pad };
    case "top-bottom":
      return { width: qrSize + pad * 2, height: qrSize + ctaH * 2 + pad * 2, qrX: pad, qrY: ctaH + pad };
    case "bottom-banner":
      return { width: qrSize + pad * 2, height: qrSize + ctaH + pad * 2, qrX: pad, qrY: pad };
    case "badge":
      // Circle badge: QR sits centered in a square canvas, badge is a circle around it
      return { width: qrSize + pad * 2, height: qrSize + pad * 2, qrX: pad, qrY: pad };
    case "shopping-bag":
    case "clipboard":
      return { width: qrSize + pad * 2, height: qrSize + pad + ctaH + pad, qrX: pad, qrY: pad };
    default:
      return { width: qrSize + pad * 2, height: qrSize + pad * 2, qrX: pad, qrY: pad };
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frameType: FrameType,
  dims: CanvasDimensions,
  frameColor: string,
  bgColor: string,
  ctaText: string
): void {
  const { width, height } = dims;
  const pad = FRAME_PADDING;
  const ctaH = CTA_ZONE_HEIGHT;

  // Background fill
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = frameColor;
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 4;
  ctx.font = TEXT_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  switch (frameType) {
    case "none":
      break;

    case "simple-border": {
      // Outer rectangle border
      ctx.strokeRect(4, 4, width - 8, height - 8);
      // Bottom CTA band
      ctx.fillStyle = frameColor;
      ctx.fillRect(0, height - ctaH - pad, width, ctaH + pad);
      ctx.fillStyle = bgColor;
      ctx.fillText(ctaText, width / 2, height - (ctaH + pad) / 2);
      break;
    }

    case "rounded-border": {
      const r = 20;
      ctx.beginPath();
      ctx.moveTo(r, 4);
      ctx.lineTo(width - r, 4);
      ctx.quadraticCurveTo(width - 4, 4, width - 4, r);
      ctx.lineTo(width - 4, height - r);
      ctx.quadraticCurveTo(width - 4, height - 4, width - r, height - 4);
      ctx.lineTo(r, height - 4);
      ctx.quadraticCurveTo(4, height - 4, 4, height - r);
      ctx.lineTo(4, r);
      ctx.quadraticCurveTo(4, 4, r, 4);
      ctx.closePath();
      ctx.stroke();
      // Bottom CTA band (filled rect)
      ctx.fillStyle = frameColor;
      ctx.fillRect(0, height - ctaH, width, ctaH);
      ctx.fillStyle = bgColor;
      ctx.fillText(ctaText, width / 2, height - ctaH / 2);
      break;
    }

    case "top-bottom": {
      // Top band
      ctx.fillStyle = frameColor;
      ctx.fillRect(0, 0, width, ctaH + pad);
      // Bottom band
      ctx.fillRect(0, height - ctaH - pad, width, ctaH + pad);
      ctx.fillStyle = bgColor;
      ctx.fillText(ctaText, width / 2, (ctaH + pad) / 2);
      ctx.fillText(ctaText, width / 2, height - (ctaH + pad) / 2);
      break;
    }

    case "bottom-banner": {
      // Wide bottom banner
      ctx.fillStyle = frameColor;
      ctx.fillRect(0, height - ctaH - pad, width, ctaH + pad);
      ctx.fillStyle = bgColor;
      ctx.fillText(ctaText, width / 2, height - (ctaH + pad) / 2);
      break;
    }

    case "badge": {
      // Draw circle border around the QR + padding
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) / 2 - 4;
      ctx.strokeStyle = frameColor;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      // CTA text at bottom inside circle
      ctx.fillStyle = frameColor;
      ctx.fillText(ctaText, cx, cy + radius - TEXT_FONT_SIZE);
      break;
    }

    case "shopping-bag": {
      // Bag body rect
      ctx.strokeStyle = frameColor;
      ctx.strokeRect(pad / 2, ctaH, width - pad, height - ctaH - pad / 2);
      // Handle arcs at top
      ctx.beginPath();
      ctx.arc(width / 2 - 40, ctaH, 40, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(width / 2 + 40, ctaH, 40, Math.PI, 0);
      ctx.stroke();
      // CTA text bottom
      ctx.fillStyle = frameColor;
      ctx.fillRect(0, height - ctaH, width, ctaH);
      ctx.fillStyle = bgColor;
      ctx.fillText(ctaText, width / 2, height - ctaH / 2);
      break;
    }

    case "clipboard": {
      // Body rect
      ctx.strokeStyle = frameColor;
      ctx.strokeRect(pad / 2, ctaH / 2, width - pad, height - ctaH - pad / 2);
      // Clip bar at top
      ctx.fillStyle = frameColor;
      ctx.fillRect(width / 4, 0, width / 2, ctaH / 2 + 4);
      // CTA text bottom
      ctx.fillRect(0, height - ctaH, width, ctaH);
      ctx.fillStyle = bgColor;
      ctx.fillText(ctaText, width / 2, height - ctaH / 2);
      break;
    }
  }
}

export async function composeQRWithFrame(
  qrBlob: Blob,
  config: FrameConfig
): Promise<Blob> {
  const { frameType, frameText, frameColor, bgColor } = config;

  if (frameType === "none") return qrBlob;

  // Decode the QR PNG blob to an ImageBitmap (no canvas taint — it's a data blob, not a cross-origin URL)
  const bitmap = await createImageBitmap(qrBlob);
  const qrSize = bitmap.width; // 768 from ExportButtons tempQr

  const dims = getDimensions(frameType, qrSize);

  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Draw frame decoration FIRST (background + frame shapes)
  drawFrame(ctx, frameType, dims, frameColor, bgColor, frameText);

  // Draw QR bitmap on top, centered at (qrX, qrY)
  ctx.drawImage(bitmap, dims.qrX, dims.qrY, qrSize, qrSize);
  bitmap.close();

  // Convert to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/png"
    );
  });
}
