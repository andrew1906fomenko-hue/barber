export type Section =
  | "Главная"
  | "Услуги"
  | "График работы"
  | "Статистика"
  | "Страница записи"
  | "Аналитика"
  | "Финансы"
  | "Клиенты"
  | "Настройки";

export type AppointmentStatus = string;
export type AppointmentTimelineStatus = "past" | "active" | "future";

export type Service = {
  id: string;
  title: string;
  category: string;
  duration: number;
  price: number;
  priceFrom?: boolean;
  description: string;
  preparation: string;
  includedItems: string[];
  materialName: string;
  materialCost: number;
  active: boolean;
  onlineBookingEnabled: boolean;
  calendarColor: string;
  photoUrl?: string;
};

export type ServicePayload = Omit<Partial<Service>, "includedItems"> & {
  includedItems?: string[] | string;
  included_items?: string[] | string;
  material_name?: string;
  material_cost?: number;
  price_from?: boolean;
  photo_url?: string;
  images?: string[];
  photos?: string[];
  is_public?: boolean;
  is_active?: boolean;
  calendar_color?: string;
  duration_min?: number;
};

export type Appointment = {
  id: string;
  date: string;
  time: string;
  client: string;
  phone: string;
  serviceId: string;
  serviceIds?: string[];
  status: AppointmentStatus;
  statusCode?: string;
  archived?: boolean;
  notes?: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  telegramConnected?: boolean;
  telegramUsername?: string;
  telegramConnectedAt?: string;
  visits: number;
  lastVisit: string;
  totalSpent: number;
};

export type BlockedTime = {
  id: string;
  date: string;
  start: string;
  end: string;
  reason: string;
};

export type NotificationItem = {
  id: string;
  kind: "appointment" | "system";
  title: string;
  meta: string;
  date: string;
  time: string;
};

export type FreeSlot = {
  start: string;
  end: string;
};

export type StoryPlatform = "instagram" | "telegram" | "whatsapp";

export type MasterProfile = {
  displayName: string;
  slug: string;
  showOnBookingPage: boolean;
};

export type BookingPageSettings = {
  notes: string;
  profession: string;
  description: string;
  city: string;
  address: string;
  isOnline: boolean;
  phone: string;
  contactLink: string;
  socialLinks: Record<string, string>;
  coverImageUrl: string;
  avatarUrl: string;
  coverPositionX: number;
  coverPositionY: number;
  timezone: string;
  primaryColor: string;
  buttonColor: string;
  ctaText: string;
  visibleSections: Record<string, boolean | string>;
  requiredFields: Record<string, boolean>;
  showPrice: boolean;
  maxBookingDaysAhead: number;
};

export type BreakPeriod = {
  id: string;
  start: string;
  end: string;
};

export type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
  breakEnabled: boolean;
  breakStart: string;
  breakEnd: string;
  breaks?: BreakPeriod[];
};

export type WeeklySchedule = Record<string, DaySchedule>;
export type ScheduleMode = "weekdays" | "cycle";
export type CyclePreset = "all" | "weekdays" | "odd" | "even" | "custom";
export type SchedulePanel = "weekdays" | "individual" | null;
export type SettingsPanel = "account" | "interface" | "analytics" | "finance" | "subscription" | null;

export type ScheduleDayRule = {
  enabled: boolean;
  allDay: boolean;
  start: string;
  end: string;
  breakEnabled: boolean;
  breakStart: string;
  breakEnd: string;
};

export type SchedulePlan = {
  mode: ScheduleMode;
  startDate: string;
  endDate: string;
  selectedWeekdays: number[];
  cyclePreset: CyclePreset;
  customWorkDays: number;
  customOffDays: number;
  dayRule: ScheduleDayRule;
  dateOverrides: Record<string, ScheduleDayRule>;
};

export type StoredIndividualSchedulePlan = {
  startDate: string;
  endDate: string;
  cyclePreset: CyclePreset;
  customWorkDays: number;
  customOffDays: number;
};

export type StoredWeeklyScheduleMetadata = {
  __scheduleMode?: ScheduleMode;
  __individualPlan?: StoredIndividualSchedulePlan;
  __dateOverrides?: Record<string, DaySchedule>;
};

export type CalendarCell = {
  date: string;
  day: number;
  inMonth: boolean;
  rule: ScheduleDayRule;
};

export type CalendarMonth = {
  key: string;
  title: string;
  workingDays: number;
  totalDays: number;
  cells: CalendarCell[];
};

export type AuthSession = {
  id: string;
  email: string;
  name: string;
  slug: string;
};

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  duration_months: number;
  price: number;
  currency: string;
  discount_percent: number;
  is_active: boolean;
};

export type SubscriptionInfo = {
  status: string;
  planName: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStartedAt: string | null;
  currentPeriodEndsAt: string | null;
  daysLeft: number;
  autoRenew: boolean;
  autoRenewPlanId: string | null;
  nextChargeAt: string | null;
  nextChargeAmount: number | null;
  nextChargeCurrency: string;
  hasAccess: boolean;
  autoRenewEnabled: boolean;
};

export type SubscriptionPayment = {
  id: string;
  amount: number;
  currency: string;
  duration_months: number;
  status: string;
  payment_url: string | null;
  created_at: string;
  paid_at: string | null;
  failed_at: string | null;
  failure_message: string | null;
  payment_method_title: string | null;
  receipt_url: string | null;
};
