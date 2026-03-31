// src/data/useCases.ts

export interface UseCaseSection {
  heading: string;
  paragraphs: string[];
}

export interface UseCase {
  slug: string;
  title: string;
  excerpt: string;
  body: UseCaseSection[];
  keywords: string[];
}

export const USE_CASES: UseCase[] = [
  {
    slug: 'restaurant-menu',
    title: 'QR Codes for Restaurant Menus',
    excerpt: 'Create a QR code that links to your digital menu. Free, instant, no signup required.',
    keywords: ['qr code for restaurant menu', 'digital menu qr code', 'restaurant menu qr code generator'],
    body: [
      {
        heading: 'Why Restaurants Use QR Code Menus',
        paragraphs: [
          'QR code menus let diners access your full menu on their smartphones without waiting for a physical copy. Place the QR code on table tents, window stickers, or receipts to give instant access to your latest offerings.',
          'Updating your menu no longer requires reprinting. Change prices, add seasonal specials, or remove sold-out items — the QR code always points to the current version.',
        ],
      },
      {
        heading: 'How to Create a Restaurant Menu QR Code',
        paragraphs: [
          'Upload your menu as a PDF or link to your existing menu page, then generate a QR code with QRCraft. Customize the colors to match your brand and download as PNG for print or SVG for digital use.',
          'No signup is required for a static menu link. For dynamic QR codes that let you change the destination URL later, create a free account.',
        ],
      },
      {
        heading: 'Best Practices for Placement',
        paragraphs: [
          'Place QR codes at eye level on table tops, on A-frame signs near the entrance, and on your takeaway packaging. Ensure good lighting so phone cameras can scan quickly.',
          'Add a short instruction like "Scan for our menu" beneath the QR code for guests unfamiliar with the technology.',
        ],
      },
    ],
  },
  {
    slug: 'business-cards',
    title: 'QR Codes for Business Cards',
    excerpt: 'Add a QR code to your business card that shares your contact info instantly. Free to generate.',
    keywords: ['qr code for business card', 'business card qr code', 'vcard qr code generator'],
    body: [
      {
        heading: 'Turn Your Business Card into a Digital Contact',
        paragraphs: [
          'A QR code on your business card lets recipients save your contact details with a single scan — no manual typing required. The QR code encodes a vCard with your name, phone, email, company, and website.',
          'Unlike NFC chips, QR codes work on every smartphone without a special app or setting change. All major iOS and Android camera apps can scan them natively.',
        ],
      },
      {
        heading: 'What to Include in Your Business Card QR Code',
        paragraphs: [
          "Use QRCraft's vCard tab to add your name, job title, company, work phone, personal email, address, website, and LinkedIn profile. All fields are optional — include only what you want to share.",
          'For maximum compatibility, QRCraft generates vCard 3.0 format, which is supported by iOS Contacts, Android Contacts, Outlook, and Google Contacts.',
        ],
      },
      {
        heading: 'Design Tips for Business Card QR Codes',
        paragraphs: [
          'Keep at least 3mm of white space around the QR code to ensure reliable scanning. A minimum printed size of 2cm × 2cm is recommended.',
          'You can customize dot shapes and colors to match your card design. Avoid backgrounds with low contrast against the QR code dots.',
        ],
      },
    ],
  },
  {
    slug: 'product-packaging',
    title: 'QR Codes for Product Packaging',
    excerpt: 'Link product packaging to instructions, warranties, or your website with a custom QR code.',
    keywords: ['qr code for product packaging', 'packaging qr code', 'product label qr code'],
    body: [
      {
        heading: 'Extend Your Packaging with Digital Content',
        paragraphs: [
          'Product packaging has limited space. A QR code bridges the gap between physical labels and digital content — link buyers to assembly instructions, how-to videos, warranty registration forms, or your product website.',
          'QR codes on packaging also enable post-purchase engagement. Point customers to a review page, a support form, or a loyalty program signup after they receive their order.',
        ],
      },
      {
        heading: 'Common Packaging QR Code Use Cases',
        paragraphs: [
          'Assembly instructions: Link to a video or PDF guide instead of cramming a multi-step diagram on a small box.',
          'Warranty registration: Replace paper warranty cards with a digital form that auto-fills the purchase date.',
          'Ingredient or nutrition details: Expand on the mandatory label with full sourcing and allergen information.',
        ],
      },
      {
        heading: 'Printing QR Codes on Packaging',
        paragraphs: [
          'Download your QR code as SVG for print — vector format ensures sharp reproduction at any size without pixelation. For embossed or foil printing, consult your printer about minimum line weights.',
          'Test the QR code at the final printed size before your full production run. Scan from a distance of 20–30cm under normal store lighting.',
        ],
      },
    ],
  },
  {
    slug: 'event-invitations',
    title: 'QR Codes for Event Invitations',
    excerpt: 'Add a QR code to invitations so guests can RSVP or find event details instantly.',
    keywords: ['qr code for event invitation', 'event rsvp qr code', 'invitation qr code generator'],
    body: [
      {
        heading: 'Simplify RSVPs and Event Access',
        paragraphs: [
          'Adding a QR code to a printed or digital invitation lets guests RSVP in seconds — scan, tap the link, and submit. No need to type a long URL or search for the event page.',
          'QR codes also work as digital tickets. Scan at the venue entrance for a contactless check-in that replaces paper guest lists.',
        ],
      },
      {
        heading: 'What to Link Your Event QR Code To',
        paragraphs: [
          'Link to an RSVP form (Google Forms, Typeform, or your own), a calendar invite (.ics file), your event website, or an Eventbrite / Luma page.',
          'For recurring events, use a dynamic QR code so you can update the destination URL for each event without reprinting invitations.',
        ],
      },
      {
        heading: 'Design Ideas for Event Invitations',
        paragraphs: [
          'Match the QR code color scheme to the event branding. For a wedding, use gold or blush tones. For a corporate event, use brand colors.',
          'Place the QR code on the back of the invitation with a short call to action: "RSVP by scanning" or "View full schedule." Keep the front of the invitation clean.',
        ],
      },
    ],
  },
  {
    slug: 'wifi-sharing',
    title: 'QR Codes for WiFi Sharing',
    excerpt: 'Let guests connect to WiFi by scanning a QR code — no passwords to type.',
    keywords: ['qr code for wifi', 'wifi qr code generator', 'share wifi with qr code'],
    body: [
      {
        heading: 'Share WiFi Without Giving Out Your Password',
        paragraphs: [
          'A WiFi QR code encodes your network name (SSID), password, and security type. When a guest scans it, their phone prompts them to join the network automatically — no password to read out loud or type.',
          'This is especially useful for cafes, hotels, Airbnbs, and offices. Print the QR code on a table card or frame it near the entrance.',
        ],
      },
      {
        heading: 'How to Generate a WiFi QR Code',
        paragraphs: [
          'Select the WiFi tab in QRCraft, enter your SSID and password, and choose your security type (WPA/WPA2 is the most common). Your QR code is generated instantly.',
          'The password is encoded directly in the QR code — it is not stored on any server. Static QR codes are generated entirely in your browser.',
        ],
      },
      {
        heading: 'Tips for Reliable WiFi QR Codes',
        paragraphs: [
          'If your WiFi password contains special characters, test the QR code on multiple devices before printing. Some special characters occasionally cause parsing issues on older Android versions.',
          'Change your WiFi password periodically for security. If you use a static QR code, you will need to regenerate it after a password change. A dynamic QR code lets you update the target URL without reprinting.',
        ],
      },
    ],
  },
  {
    slug: 'social-media',
    title: 'QR Codes for Social Media Profiles',
    excerpt: 'Direct followers to your social profiles or link-in-bio page with a custom QR code.',
    keywords: ['qr code for social media', 'instagram qr code', 'link in bio qr code'],
    body: [
      {
        heading: 'Turn Print into Social Followers',
        paragraphs: [
          'A social media QR code bridges offline and online: print it on flyers, packaging, or signage, and anyone who scans it lands on your Instagram, TikTok, YouTube, or link-in-bio page immediately.',
          'No more hoping people remember to search for your handle. A scannable link is always faster than manual search.',
        ],
      },
      {
        heading: 'What to Link Your Social QR Code To',
        paragraphs: [
          'Direct links to individual profiles work well for single-platform campaigns. For multi-platform presence, link to a Linktree, Beacons, or similar link-in-bio page that aggregates all your profiles.',
          'For brand accounts, link to a landing page rather than a social profile — this gives you analytics and a controlled first impression.',
        ],
      },
      {
        heading: 'Where to Place Social Media QR Codes',
        paragraphs: [
          'Retail stores: window display, packaging, and fitting room signage. Restaurants: table cards and menus. Events: speaker nametags, stage backdrops, and printed programs.',
          'Always add a short prompt near the QR code: "Follow us on Instagram" or "See all our links." A call to action increases scan rates significantly.',
        ],
      },
    ],
  },
];
