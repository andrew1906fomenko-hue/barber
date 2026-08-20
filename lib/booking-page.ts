export type SocialLinks = {
  instagram?: string;
  telegram?: string;
  vk?: string;
  website?: string;
};

export type VisibleSections = {
  cover: boolean;
  avatar: boolean;
  description: boolean;
  masterComment: boolean;
  address: boolean;
  contacts: boolean;
  socials: boolean;
  services: boolean;
  serviceImages: boolean;
  serviceCards: boolean;
  dateWheel: boolean;
  dateCalendar: boolean;
  serviceCardStyle: "stack" | "spotlight" | "wheel" | "grid" | "feature";
  headingMode: "friendly" | "classic" | "minimal";
  accentMode: "default" | "current" | "black" | "rose" | "blue" | "violet" | "custom";
};

export type RequiredFields = {
  name: boolean;
  phone: boolean;
  email: boolean;
  telegram: boolean;
};

export const defaultVisibleSections: VisibleSections = {
  cover: true,
  avatar: true,
  description: true,
  masterComment: true,
  address: true,
  contacts: true,
  socials: true,
  services: true,
  serviceImages: false,
  serviceCards: false,
  dateWheel: false,
  dateCalendar: false,
  serviceCardStyle: "stack",
  headingMode: "friendly",
  accentMode: "default",
};

export const defaultRequiredFields: RequiredFields = {
  name: true,
  phone: true,
  email: false,
  telegram: false,
};

const colorPattern = /^#[0-9a-f]{6}$/i;
const timeZonePattern = /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/;

const cleanText = (value: unknown, max = 300) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanUrl = (value: unknown) => {
  const text = cleanText(value, 500);
  if (!text) return "";
  if (/^(https?:\/\/|tg:\/\/|mailto:|tel:)/i.test(text)) return text;
  return "";
};

const cleanColor = (value: unknown, fallback: string) => {
  const text = cleanText(value, 16);
  return colorPattern.test(text) ? text.toUpperCase() : fallback;
};

const cleanPositiveInt = (value: unknown, fallback: number, min: number, max: number) => {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, Math.round(next)));
};

const cleanPosition = (value: unknown) => cleanPositiveInt(value, 50, 0, 100);
const cleanHeadingMode = (value: unknown): VisibleSections["headingMode"] =>
  value === "classic" || value === "minimal" || value === "friendly" ? value : "friendly";
const cleanAccentMode = (value: unknown): VisibleSections["accentMode"] =>
  value === "default" || value === "current" || value === "black" || value === "rose" || value === "blue" || value === "violet" || value === "custom" ? value : "default";
const cleanServiceCardStyle = (value: unknown): VisibleSections["serviceCardStyle"] =>
  value === "spotlight" || value === "wheel" || value === "grid" || value === "feature" ? value : "stack";

export function sanitizeBookingPageSettings(body: Record<string, unknown>) {
  const rawSocials = typeof body.socialLinks === "object" && body.socialLinks ? (body.socialLinks as Record<string, unknown>) : {};
  const rawVisible = typeof body.visibleSections === "object" && body.visibleSections ? (body.visibleSections as Record<string, unknown>) : {};
  const rawRequired = typeof body.requiredFields === "object" && body.requiredFields ? (body.requiredFields as Record<string, unknown>) : {};
  const timezone = cleanText(body.timezone, 80);

  return {
    notes: cleanText(body.notes, 900),
    profession: cleanText(body.profession, 120),
    description: cleanText(body.description, 900),
    city: cleanText(body.city, 120),
    address: cleanText(body.address, 220),
    isOnline: body.isOnline === true,
    phone: cleanText(body.phone, 80),
    contactLink: cleanUrl(body.contactLink),
    socialLinks: {
      instagram: cleanUrl(rawSocials.instagram),
      telegram: cleanUrl(rawSocials.telegram),
      vk: cleanUrl(rawSocials.vk),
      website: cleanUrl(rawSocials.website),
    },
    coverPositionX: cleanPosition(body.coverPositionX),
    coverPositionY: cleanPosition(body.coverPositionY),
    timezone: timeZonePattern.test(timezone) ? timezone : "Europe/Moscow",
    primaryColor: cleanColor(body.primaryColor, "#0F766E"),
    buttonColor: cleanColor(body.buttonColor, "#0F766E"),
    ctaText: cleanText(body.ctaText, 80) || "Записаться",
    visibleSections: {
      cover: rawVisible.cover !== false,
      avatar: rawVisible.avatar !== false,
      description: rawVisible.description !== false,
      masterComment: rawVisible.masterComment !== false,
      address: rawVisible.address !== false,
      contacts: rawVisible.contacts !== false,
      socials: rawVisible.socials !== false,
      services: true,
      serviceImages: rawVisible.serviceImages === true,
      serviceCards: rawVisible.serviceCards === true,
      dateWheel: rawVisible.dateWheel === true && rawVisible.dateCalendar !== true,
      dateCalendar: rawVisible.dateCalendar === true,
      serviceCardStyle: cleanServiceCardStyle(rawVisible.serviceCardStyle),
      headingMode: cleanHeadingMode(rawVisible.headingMode),
      accentMode: cleanAccentMode(rawVisible.accentMode),
    },
    requiredFields: {
      name: true,
      phone: rawRequired.phone !== false,
      email: rawRequired.email === true,
      telegram: rawRequired.telegram === true,
    },
    showPrice: body.showPrice !== false,
    maxBookingDaysAhead: cleanPositiveInt(body.maxBookingDaysAhead, 14, 1, 365),
  };
}

type BookingSettingsSource = Record<string, unknown>;

const readText = (source: BookingSettingsSource, key: string) =>
  typeof source[key] === "string" ? source[key] : "";

const readRecord = <T extends Record<string, unknown>>(source: BookingSettingsSource, key: string) =>
  typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key]) ? (source[key] as T) : undefined;

export const mapBookingSettings = (master: BookingSettingsSource) => ({
  notes: readText(master, "notes"),
  profession: readText(master, "profession"),
  description: readText(master, "description"),
  city: readText(master, "city"),
  address: readText(master, "address"),
  isOnline: Boolean(master.is_online ?? master.isOnline),
  phone: readText(master, "phone"),
  contactLink: readText(master, "contact_link") || readText(master, "contactLink"),
  socialLinks: readRecord<Record<string, string>>(master, "social_links") || readRecord<Record<string, string>>(master, "socialLinks") || {},
  coverImageUrl: readText(master, "cover_image_url") || readText(master, "coverImageUrl"),
  avatarUrl: readText(master, "avatar_url") || readText(master, "avatarUrl"),
  coverPositionX: cleanPosition(master.cover_position_x ?? master.coverPositionX),
  coverPositionY: cleanPosition(master.cover_position_y ?? master.coverPositionY),
  timezone: readText(master, "timezone") || "Europe/Moscow",
  primaryColor: readText(master, "primary_color") || readText(master, "primaryColor") || "#0F766E",
  buttonColor: readText(master, "button_color") || readText(master, "buttonColor") || "#0F766E",
  ctaText: master.cta_text || master.ctaText || "Записаться",
  visibleSections: (() => {
    const storedVisibleSections = readRecord<Record<string, unknown>>(master, "visible_sections") || readRecord<Record<string, unknown>>(master, "visibleSections") || {};
    return {
    cover: storedVisibleSections.cover !== false,
    avatar: storedVisibleSections.avatar !== false,
    description: storedVisibleSections.description !== false,
    masterComment: storedVisibleSections.masterComment !== false,
    address: storedVisibleSections.address !== false,
    contacts: storedVisibleSections.contacts !== false,
    socials: storedVisibleSections.socials !== false,
    services: true,
    serviceImages: storedVisibleSections.serviceImages === true,
    serviceCards: storedVisibleSections.serviceCards === true,
    dateWheel: storedVisibleSections.dateWheel === true && storedVisibleSections.dateCalendar !== true,
    dateCalendar: storedVisibleSections.dateCalendar === true,
    serviceCardStyle: cleanServiceCardStyle(storedVisibleSections.serviceCardStyle),
    headingMode: cleanHeadingMode(storedVisibleSections.headingMode),
    accentMode: cleanAccentMode(storedVisibleSections.accentMode),
    };
  })(),
  requiredFields: {
    ...defaultRequiredFields,
    ...(readRecord<Record<string, boolean>>(master, "required_fields") || readRecord<Record<string, boolean>>(master, "requiredFields") || {}),
  },
  showPrice: master.show_price ?? master.showPrice ?? true,
  maxBookingDaysAhead: Number(master.max_booking_days_ahead ?? master.maxBookingDaysAhead) || 14,
});
