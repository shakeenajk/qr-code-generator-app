import { useEffect, useRef } from "react";

interface AdUnitProps {
  adClient: string; // e.g. "ca-pub-XXXXXXXXXXXXXXXX"
  adSlot: string;   // e.g. "1234567890"
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({ adClient, adSlot }: AdUnitProps) {
  const injectedRef = useRef(false);

  useEffect(() => {
    const injectAds = () => {
      if (injectedRef.current) return;
      injectedRef.current = true;

      // Inject adsbygoogle.js dynamically — only fires on first user interaction
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);

      // Push the ad unit after script loads
      script.onload = () => {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      };
    };

    // Delay injection until user interaction or 5-second fallback
    const events = ["keydown", "mousemove", "wheel", "touchmove", "touchstart", "scroll"];
    const timeout = window.setTimeout(injectAds, 5000);
    events.forEach((e) => window.addEventListener(e, injectAds, { once: true, passive: true }));

    return () => {
      window.clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, injectAds));
    };
  }, [adClient]);

  return (
    <div
      className="w-full mt-4"
      style={{ minHeight: 90 }}
      aria-label="Advertisement"
    >
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}
