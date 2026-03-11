import type { VCardState } from "../../lib/qrEncoding";

interface VCardTabProps {
  value: VCardState;
  onChange: (value: VCardState) => void;
}

export default function VCardTab({ value, onChange }: VCardTabProps) {
  const update = (field: keyof VCardState, fieldValue: string) =>
    onChange({ ...value, [field]: fieldValue });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="vcard-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="vcard-name"
          name="name"
          type="text"
          value={value.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Jane Doe"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="vcard-phone" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Phone
        </label>
        <input
          id="vcard-phone"
          name="phone"
          type="tel"
          value={value.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="+1 555 000 0000"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="vcard-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Email
        </label>
        <input
          id="vcard-email"
          name="email"
          type="email"
          value={value.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="jane@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="vcard-org" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          Organization
        </label>
        <input
          id="vcard-org"
          name="org"
          type="text"
          value={value.org}
          onChange={(e) => update("org", e.target.value)}
          placeholder="Acme Corp"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>
    </div>
  );
}
