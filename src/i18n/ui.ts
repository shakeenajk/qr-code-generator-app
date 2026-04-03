// src/i18n/ui.ts
// Translation dictionaries for en, es, fr, de
// Source: https://docs.astro.build/en/recipes/i18n/

export const languages = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
} as const;

export const defaultLang = 'en';

export const ui = {
  en: {
    // Meta
    'meta.homeTitle': 'Free QR Code Generator — QRCraft',
    'meta.homeDescription':
      'Create custom QR codes for URLs, WiFi, contact cards, and text. Download as PNG or SVG instantly. Free, no signup required.',
    'meta.pricingTitle': 'Pricing — QRCraft',
    'meta.pricingDescription':
      'Free QR code generator with Pro plans from $3.99/mo. Save QR codes, unlock dynamic QR codes and analytics.',
    'meta.usecasesTitle': 'QR Code Use Cases — QRCraft',
    'meta.usecasesDescription':
      'Discover how to use QR codes for restaurant menus, business cards, product packaging, events, and more. Free QR code generator.',

    // Nav
    'nav.pricing': 'Pricing',
    'nav.usecases': 'Use Cases',
    'nav.signup': 'Sign Up',
    'nav.signin': 'Sign In',
    'nav.dashboard': 'Dashboard',

    // Hero
    'hero.title': 'Free QR Code Generator',
    'hero.subtitle':
      'Create custom QR codes for URLs, text, WiFi, and contact cards. No signup required — download as PNG or SVG instantly.',
    'hero.proNote': 'Free forever',
    'hero.proLink': 'Pro from $3.99/mo',
    'hero.proSuffix': '— dynamic QR codes & analytics',

    // Features section
    'features.heading': 'Everything You Need',
    'features.f1.title': 'Four Content Types',
    'features.f1.desc': 'URLs, plain text, WiFi credentials, and vCard contacts — all supported.',
    'features.f2.title': 'Full Customization',
    'features.f2.desc': 'Choose dot shapes, eye styles, colors, and gradients to match your brand.',
    'features.f3.title': 'Logo Embedding',
    'features.f3.desc': 'Upload your logo and embed it in the center of your QR code.',
    'features.f4.title': 'PNG & SVG Export',
    'features.f4.desc': 'Download print-ready PNG at 3× resolution or true vector SVG.',
    'features.f5.title': 'Instant Preview',
    'features.f5.desc': 'Every change reflects live in the preview — no form submission needed.',
    'features.f6.title': 'No Signup Required',
    'features.f6.desc': 'Completely free. No account, no data stored, no friction.',

    // How-To section
    'howto.heading': 'How to Create a QR Code in 3 Steps',
    'howto.step1.heading': 'Choose your content type',
    'howto.step1.desc': 'Enter a URL, text, WiFi credentials, or contact details.',
    'howto.step2.heading': 'Customize the design',
    'howto.step2.desc': 'Pick colors, dot shapes, and embed your logo.',
    'howto.step3.heading': 'Download instantly',
    'howto.step3.desc': 'Export as PNG or SVG — no account needed.',

    // Pricing promo section
    'pricingpromo.heading': 'When do you need a paid plan?',
    'pricingpromo.bullet1': 'Save and manage up to 100 QR codes (Starter) or 250 QR codes (Pro)',
    'pricingpromo.bullet2': 'Create dynamic QR codes — change the destination URL without reprinting',
    'pricingpromo.bullet3': 'Track scan analytics — see when, where, and how often your QR codes are scanned',
    'pricingpromo.bullet4': 'Priority support and higher dynamic QR limits for professional use',
    'pricingpromo.seeDetails': 'See full pricing details →',
    'pricingpromo.freeTierLabel': 'Free',
    'pricingpromo.freeTierDesc': '5 saved QR codes',
    'pricingpromo.freeTierSub': '3 dynamic QR codes · Basic analytics',
    'pricingpromo.paidTierLabel': 'Starter / Pro',
    'pricingpromo.paidTierDesc': '100–250 saved QR codes',
    'pricingpromo.paidTierSub': '10–100 dynamic QR codes · Full analytics',
    'pricingpromo.ctaFree': 'Get started free',
    'pricingpromo.ctaPro': 'Explore Pro',

    // Use Cases teaser section
    'usecases.heading': 'QR Codes for Every Use Case',
    'usecases.subheading': 'From restaurant menus to business cards — see how QR codes work for you.',
    'usecases.viewAll': 'View all use cases',
    'usecases.teaser.restaurant': 'Restaurant Menus',
    'usecases.teaser.restaurant.desc': 'Link customers to your digital menu.',
    'usecases.teaser.business': 'Business Cards',
    'usecases.teaser.business.desc': 'Share contact details with a single scan.',
    'usecases.teaser.product': 'Product Packaging',
    'usecases.teaser.product.desc': 'Connect buyers to instructions or warranty info.',
    'usecases.teaser.event': 'Event Invitations',
    'usecases.teaser.event.desc': 'Link attendees to event details or RSVP pages.',
    'usecases.teaser.wifi': 'WiFi Sharing',
    'usecases.teaser.wifi.desc': 'Let guests connect without typing a password.',
    'usecases.teaser.social': 'Social Media Profiles',
    'usecases.teaser.social.desc': 'Point followers to your link-in-bio page.',

    // Use Cases index page
    'usecases.page.heading': 'QR Code Use Cases',
    'usecases.page.subheading':
      'Explore how businesses and individuals use QR codes to connect print and digital experiences.',

    // FAQ
    'faq.heading': 'Frequently Asked Questions',

    // Footer
    'footer.copyright': 'Free to use, no signup required.',
    'footer.faq': 'FAQ',
    'footer.generator': 'Generator',

    // Pricing page
    'pricing.heading': 'Simple, transparent pricing',
    'pricing.subheading': 'Start free, upgrade when you need more.',
    'pricing.toggle.monthly': 'Monthly',
    'pricing.toggle.annual': 'Annual',
    'pricing.toggle.save': 'Save 18%',
    'pricing.free.name': 'Free',
    'pricing.free.tagline': 'Perfect for occasional use',
    'pricing.free.price': '$0',
    'pricing.free.period': 'forever',
    'pricing.free.feat1': '5 QR codes',
    'pricing.free.feat2': '3 dynamic QR codes',
    'pricing.free.feat3': 'PNG download',
    'pricing.free.feat4': 'All content types (URL, WiFi, text, vCard)',
    'pricing.free.feat5': 'Basic dot styles',
    'pricing.free.feat6': 'No account required',
    'pricing.free.cta': 'Start for free',
    'pricing.starter.name': 'Starter',
    'pricing.starter.tagline': 'For regular QR code users',
    'pricing.starter.feat1': '100 QR codes',
    'pricing.starter.feat2': 'PNG + SVG download',
    'pricing.starter.feat3': 'Save QR codes to dashboard',
    'pricing.starter.feat4': '10 dynamic QR codes',
    'pricing.starter.feat5': 'Basic dot styles',
    'pricing.starter.cta': 'Get Starter',
    'pricing.pro.name': 'Pro',
    'pricing.pro.tagline': 'For power users and teams',
    'pricing.pro.badge': 'Most Popular',
    'pricing.pro.feat1': '250 QR codes',
    'pricing.pro.feat2': '100 dynamic QR codes',
    'pricing.pro.feat3': 'Everything in Starter',
    'pricing.pro.feat4': 'Dynamic QR codes with editable URLs',
    'pricing.pro.feat5': 'Scan analytics dashboard',
    'pricing.pro.feat6': 'Top countries + device breakdown',
    'pricing.pro.feat7': 'Custom colors + logo upload',
    'pricing.pro.feat7sub': '(free for everyone)',
    'pricing.pro.cta': 'Get Pro',
    'pricing.smallprint':
      'Custom colors and logo upload are free for all users — accounts not required for static QR generation.',

    // Common
    'common.loading': 'Loading...',
  },

  es: {
    // Meta
    'meta.homeTitle': 'Generador de códigos QR gratuito — QRCraft',
    'meta.homeDescription':
      'Crea códigos QR personalizados para URLs, WiFi, tarjetas de contacto y texto. Descárgalos en PNG o SVG al instante. Gratis, sin registro.',
    'meta.pricingTitle': 'Precios — QRCraft',
    'meta.pricingDescription':
      'Generador de códigos QR gratuito con planes Pro desde $3,99/mes. Guarda códigos QR, activa QR dinámicos y analíticas.',
    'meta.usecasesTitle': 'Casos de uso de códigos QR — QRCraft',
    'meta.usecasesDescription':
      'Descubre cómo usar códigos QR para menús de restaurantes, tarjetas de visita, embalajes de productos, eventos y más.',

    // Nav
    'nav.pricing': 'Precios',
    'nav.usecases': 'Casos de uso',
    'nav.signup': 'Registrarse',
    'nav.signin': 'Iniciar sesión',
    'nav.dashboard': 'Panel',

    // Hero
    'hero.title': 'Generador de códigos QR gratuito',
    'hero.subtitle':
      'Crea códigos QR personalizados para URLs, texto, WiFi y tarjetas de contacto. Sin registro — descarga en PNG o SVG al instante.',
    'hero.proNote': 'Gratis para siempre',
    'hero.proLink': 'Pro desde $3,99/mes',
    'hero.proSuffix': '— códigos QR dinámicos y analíticas',

    // Features section
    'features.heading': 'Todo lo que necesitas',
    'features.f1.title': 'Cuatro tipos de contenido',
    'features.f1.desc': 'URLs, texto plano, credenciales WiFi y contactos vCard — todo compatible.',
    'features.f2.title': 'Personalización total',
    'features.f2.desc': 'Elige formas de puntos, estilos de esquinas, colores y degradados para tu marca.',
    'features.f3.title': 'Incrustación de logotipo',
    'features.f3.desc': 'Sube tu logotipo y colócalo en el centro de tu código QR.',
    'features.f4.title': 'Exportación PNG y SVG',
    'features.f4.desc': 'Descarga PNG listo para impresión a 3× resolución o SVG vectorial.',
    'features.f5.title': 'Vista previa instantánea',
    'features.f5.desc': 'Cada cambio se refleja en vivo en la vista previa — sin enviar formularios.',
    'features.f6.title': 'Sin registro requerido',
    'features.f6.desc': 'Completamente gratis. Sin cuenta, sin datos almacenados, sin fricciones.',

    // How-To section
    'howto.heading': 'Cómo crear un código QR en 3 pasos',
    'howto.step1.heading': 'Elige tu tipo de contenido',
    'howto.step1.desc': 'Ingresa una URL, texto, credenciales WiFi o datos de contacto.',
    'howto.step2.heading': 'Personaliza el diseño',
    'howto.step2.desc': 'Elige colores, formas de puntos e incrusta tu logotipo.',
    'howto.step3.heading': 'Descarga al instante',
    'howto.step3.desc': 'Exporta en PNG o SVG — sin necesidad de cuenta.',

    // Pricing promo section
    'pricingpromo.heading': '¿Cuándo necesitas un plan de pago?',
    'pricingpromo.bullet1': 'Guarda y gestiona hasta 100 códigos QR (Starter) o 250 (Pro)',
    'pricingpromo.bullet2': 'Crea códigos QR dinámicos — cambia la URL de destino sin reimprimir',
    'pricingpromo.bullet3': 'Rastrea analíticas de escaneo — ve cuándo, dónde y con qué frecuencia escanean tus QR',
    'pricingpromo.bullet4': 'Soporte prioritario y más límites de QR dinámicos para uso profesional',
    'pricingpromo.seeDetails': 'Ver detalles de precios →',
    'pricingpromo.freeTierLabel': 'Gratis',
    'pricingpromo.freeTierDesc': '5 códigos QR guardados',
    'pricingpromo.freeTierSub': '3 QR dinámicos · Analíticas básicas',
    'pricingpromo.paidTierLabel': 'Starter / Pro',
    'pricingpromo.paidTierDesc': '100–250 códigos QR guardados',
    'pricingpromo.paidTierSub': '10–100 QR dinámicos · Analíticas completas',
    'pricingpromo.ctaFree': 'Empezar gratis',
    'pricingpromo.ctaPro': 'Ver Pro',

    // Use Cases teaser section
    'usecases.heading': 'Códigos QR para cada caso de uso',
    'usecases.subheading': 'De menús de restaurante a tarjetas de visita — descubre cómo los QR funcionan para ti.',
    'usecases.viewAll': 'Ver todos los casos de uso',
    'usecases.teaser.restaurant': 'Menús de restaurante',
    'usecases.teaser.restaurant.desc': 'Dirige a tus clientes a tu menú digital.',
    'usecases.teaser.business': 'Tarjetas de visita',
    'usecases.teaser.business.desc': 'Comparte datos de contacto con un solo escaneo.',
    'usecases.teaser.product': 'Embalaje de producto',
    'usecases.teaser.product.desc': 'Conecta compradores con instrucciones o garantías.',
    'usecases.teaser.event': 'Invitaciones a eventos',
    'usecases.teaser.event.desc': 'Lleva a los asistentes a detalles del evento o páginas RSVP.',
    'usecases.teaser.wifi': 'Compartir WiFi',
    'usecases.teaser.wifi.desc': 'Permite a los invitados conectarse sin escribir la contraseña.',
    'usecases.teaser.social': 'Perfiles en redes sociales',
    'usecases.teaser.social.desc': 'Dirige seguidores a tu página de enlace en bio.',

    // Use Cases index page
    'usecases.page.heading': 'Casos de uso de códigos QR',
    'usecases.page.subheading':
      'Explora cómo empresas e individuos usan los códigos QR para conectar experiencias físicas y digitales.',

    // FAQ
    'faq.heading': 'Preguntas frecuentes',

    // Footer
    'footer.copyright': 'Gratis, sin registro requerido.',
    'footer.faq': 'Preguntas frecuentes',
    'footer.generator': 'Generador',

    // Pricing page
    'pricing.heading': 'Precios simples y transparentes',
    'pricing.subheading': 'Empieza gratis, actualiza cuando necesites más.',
    'pricing.toggle.monthly': 'Mensual',
    'pricing.toggle.annual': 'Anual',
    'pricing.toggle.save': 'Ahorra 18%',
    'pricing.free.name': 'Gratis',
    'pricing.free.tagline': 'Perfecto para uso ocasional',
    'pricing.free.price': '$0',
    'pricing.free.period': 'siempre',
    'pricing.free.feat1': '5 códigos QR',
    'pricing.free.feat2': '3 códigos QR dinámicos',
    'pricing.free.feat3': 'Descarga PNG',
    'pricing.free.feat4': 'Todos los tipos de contenido (URL, WiFi, texto, vCard)',
    'pricing.free.feat5': 'Estilos de puntos básicos',
    'pricing.free.feat6': 'Sin cuenta requerida',
    'pricing.free.cta': 'Empezar gratis',
    'pricing.starter.name': 'Starter',
    'pricing.starter.tagline': 'Para usuarios habituales de códigos QR',
    'pricing.starter.feat1': '100 códigos QR',
    'pricing.starter.feat2': 'Descarga PNG + SVG',
    'pricing.starter.feat3': 'Guarda QR en tu panel',
    'pricing.starter.feat4': '10 códigos QR dinámicos',
    'pricing.starter.feat5': 'Estilos de puntos básicos',
    'pricing.starter.cta': 'Obtener Starter',
    'pricing.pro.name': 'Pro',
    'pricing.pro.tagline': 'Para usuarios avanzados y equipos',
    'pricing.pro.badge': 'Más popular',
    'pricing.pro.feat1': '250 códigos QR',
    'pricing.pro.feat2': '100 códigos QR dinámicos',
    'pricing.pro.feat3': 'Todo lo del plan Starter',
    'pricing.pro.feat4': 'Códigos QR dinámicos con URLs editables',
    'pricing.pro.feat5': 'Panel de analíticas de escaneo',
    'pricing.pro.feat6': 'Principales países + desglose por dispositivo',
    'pricing.pro.feat7': 'Colores personalizados + subida de logotipo',
    'pricing.pro.feat7sub': '(gratis para todos)',
    'pricing.pro.cta': 'Obtener Pro',
    'pricing.smallprint':
      'Los colores personalizados y la subida de logotipo son gratuitos para todos — no se requiere cuenta para generar QR estáticos.',

    // Common
    'common.loading': 'Cargando...',
  },

  fr: {
    // Meta
    'meta.homeTitle': 'Générateur de QR code gratuit — QRCraft',
    'meta.homeDescription':
      'Créez des QR codes personnalisés pour les URLs, le WiFi, les cartes de contact et le texte. Téléchargez en PNG ou SVG instantanément. Gratuit, sans inscription.',
    'meta.pricingTitle': 'Tarifs — QRCraft',
    'meta.pricingDescription':
      'Générateur de QR code gratuit avec des plans Pro à partir de 3,99 $/mois. Sauvegardez des QR codes, activez les QR dynamiques et les analyses.',
    'meta.usecasesTitle': 'Cas d\'utilisation des QR codes — QRCraft',
    'meta.usecasesDescription':
      'Découvrez comment utiliser les QR codes pour les menus de restaurant, les cartes de visite, les emballages produits, les événements et plus.',

    // Nav
    'nav.pricing': 'Tarifs',
    'nav.usecases': 'Cas d\'utilisation',
    'nav.signup': 'S\'inscrire',
    'nav.signin': 'Se connecter',
    'nav.dashboard': 'Tableau de bord',

    // Hero
    'hero.title': 'Générateur de QR code gratuit',
    'hero.subtitle':
      'Créez des QR codes personnalisés pour les URLs, le texte, le WiFi et les cartes de contact. Sans inscription — téléchargez en PNG ou SVG instantanément.',
    'hero.proNote': 'Gratuit pour toujours',
    'hero.proLink': 'Pro à partir de 3,99 $/mois',
    'hero.proSuffix': '— QR codes dynamiques & analyses',

    // Features section
    'features.heading': 'Tout ce dont vous avez besoin',
    'features.f1.title': 'Quatre types de contenu',
    'features.f1.desc': 'URLs, texte brut, identifiants WiFi et contacts vCard — tout est pris en charge.',
    'features.f2.title': 'Personnalisation complète',
    'features.f2.desc': 'Choisissez les formes de points, styles de coins, couleurs et dégradés pour votre marque.',
    'features.f3.title': 'Intégration du logo',
    'features.f3.desc': 'Téléchargez votre logo et intégrez-le au centre de votre QR code.',
    'features.f4.title': 'Export PNG et SVG',
    'features.f4.desc': 'Téléchargez un PNG prêt à imprimer en résolution 3× ou un SVG vectoriel.',
    'features.f5.title': 'Aperçu instantané',
    'features.f5.desc': 'Chaque modification s\'affiche en direct dans l\'aperçu — sans soumettre de formulaire.',
    'features.f6.title': 'Sans inscription requise',
    'features.f6.desc': 'Entièrement gratuit. Aucun compte, aucune donnée stockée, aucune friction.',

    // How-To section
    'howto.heading': 'Comment créer un QR code en 3 étapes',
    'howto.step1.heading': 'Choisissez votre type de contenu',
    'howto.step1.desc': 'Saisissez une URL, du texte, des identifiants WiFi ou des coordonnées.',
    'howto.step2.heading': 'Personnalisez le design',
    'howto.step2.desc': 'Choisissez les couleurs, les formes de points et intégrez votre logo.',
    'howto.step3.heading': 'Téléchargez instantanément',
    'howto.step3.desc': 'Exportez en PNG ou SVG — aucun compte nécessaire.',

    // Pricing promo section
    'pricingpromo.heading': 'Quand avez-vous besoin d\'un plan payant ?',
    'pricingpromo.bullet1': 'Sauvegardez et gérez jusqu\'à 100 QR codes (Starter) ou 250 QR codes (Pro)',
    'pricingpromo.bullet2': 'Créez des QR codes dynamiques — modifiez l\'URL de destination sans réimprimer',
    'pricingpromo.bullet3': 'Suivez les analyses de scan — voyez quand, où et à quelle fréquence vos QR codes sont scannés',
    'pricingpromo.bullet4': 'Support prioritaire et limites de QR dynamiques plus élevées pour un usage professionnel',
    'pricingpromo.seeDetails': 'Voir les détails des tarifs →',
    'pricingpromo.freeTierLabel': 'Gratuit',
    'pricingpromo.freeTierDesc': '5 QR codes sauvegardés',
    'pricingpromo.freeTierSub': '3 QR dynamiques · Analyses de base',
    'pricingpromo.paidTierLabel': 'Starter / Pro',
    'pricingpromo.paidTierDesc': '100–250 QR codes sauvegardés',
    'pricingpromo.paidTierSub': '10–100 QR dynamiques · Analyses complètes',
    'pricingpromo.ctaFree': 'Commencer gratuitement',
    'pricingpromo.ctaPro': 'Découvrir Pro',

    // Use Cases teaser section
    'usecases.heading': 'QR codes pour chaque cas d\'utilisation',
    'usecases.subheading': 'Des menus de restaurant aux cartes de visite — voyez comment les QR codes fonctionnent pour vous.',
    'usecases.viewAll': 'Voir tous les cas d\'utilisation',
    'usecases.teaser.restaurant': 'Menus de restaurant',
    'usecases.teaser.restaurant.desc': 'Dirigez vos clients vers votre menu digital.',
    'usecases.teaser.business': 'Cartes de visite',
    'usecases.teaser.business.desc': 'Partagez vos coordonnées en un seul scan.',
    'usecases.teaser.product': 'Emballage produit',
    'usecases.teaser.product.desc': 'Connectez les acheteurs aux instructions ou informations de garantie.',
    'usecases.teaser.event': 'Invitations à des événements',
    'usecases.teaser.event.desc': 'Dirigez les participants vers les détails ou les pages RSVP.',
    'usecases.teaser.wifi': 'Partage WiFi',
    'usecases.teaser.wifi.desc': 'Permettez aux invités de se connecter sans taper le mot de passe.',
    'usecases.teaser.social': 'Profils sur les réseaux sociaux',
    'usecases.teaser.social.desc': 'Redirigez vos abonnés vers votre page de lien en bio.',

    // Use Cases index page
    'usecases.page.heading': 'Cas d\'utilisation des QR codes',
    'usecases.page.subheading':
      'Découvrez comment les entreprises et les particuliers utilisent les QR codes pour relier les expériences physiques et numériques.',

    // FAQ
    'faq.heading': 'Questions fréquemment posées',

    // Footer
    'footer.copyright': 'Gratuit, sans inscription requise.',
    'footer.faq': 'FAQ',
    'footer.generator': 'Générateur',

    // Pricing page
    'pricing.heading': 'Tarification simple et transparente',
    'pricing.subheading': 'Commencez gratuitement, passez à un plan supérieur quand vous en avez besoin.',
    'pricing.toggle.monthly': 'Mensuel',
    'pricing.toggle.annual': 'Annuel',
    'pricing.toggle.save': 'Économisez 18%',
    'pricing.free.name': 'Gratuit',
    'pricing.free.tagline': 'Parfait pour une utilisation occasionnelle',
    'pricing.free.price': '$0',
    'pricing.free.period': 'pour toujours',
    'pricing.free.feat1': '5 QR codes',
    'pricing.free.feat2': '3 QR codes dynamiques',
    'pricing.free.feat3': 'Téléchargement PNG',
    'pricing.free.feat4': 'Tous les types de contenu (URL, WiFi, texte, vCard)',
    'pricing.free.feat5': 'Styles de points de base',
    'pricing.free.feat6': 'Aucun compte requis',
    'pricing.free.cta': 'Commencer gratuitement',
    'pricing.starter.name': 'Starter',
    'pricing.starter.tagline': 'Pour les utilisateurs réguliers de QR codes',
    'pricing.starter.feat1': '100 QR codes',
    'pricing.starter.feat2': 'Téléchargement PNG + SVG',
    'pricing.starter.feat3': 'Sauvegardez des QR codes dans votre tableau de bord',
    'pricing.starter.feat4': '10 QR codes dynamiques',
    'pricing.starter.feat5': 'Styles de points de base',
    'pricing.starter.cta': 'Obtenir Starter',
    'pricing.pro.name': 'Pro',
    'pricing.pro.tagline': 'Pour les utilisateurs avancés et les équipes',
    'pricing.pro.badge': 'Le plus populaire',
    'pricing.pro.feat1': '250 QR codes',
    'pricing.pro.feat2': '100 QR codes dynamiques',
    'pricing.pro.feat3': 'Tout ce qui est inclus dans Starter',
    'pricing.pro.feat4': 'QR codes dynamiques avec URLs modifiables',
    'pricing.pro.feat5': 'Tableau de bord d\'analyse des scans',
    'pricing.pro.feat6': 'Principaux pays + répartition par appareil',
    'pricing.pro.feat7': 'Couleurs personnalisées + upload de logo',
    'pricing.pro.feat7sub': '(gratuit pour tous)',
    'pricing.pro.cta': 'Obtenir Pro',
    'pricing.smallprint':
      'Les couleurs personnalisées et l\'upload de logo sont gratuits pour tous — aucun compte requis pour la génération de QR statiques.',

    // Common
    'common.loading': 'Chargement...',
  },

  de: {
    // Meta
    'meta.homeTitle': 'Kostenloser QR-Code-Generator — QRCraft',
    'meta.homeDescription':
      'Erstellen Sie individuelle QR-Codes für URLs, WLAN, Visitenkarten und Text. Sofort als PNG oder SVG herunterladen. Kostenlos, ohne Anmeldung.',
    'meta.pricingTitle': 'Preise — QRCraft',
    'meta.pricingDescription':
      'Kostenloser QR-Code-Generator mit Pro-Plänen ab 3,99 $/Monat. QR-Codes speichern, dynamische QR-Codes und Analysen freischalten.',
    'meta.usecasesTitle': 'QR-Code-Anwendungsfälle — QRCraft',
    'meta.usecasesDescription':
      'Entdecken Sie, wie QR-Codes für Restaurantmenüs, Visitenkarten, Produktverpackungen, Veranstaltungen und mehr eingesetzt werden.',

    // Nav
    'nav.pricing': 'Preise',
    'nav.usecases': 'Anwendungsfälle',
    'nav.signup': 'Registrieren',
    'nav.signin': 'Anmelden',
    'nav.dashboard': 'Dashboard',

    // Hero
    'hero.title': 'Kostenloser QR-Code-Generator',
    'hero.subtitle':
      'Erstellen Sie individuelle QR-Codes für URLs, Text, WLAN und Visitenkarten. Ohne Anmeldung — sofort als PNG oder SVG herunterladen.',
    'hero.proNote': 'Dauerhaft kostenlos',
    'hero.proLink': 'Pro ab 3,99 $/Monat',
    'hero.proSuffix': '— dynamische QR-Codes & Analysen',

    // Features section
    'features.heading': 'Alles, was Sie brauchen',
    'features.f1.title': 'Vier Inhaltstypen',
    'features.f1.desc': 'URLs, einfacher Text, WLAN-Zugangsdaten und vCard-Kontakte — alles unterstützt.',
    'features.f2.title': 'Vollständige Anpassung',
    'features.f2.desc': 'Wählen Sie Punktformen, Eckenstile, Farben und Verläufe passend zu Ihrer Marke.',
    'features.f3.title': 'Logo-Einbettung',
    'features.f3.desc': 'Laden Sie Ihr Logo hoch und betten Sie es in die Mitte Ihres QR-Codes ein.',
    'features.f4.title': 'PNG- und SVG-Export',
    'features.f4.desc': 'Laden Sie druckfertiges PNG in 3-facher Auflösung oder echtes Vektor-SVG herunter.',
    'features.f5.title': 'Sofortige Vorschau',
    'features.f5.desc': 'Jede Änderung wird live in der Vorschau angezeigt — kein Formular absenden nötig.',
    'features.f6.title': 'Keine Anmeldung erforderlich',
    'features.f6.desc': 'Völlig kostenlos. Kein Konto, keine gespeicherten Daten, kein Aufwand.',

    // How-To section
    'howto.heading': 'QR-Code in 3 Schritten erstellen',
    'howto.step1.heading': 'Inhaltstyp auswählen',
    'howto.step1.desc': 'Geben Sie eine URL, Text, WLAN-Zugangsdaten oder Kontaktdaten ein.',
    'howto.step2.heading': 'Design anpassen',
    'howto.step2.desc': 'Wählen Sie Farben, Punktformen und betten Sie Ihr Logo ein.',
    'howto.step3.heading': 'Sofort herunterladen',
    'howto.step3.desc': 'Als PNG oder SVG exportieren — kein Konto erforderlich.',

    // Pricing promo section
    'pricingpromo.heading': 'Wann benötigen Sie einen kostenpflichtigen Plan?',
    'pricingpromo.bullet1': 'Speichern und verwalten Sie bis zu 100 QR-Codes (Starter) oder 250 QR-Codes (Pro)',
    'pricingpromo.bullet2': 'Erstellen Sie dynamische QR-Codes — ändern Sie die Ziel-URL ohne Neudrucken',
    'pricingpromo.bullet3': 'Scan-Analysen verfolgen — sehen Sie wann, wo und wie oft Ihre QR-Codes gescannt werden',
    'pricingpromo.bullet4': 'Prioritätssupport und höhere Limits für dynamische QR-Codes im professionellen Einsatz',
    'pricingpromo.seeDetails': 'Vollständige Preisdetails anzeigen →',
    'pricingpromo.freeTierLabel': 'Kostenlos',
    'pricingpromo.freeTierDesc': '5 gespeicherte QR-Codes',
    'pricingpromo.freeTierSub': '3 dynamische QR-Codes · Grundlegende Analysen',
    'pricingpromo.paidTierLabel': 'Starter / Pro',
    'pricingpromo.paidTierDesc': '100–250 gespeicherte QR-Codes',
    'pricingpromo.paidTierSub': '10–100 dynamische QR-Codes · Vollständige Analysen',
    'pricingpromo.ctaFree': 'Kostenlos starten',
    'pricingpromo.ctaPro': 'Pro entdecken',

    // Use Cases teaser section
    'usecases.heading': 'QR-Codes für jeden Anwendungsfall',
    'usecases.subheading': 'Von Restaurantmenüs bis zu Visitenkarten — sehen Sie, wie QR-Codes für Sie funktionieren.',
    'usecases.viewAll': 'Alle Anwendungsfälle anzeigen',
    'usecases.teaser.restaurant': 'Restaurantmenüs',
    'usecases.teaser.restaurant.desc': 'Leiten Sie Kunden zu Ihrer digitalen Speisekarte.',
    'usecases.teaser.business': 'Visitenkarten',
    'usecases.teaser.business.desc': 'Teilen Sie Kontaktdaten mit einem einzigen Scan.',
    'usecases.teaser.product': 'Produktverpackungen',
    'usecases.teaser.product.desc': 'Verbinden Sie Käufer mit Anweisungen oder Garantieinformationen.',
    'usecases.teaser.event': 'Veranstaltungseinladungen',
    'usecases.teaser.event.desc': 'Leiten Sie Teilnehmer zu Veranstaltungsdetails oder RSVP-Seiten.',
    'usecases.teaser.wifi': 'WLAN-Teilen',
    'usecases.teaser.wifi.desc': 'Ermöglichen Sie Gästen die Verbindung ohne Passworteingabe.',
    'usecases.teaser.social': 'Social-Media-Profile',
    'usecases.teaser.social.desc': 'Leiten Sie Follower zu Ihrer Link-in-Bio-Seite.',

    // Use Cases index page
    'usecases.page.heading': 'QR-Code-Anwendungsfälle',
    'usecases.page.subheading':
      'Entdecken Sie, wie Unternehmen und Einzelpersonen QR-Codes nutzen, um physische und digitale Erlebnisse zu verbinden.',

    // FAQ
    'faq.heading': 'Häufig gestellte Fragen',

    // Footer
    'footer.copyright': 'Kostenlos nutzbar, keine Anmeldung erforderlich.',
    'footer.faq': 'FAQ',
    'footer.generator': 'Generator',

    // Pricing page
    'pricing.heading': 'Einfache, transparente Preise',
    'pricing.subheading': 'Kostenlos starten, upgraden wenn Sie mehr benötigen.',
    'pricing.toggle.monthly': 'Monatlich',
    'pricing.toggle.annual': 'Jährlich',
    'pricing.toggle.save': '18% sparen',
    'pricing.free.name': 'Kostenlos',
    'pricing.free.tagline': 'Perfekt für gelegentliche Nutzung',
    'pricing.free.price': '$0',
    'pricing.free.period': 'für immer',
    'pricing.free.feat1': '5 QR-Codes',
    'pricing.free.feat2': '3 dynamische QR-Codes',
    'pricing.free.feat3': 'PNG-Download',
    'pricing.free.feat4': 'Alle Inhaltstypen (URL, WLAN, Text, vCard)',
    'pricing.free.feat5': 'Grundlegende Punktstile',
    'pricing.free.feat6': 'Kein Konto erforderlich',
    'pricing.free.cta': 'Kostenlos starten',
    'pricing.starter.name': 'Starter',
    'pricing.starter.tagline': 'Für regelmäßige QR-Code-Nutzer',
    'pricing.starter.feat1': '100 QR-Codes',
    'pricing.starter.feat2': 'PNG + SVG-Download',
    'pricing.starter.feat3': 'QR-Codes im Dashboard speichern',
    'pricing.starter.feat4': '10 dynamische QR-Codes',
    'pricing.starter.feat5': 'Grundlegende Punktstile',
    'pricing.starter.cta': 'Starter holen',
    'pricing.pro.name': 'Pro',
    'pricing.pro.tagline': 'Für Power-User und Teams',
    'pricing.pro.badge': 'Am beliebtesten',
    'pricing.pro.feat1': '250 QR-Codes',
    'pricing.pro.feat2': '100 dynamische QR-Codes',
    'pricing.pro.feat3': 'Alles aus Starter',
    'pricing.pro.feat4': 'Dynamische QR-Codes mit bearbeitbaren URLs',
    'pricing.pro.feat5': 'Scan-Analyse-Dashboard',
    'pricing.pro.feat6': 'Top-Länder + Geräteaufschlüsselung',
    'pricing.pro.feat7': 'Benutzerdefinierte Farben + Logo-Upload',
    'pricing.pro.feat7sub': '(kostenlos für alle)',
    'pricing.pro.cta': 'Pro holen',
    'pricing.smallprint':
      'Benutzerdefinierte Farben und Logo-Upload sind für alle Nutzer kostenlos — kein Konto für die statische QR-Generierung erforderlich.',

    // Common
    'common.loading': 'Wird geladen...',
  },
} as const;

export type UiKeys = keyof (typeof ui)[typeof defaultLang];
