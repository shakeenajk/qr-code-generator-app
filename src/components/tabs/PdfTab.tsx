import { useState } from "react";
import { Loader2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import FileUploadZone from "../FileUploadZone";

const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400";
const LABEL_CLASS = "block text-sm font-bold text-gray-700 dark:text-slate-300";

export interface PdfLandingPageData {
  type: "pdf";
  title: string;
  description: string;
  websiteUrl: string;
  companyName: string;
  ctaButtonText: string;
  coverImageUrl: string | null;
  pdfUrl: string | null;
  socialLinks: string[];
  name: string;
  styleData: string;
  logoData: string | null;
  thumbnailData: string | null;
}

interface PdfTabProps {
  onSave: (data: PdfLandingPageData) => Promise<void>;
  isSaving: boolean;
  userTier: "free" | "starter" | "pro" | null;
  isSignedIn: boolean;
}

const SOCIAL_OPTIONS = [
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "Twitter/X" },
  { id: "linkedin", label: "LinkedIn" },
];

export default function PdfTab({ onSave, isSaving, userTier, isSignedIn }: PdfTabProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ctaButtonText, setCtaButtonText] = useState("");
  const [selectedSocials, setSelectedSocials] = useState<string[]>([]);

  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverPhotoError, setCoverPhotoError] = useState<string | null>(null);
  const [pdfFileError, setPdfFileError] = useState<string | null>(null);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const maxSizeMB = userTier === "pro" ? 25 : 10;

  const handleCoverPhotoSelect = (file: File | null) => {
    setCoverPhotoError(null);
    if (file === null && coverPhotoFile !== null) {
      // File was removed or size exceeded
      const prevFile = coverPhotoFile;
      setCoverPhotoFile(null);
      // Check if size exceeded
      if (prevFile && prevFile.size > maxSizeMB * 1024 * 1024) {
        setCoverPhotoError(
          userTier === "pro"
            ? "File exceeds the 25 MB limit."
            : "File exceeds the 10 MB limit for the Free plan. Upgrade to Pro for 25 MB uploads."
        );
      }
      return;
    }
    if (!file) return;
    // Validate image type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setCoverPhotoError("Only image files (JPEG, PNG, WebP) are accepted here.");
      return;
    }
    setCoverPhotoFile(file);
  };

  const handlePdfFileSelect = (file: File | null) => {
    setPdfFileError(null);
    if (file === null && pdfFile !== null) {
      const prevFile = pdfFile;
      setPdfFile(null);
      if (prevFile && prevFile.size > maxSizeMB * 1024 * 1024) {
        setPdfFileError(
          userTier === "pro"
            ? "File exceeds the 25 MB limit."
            : "File exceeds the 10 MB limit for the Free plan. Upgrade to Pro for 25 MB uploads."
        );
      }
      return;
    }
    if (!file) return;
    // Validate PDF type
    if (file.type !== "application/pdf") {
      setPdfFileError("Only PDF files are accepted here.");
      return;
    }
    setPdfFile(file);
  };

  const toggleSocial = (id: string) => {
    setSelectedSocials((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    let hasError = false;
    if (!title.trim()) {
      setTitleError("Title is required.");
      hasError = true;
    } else {
      setTitleError(null);
    }
    if (!description.trim()) {
      setDescriptionError("Description is required.");
      hasError = true;
    } else {
      setDescriptionError(null);
    }
    if (hasError) return;

    // Upload files in parallel
    let coverImageUrl: string | null = null;
    let pdfUrl: string | null = null;

    const uploads: Promise<void>[] = [];

    if (coverPhotoFile) {
      setIsUploadingCover(true);
      uploads.push(
        upload(coverPhotoFile.name, coverPhotoFile, {
          access: "public",
          handleUploadUrl: "/api/landing/upload",
        })
          .then((blob) => {
            coverImageUrl = blob.url;
          })
          .catch(() => {
            setCoverPhotoError("Upload failed. Check your connection and try again.");
          })
          .finally(() => setIsUploadingCover(false))
      );
    }

    if (pdfFile) {
      setIsUploadingPdf(true);
      uploads.push(
        upload(pdfFile.name, pdfFile, {
          access: "public",
          handleUploadUrl: "/api/landing/upload",
        })
          .then((blob) => {
            pdfUrl = blob.url;
          })
          .catch(() => {
            setPdfFileError("Upload failed. Check your connection and try again.");
          })
          .finally(() => setIsUploadingPdf(false))
      );
    }

    await Promise.all(uploads);

    // Check if upload errors occurred
    if (coverPhotoError || pdfFileError) return;

    const saveName = title.trim().slice(0, 60) || "PDF QR";

    await onSave({
      type: "pdf",
      title: title.trim(),
      description: description.trim(),
      websiteUrl: websiteUrl.trim(),
      companyName: companyName.trim(),
      ctaButtonText: ctaButtonText.trim(),
      coverImageUrl,
      pdfUrl,
      socialLinks: selectedSocials,
      name: saveName,
      styleData: "",
      logoData: null,
      thumbnailData: null,
    });
  };

  if (!isSignedIn) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Sign in to create a PDF landing page QR code.
        </p>
        <a
          href="/sign-in"
          className="inline-block px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="pdf-title" className={LABEL_CLASS}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="pdf-title"
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleError(null); }}
          placeholder="My PDF Document"
          required
          className={INPUT_CLASS}
          aria-describedby={titleError ? "pdf-title-error" : undefined}
        />
        {titleError && (
          <p id="pdf-title-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
            {titleError}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="pdf-description" className={LABEL_CLASS}>
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="pdf-description"
          rows={3}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setDescriptionError(null); }}
          placeholder="A brief description of this PDF document."
          required
          className={INPUT_CLASS}
          aria-describedby={descriptionError ? "pdf-description-error" : undefined}
        />
        {descriptionError && (
          <p id="pdf-description-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
            {descriptionError}
          </p>
        )}
      </div>

      {/* Website URL */}
      <div className="space-y-2">
        <label htmlFor="pdf-website" className={LABEL_CLASS}>
          Website URL
        </label>
        <input
          id="pdf-website"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://example.com"
          className={INPUT_CLASS}
        />
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <label htmlFor="pdf-company" className={LABEL_CLASS}>
          Company Name
        </label>
        <input
          id="pdf-company"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Corp"
          className={INPUT_CLASS}
        />
      </div>

      {/* CTA Button Text */}
      <div className="space-y-2">
        <label htmlFor="pdf-cta" className={LABEL_CLASS}>
          CTA Button Text
        </label>
        <input
          id="pdf-cta"
          type="text"
          value={ctaButtonText}
          onChange={(e) => setCtaButtonText(e.target.value)}
          placeholder="Download PDF"
          className={INPUT_CLASS}
        />
      </div>

      {/* Cover Photo Upload */}
      <div className="space-y-2">
        <label className={LABEL_CLASS}>Cover Photo</label>
        <FileUploadZone
          label="Drop cover photo here or click to browse"
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={maxSizeMB}
          file={coverPhotoFile}
          onFileSelect={handleCoverPhotoSelect}
          errorMessage={coverPhotoError}
          helperText={`Max ${maxSizeMB} MB (${userTier === "pro" ? "Pro plan" : "Free plan"}) · 25 MB (Pro plan)`}
          isUploading={isUploadingCover}
        />
      </div>

      {/* PDF File Upload */}
      <div className="space-y-2">
        <label className={LABEL_CLASS}>PDF File</label>
        <FileUploadZone
          label="Drop PDF here or click to browse"
          accept="application/pdf"
          maxSizeMB={maxSizeMB}
          file={pdfFile}
          onFileSelect={handlePdfFileSelect}
          errorMessage={pdfFileError}
          helperText="Max 10 MB (Free plan) · 25 MB (Pro plan)"
          isUploading={isUploadingPdf}
        />
      </div>

      {/* Social Sharing Buttons */}
      <div className="space-y-2">
        <fieldset>
          <legend className={LABEL_CLASS}>Social Sharing Buttons</legend>
          <legend className="sr-only">Social sharing buttons</legend>
          <div className="flex flex-wrap gap-2 mt-2">
            {SOCIAL_OPTIONS.map((option) => {
              const checked = selectedSocials.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleSocial(option.id)}
                  aria-pressed={checked}
                  className={
                    checked
                      ? "px-3 py-1 text-sm rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                      : "px-3 py-1 text-sm rounded-full border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400"
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSaving || isUploadingCover || isUploadingPdf}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold
                   text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Create PDF Landing Page"
        )}
      </button>
    </form>
  );
}
