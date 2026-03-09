// src/data/faq.ts

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How do I create a QR code for free?',
    answer:
      'Visit QRCraft, enter your URL or text, customize your QR code style and colors, then download it as PNG or SVG — completely free, no account required.',
  },
  {
    question: 'What types of QR codes can I create?',
    answer:
      'QRCraft supports four content types: URL/website links, plain text, WiFi credentials (SSID and password), and vCard contact information.',
  },
  {
    question: 'Can I add a logo or image to my QR code?',
    answer:
      'Yes. Upload a local image file and QRCraft embeds it in the center of your QR code, automatically raising the error correction level to H to ensure the code remains scannable.',
  },
  {
    question: 'Are QR codes created with QRCraft free to use commercially?',
    answer:
      'Yes. All QR codes generated on QRCraft are free to use for personal or commercial purposes with no restrictions.',
  },
  {
    question: 'What file formats can I download my QR code in?',
    answer:
      'QRCraft supports high-resolution PNG (3× scale, print-ready) and true vector SVG (paths, not a raster image wrapper) for unlimited scalability.',
  },
  {
    question: 'Do I need to create an account to use QRCraft?',
    answer:
      'No. QRCraft is fully free and requires no signup or account. Generate, customize, and download QR codes instantly.',
  },
];
