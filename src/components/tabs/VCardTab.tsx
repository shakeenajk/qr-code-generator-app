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

      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="vcard-title" className="block text-sm font-normal text-gray-700 dark:text-slate-300">
          Title
        </label>
        <input
          id="vcard-title"
          name="title"
          type="text"
          value={value.title ?? ''}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Software Engineer"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>

      {/* Company */}
      <div className="space-y-2">
        <label htmlFor="vcard-company" className="block text-sm font-normal text-gray-700 dark:text-slate-300">
          Company
        </label>
        <input
          id="vcard-company"
          name="company"
          type="text"
          value={value.company ?? ''}
          onChange={(e) => update("company", e.target.value)}
          placeholder="Acme Corp"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>

      {/* Work Phone */}
      <div className="space-y-2">
        <label htmlFor="vcard-work-phone" className="block text-sm font-normal text-gray-700 dark:text-slate-300">
          Work Phone
        </label>
        <input
          id="vcard-work-phone"
          name="workPhone"
          type="tel"
          value={value.workPhone ?? ''}
          onChange={(e) => update("workPhone", e.target.value)}
          placeholder="+1 555 000 0001"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <label htmlFor="vcard-address" className="block text-sm font-normal text-gray-700 dark:text-slate-300">
          Address
        </label>
        <input
          id="vcard-address"
          name="address"
          type="text"
          value={value.address ?? ''}
          onChange={(e) => update("address", e.target.value)}
          placeholder="123 Main St, City, State 12345"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>

      {/* Website */}
      <div className="space-y-2">
        <label htmlFor="vcard-website" className="block text-sm font-normal text-gray-700 dark:text-slate-300">
          Website
        </label>
        <input
          id="vcard-website"
          name="website"
          type="url"
          value={value.website ?? ''}
          onChange={(e) => update("website", e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>

      {/* LinkedIn */}
      <div className="space-y-2">
        <label htmlFor="vcard-linkedin" className="block text-sm font-normal text-gray-700 dark:text-slate-300">
          LinkedIn
        </label>
        <input
          id="vcard-linkedin"
          name="linkedin"
          type="url"
          value={value.linkedin ?? ''}
          onChange={(e) => update("linkedin", e.target.value)}
          placeholder="https://linkedin.com/in/username"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
        />
      </div>
    </div>
  );
}
