import { useState } from "react";
import type { WifiState } from "../../lib/qrEncoding";

interface WifiTabProps {
  value: WifiState;
  onChange: (value: WifiState) => void;
}

export default function WifiTab({ value, onChange }: WifiTabProps) {
  const [showPassword, setShowPassword] = useState(false);

  const update = (field: keyof WifiState, fieldValue: string) =>
    onChange({ ...value, [field]: fieldValue });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="ssid-input" className="block text-sm font-medium text-gray-700">
          Network Name (SSID)
        </label>
        <input
          id="ssid-input"
          name="ssid"
          type="text"
          value={value.ssid}
          onChange={(e) => update("ssid", e.target.value)}
          placeholder="MyNetwork"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="security-input" className="block text-sm font-medium text-gray-700">
          Security Type
        </label>
        <select
          id="security-input"
          name="security"
          value={value.security}
          onChange={(e) => update("security", e.target.value as WifiState["security"])}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="WPA">WPA/WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">None (Open Network)</option>
        </select>
      </div>

      {value.security !== "nopass" && (
        <div className="space-y-2">
          <label htmlFor="password-input" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password-input"
              name="password"
              type={showPassword ? "text" : "password"}
              value={value.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Network password"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
