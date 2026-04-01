import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import { toast } from 'sonner';
import FileUploadZone from './FileUploadZone';

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400';
const LABEL_CLASS = 'block text-sm font-bold text-gray-700 dark:text-slate-300';

interface LandingPageRecord {
  id: string;
  type: 'pdf' | 'appstore';
  title: string;
  description: string;
  companyName: string | null;
  websiteUrl: string | null;
  ctaButtonText: string | null;
  coverImageUrl: string | null;
  pdfUrl: string | null;
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  appIconUrl: string | null;
  screenshotUrl: string | null;
  socialLinks: string[] | null;
}

const SOCIAL_OPTIONS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'linkedin', label: 'LinkedIn' },
];

interface EditLandingPageFormProps {
  landingPageId: string;
}

export function EditLandingPageForm({ landingPageId }: EditLandingPageFormProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [record, setRecord] = useState<LandingPageRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // PDF fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ctaButtonText, setCtaButtonText] = useState('');
  const [selectedSocials, setSelectedSocials] = useState<string[]>([]);

  // App Store fields
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [appCompanyName, setAppCompanyName] = useState('');
  const [appCtaButtonText, setAppCtaButtonText] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');

  // File states (new files to upload)
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [appIconFile, setAppIconFile] = useState<File | null>(null);

  // Upload state
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  // Error states
  const [coverPhotoError, setCoverPhotoError] = useState<string | null>(null);
  const [pdfFileError, setPdfFileError] = useState<string | null>(null);
  const [appIconError, setAppIconError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Existing URLs (from API, used for FileUploadZone existingUrl prop)
  const [existingCoverImageUrl, setExistingCoverImageUrl] = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const [existingAppIconUrl, setExistingAppIconUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/landing/${landingPageId}`)
      .then(async (res) => {
        if (res.status === 404) {
          setLoadState('error');
          return;
        }
        if (!res.ok) {
          setLoadState('error');
          return;
        }
        const data: LandingPageRecord = await res.json();
        setRecord(data);

        // Populate form fields
        if (data.type === 'pdf') {
          setTitle(data.title ?? '');
          setDescription(data.description ?? '');
          setWebsiteUrl(data.websiteUrl ?? '');
          setCompanyName(data.companyName ?? '');
          setCtaButtonText(data.ctaButtonText ?? '');
          setSelectedSocials(Array.isArray(data.socialLinks) ? data.socialLinks : []);
          setExistingCoverImageUrl(data.coverImageUrl ?? null);
          setExistingPdfUrl(data.pdfUrl ?? null);
        } else if (data.type === 'appstore') {
          setAppName(data.title ?? '');
          setAppDescription(data.description ?? '');
          setAppCompanyName(data.companyName ?? '');
          setAppCtaButtonText(data.ctaButtonText ?? '');
          setAppStoreUrl(data.appStoreUrl ?? '');
          setGooglePlayUrl(data.googlePlayUrl ?? '');
          setScreenshotUrl(data.screenshotUrl ?? '');
          setExistingAppIconUrl(data.appIconUrl ?? null);
        }

        setLoadState('loaded');
      })
      .catch(() => {
        setLoadState('error');
      });
  }, [landingPageId]);

  const toggleSocial = (id: string) => {
    setSelectedSocials((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCoverPhotoSelect = (file: File | null) => {
    setCoverPhotoError(null);
    if (file === null && coverPhotoFile !== null) {
      setCoverPhotoFile(null);
      return;
    }
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCoverPhotoError('Only image files (JPEG, PNG, WebP) are accepted here.');
      return;
    }
    setCoverPhotoFile(file);
  };

  const handlePdfFileSelect = (file: File | null) => {
    setPdfFileError(null);
    if (file === null && pdfFile !== null) {
      setPdfFile(null);
      return;
    }
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setPdfFileError('Only PDF files are accepted here.');
      return;
    }
    setPdfFile(file);
  };

  const handleAppIconSelect = (file: File | null) => {
    setAppIconError(null);
    if (file === null && appIconFile !== null) {
      setAppIconFile(null);
      return;
    }
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAppIconError('Only image files (JPEG, PNG, WebP) are accepted here.');
      return;
    }
    setAppIconFile(file);
  };

  const handleSubmitPdf = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!title.trim()) {
      setTitleError('Title is required.');
      hasError = true;
    } else {
      setTitleError(null);
    }
    if (!description.trim()) {
      setDescriptionError('Description is required.');
      hasError = true;
    } else {
      setDescriptionError(null);
    }
    if (hasError) return;

    setIsSaving(true);

    // Upload new files if selected
    let newCoverImageUrl: string | undefined;
    let newPdfUrl: string | undefined;

    const uploads: Promise<void>[] = [];

    if (coverPhotoFile) {
      setIsUploadingCover(true);
      uploads.push(
        upload(coverPhotoFile.name, coverPhotoFile, {
          access: 'public',
          handleUploadUrl: '/api/landing/upload',
        })
          .then((blob) => { newCoverImageUrl = blob.url; })
          .catch(() => { setCoverPhotoError('Upload failed. Check your connection and try again.'); })
          .finally(() => setIsUploadingCover(false))
      );
    }

    if (pdfFile) {
      setIsUploadingPdf(true);
      uploads.push(
        upload(pdfFile.name, pdfFile, {
          access: 'public',
          handleUploadUrl: '/api/landing/upload',
        })
          .then((blob) => { newPdfUrl = blob.url; })
          .catch(() => { setPdfFileError('Upload failed. Check your connection and try again.'); })
          .finally(() => setIsUploadingPdf(false))
      );
    }

    await Promise.all(uploads);

    if (coverPhotoError || pdfFileError) {
      setIsSaving(false);
      return;
    }

    // Build PUT body — OMIT file URL fields if user did not upload a new file
    const putBody: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      websiteUrl: websiteUrl.trim() || null,
      companyName: companyName.trim() || null,
      ctaButtonText: ctaButtonText.trim() || null,
      socialLinks: selectedSocials,
    };

    if (newCoverImageUrl !== undefined) {
      putBody.coverImageUrl = newCoverImageUrl;
    }
    if (newPdfUrl !== undefined) {
      putBody.pdfUrl = newPdfUrl;
    }

    try {
      const res = await fetch(`/api/landing/${landingPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      });
      if (!res.ok) throw new Error();
      toast.success('Landing page updated');
      window.location.href = '/dashboard';
    } catch {
      toast.error('Could not save your landing page. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAppStore = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!appName.trim()) {
      setTitleError('App name is required.');
      hasError = true;
    } else {
      setTitleError(null);
    }
    if (!appDescription.trim()) {
      setDescriptionError('Description is required.');
      hasError = true;
    } else {
      setDescriptionError(null);
    }
    if (hasError) return;

    setIsSaving(true);

    // Upload new app icon if selected
    let newAppIconUrl: string | undefined;

    if (appIconFile) {
      setIsUploadingIcon(true);
      try {
        const blob = await upload(appIconFile.name, appIconFile, {
          access: 'public',
          handleUploadUrl: '/api/landing/upload',
        });
        newAppIconUrl = blob.url;
      } catch {
        setAppIconError('Upload failed. Check your connection and try again.');
        setIsUploadingIcon(false);
        setIsSaving(false);
        return;
      }
      setIsUploadingIcon(false);
    }

    if (appIconError) {
      setIsSaving(false);
      return;
    }

    // Build PUT body — OMIT file URL fields if user did not upload a new file
    const putBody: Record<string, unknown> = {
      title: appName.trim(),
      description: appDescription.trim(),
      companyName: appCompanyName.trim() || null,
      ctaButtonText: appCtaButtonText.trim() || null,
      appStoreUrl: appStoreUrl.trim() || null,
      googlePlayUrl: googlePlayUrl.trim() || null,
      screenshotUrl: screenshotUrl.trim() || null,
    };

    if (newAppIconUrl !== undefined) {
      putBody.appIconUrl = newAppIconUrl;
    }

    try {
      const res = await fetch(`/api/landing/${landingPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      });
      if (!res.ok) throw new Error();
      toast.success('Landing page updated');
      window.location.href = '/dashboard';
    } catch {
      toast.error('Could not save your landing page. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" aria-label="Loading" />
      </div>
    );
  }

  if (loadState === 'error' || !record) {
    return (
      <p className="text-sm text-gray-600 dark:text-slate-400 py-8 text-center">
        Could not load this page. It may have been removed.
      </p>
    );
  }

  if (record.type === 'pdf') {
    return (
      <form onSubmit={handleSubmitPdf} className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="edit-pdf-title" className={LABEL_CLASS}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-pdf-title"
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(null); }}
            placeholder="My PDF Document"
            required
            className={INPUT_CLASS}
            aria-describedby={titleError ? 'edit-pdf-title-error' : undefined}
          />
          {titleError && (
            <p id="edit-pdf-title-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
              {titleError}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="edit-pdf-description" className={LABEL_CLASS}>
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="edit-pdf-description"
            rows={3}
            value={description}
            onChange={(e) => { setDescription(e.target.value); setDescriptionError(null); }}
            placeholder="A brief description of this PDF document."
            required
            className={INPUT_CLASS}
            aria-describedby={descriptionError ? 'edit-pdf-description-error' : undefined}
          />
          {descriptionError && (
            <p id="edit-pdf-description-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
              {descriptionError}
            </p>
          )}
        </div>

        {/* Website URL */}
        <div className="space-y-2">
          <label htmlFor="edit-pdf-website" className={LABEL_CLASS}>
            Website URL
          </label>
          <input
            id="edit-pdf-website"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://example.com"
            className={INPUT_CLASS}
          />
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <label htmlFor="edit-pdf-company" className={LABEL_CLASS}>
            Company Name
          </label>
          <input
            id="edit-pdf-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            className={INPUT_CLASS}
          />
        </div>

        {/* CTA Button Text */}
        <div className="space-y-2">
          <label htmlFor="edit-pdf-cta" className={LABEL_CLASS}>
            CTA Button Text
          </label>
          <input
            id="edit-pdf-cta"
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
            maxSizeMB={10}
            file={coverPhotoFile}
            existingUrl={existingCoverImageUrl}
            onFileSelect={handleCoverPhotoSelect}
            errorMessage={coverPhotoError}
            helperText="Max 10 MB (Free plan) · 25 MB (Pro plan)"
            isUploading={isUploadingCover}
          />
        </div>

        {/* PDF File Upload */}
        <div className="space-y-2">
          <label className={LABEL_CLASS}>PDF File</label>
          <FileUploadZone
            label="Drop PDF here or click to browse"
            accept="application/pdf"
            maxSizeMB={10}
            file={pdfFile}
            existingUrl={existingPdfUrl}
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
                        ? 'px-3 py-1 text-sm rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'px-3 py-1 text-sm rounded-full border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400'
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving || isUploadingCover || isUploadingPdf}
            className="flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2 text-sm font-bold text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    );
  }

  // App Store type
  return (
    <form onSubmit={handleSubmitAppStore} className="space-y-4">
      {/* App Name */}
      <div className="space-y-2">
        <label htmlFor="edit-appstore-name" className={LABEL_CLASS}>
          App Name <span className="text-red-500">*</span>
        </label>
        <input
          id="edit-appstore-name"
          type="text"
          value={appName}
          onChange={(e) => { setAppName(e.target.value); setTitleError(null); }}
          placeholder="My Awesome App"
          required
          className={INPUT_CLASS}
          aria-describedby={titleError ? 'edit-appstore-name-error' : undefined}
        />
        {titleError && (
          <p id="edit-appstore-name-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
            {titleError}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="edit-appstore-description" className={LABEL_CLASS}>
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="edit-appstore-description"
          rows={3}
          value={appDescription}
          onChange={(e) => { setAppDescription(e.target.value); setDescriptionError(null); }}
          placeholder="A brief description of your app."
          required
          className={INPUT_CLASS}
          aria-describedby={descriptionError ? 'edit-appstore-description-error' : undefined}
        />
        {descriptionError && (
          <p id="edit-appstore-description-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
            {descriptionError}
          </p>
        )}
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <label htmlFor="edit-appstore-company" className={LABEL_CLASS}>
          Company Name
        </label>
        <input
          id="edit-appstore-company"
          type="text"
          value={appCompanyName}
          onChange={(e) => setAppCompanyName(e.target.value)}
          placeholder="Acme Corp"
          className={INPUT_CLASS}
        />
      </div>

      {/* CTA Button Text */}
      <div className="space-y-2">
        <label htmlFor="edit-appstore-cta" className={LABEL_CLASS}>
          CTA Button Text
        </label>
        <input
          id="edit-appstore-cta"
          type="text"
          value={appCtaButtonText}
          onChange={(e) => setAppCtaButtonText(e.target.value)}
          placeholder="Get the App"
          className={INPUT_CLASS}
        />
      </div>

      {/* iOS App Store URL */}
      <div className="space-y-2">
        <label htmlFor="edit-appstore-ios" className={LABEL_CLASS}>
          iOS App Store URL
        </label>
        <input
          id="edit-appstore-ios"
          type="url"
          value={appStoreUrl}
          onChange={(e) => setAppStoreUrl(e.target.value)}
          placeholder="https://apps.apple.com/app/my-app/id123456789"
          className={INPUT_CLASS}
        />
      </div>

      {/* Google Play URL */}
      <div className="space-y-2">
        <label htmlFor="edit-appstore-google" className={LABEL_CLASS}>
          Google Play URL
        </label>
        <input
          id="edit-appstore-google"
          type="url"
          value={googlePlayUrl}
          onChange={(e) => setGooglePlayUrl(e.target.value)}
          placeholder="https://play.google.com/store/apps/details?id=com.example.app"
          className={INPUT_CLASS}
        />
      </div>

      {/* App Icon Upload */}
      <div className="space-y-2">
        <label className={LABEL_CLASS}>App Icon</label>
        <FileUploadZone
          label="Drop app icon here or click to browse"
          accept="image/jpeg,image/png,image/webp"
          maxSizeMB={10}
          file={appIconFile}
          existingUrl={existingAppIconUrl}
          onFileSelect={handleAppIconSelect}
          errorMessage={appIconError}
          helperText="Max 10 MB (Free plan) · 25 MB (Pro plan)"
          isUploading={isUploadingIcon}
        />
      </div>

      {/* Screenshot/Trailer URL */}
      <div className="space-y-2">
        <label htmlFor="edit-appstore-screenshot" className={LABEL_CLASS}>
          Screenshot/Trailer URL
        </label>
        <input
          id="edit-appstore-screenshot"
          type="url"
          value={screenshotUrl}
          onChange={(e) => setScreenshotUrl(e.target.value)}
          placeholder="https://example.com/screenshot.png"
          className={INPUT_CLASS}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving || isUploadingIcon}
          className="flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </button>
        <a
          href="/dashboard"
          className="px-6 py-2 text-sm font-bold text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
