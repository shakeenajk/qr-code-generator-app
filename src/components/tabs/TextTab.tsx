interface TextTabProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TextTab({ value, onChange }: TextTabProps) {
  return (
    <div className="space-y-3">
      <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
        Text Content
      </label>
      <textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter any text..."
        rows={5}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"
      />
    </div>
  );
}
