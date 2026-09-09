// Holiday calendar: admin-managed list of holidays (public/company/optional/
// festival/regional), each either a one-off date or a recurring one that
// repeats on the same month/day every year (e.g. public holidays).
import { getData } from "./storageService";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { generateId } from "../utils/idGenerator";
import { toISODate, addDays } from "./../utils/dateUtils";
import { getAllStaff } from "./staffService";
import { syncCollection, persistCollection } from "./sheetsSync";

// Seed calendar: national holidays, Telugu festivals (Telangana/Andhra
// Pradesh Panchangam), and freedom-fighter / national-observance days.
//
// `recurring: true` holidays repeat on the same Gregorian month/day every
// year (Republic Day, Gandhi Jayanti, freedom fighters' birth/death
// anniversaries, etc. — these are fixed-date observances).
//
// `recurring: false` holidays are lunar/luni-solar festivals (Ugadi,
// Sankranti cluster, Vinayaka Chavithi, Dasara, Diwali, etc.) whose
// Gregorian date shifts every year per the Panchangam — seeded here with
// their confirmed 2026 dates. An admin should add next year's dates from
// Settings once the following year's Panchangam is out.
const DEFAULT_HOLIDAYS = [
  // ---- National public holidays (fixed date, recurring) ----
  { id: "hol_seed1", name: "New Year's Day", description: "", type: "public", date: "2025-01-01", recurring: true },
  { id: "hol_seed2", name: "Independence Day", description: "India's Independence Day", type: "public", date: "2025-08-15", recurring: true },
  { id: "hol_seed3", name: "Founders' Day", description: "Company anniversary", type: "company", date: "2025-03-10", recurring: true },
  { id: "hol_republic_day", name: "Republic Day", description: "Commemorates the adoption of the Constitution of India", type: "public", date: "2025-01-26", recurring: true },
  { id: "hol_gandhi_jayanti", name: "Gandhi Jayanti", description: "Birth anniversary of Mahatma Gandhi, Father of the Nation", type: "public", date: "2025-10-02", recurring: true },

  // ---- Freedom fighters & national observances (fixed date, recurring) ----
  { id: "hol_shastri_punyatithi", name: "Lal Bahadur Shastri Punyatithi", description: "Death anniversary of India's 2nd Prime Minister", type: "observance", date: "2025-01-11", recurring: true },
  { id: "hol_bose_jayanti", name: "Netaji Subhas Chandra Bose Jayanti (Parakram Diwas)", description: "Birth anniversary of Netaji Subhas Chandra Bose", type: "observance", date: "2025-01-23", recurring: true },
  { id: "hol_gandhi_punyatithi", name: "Martyrs' Day (Gandhi Punyatithi)", description: "Death/martyrdom anniversary of Mahatma Gandhi", type: "observance", date: "2025-01-30", recurring: true },
  { id: "hol_shaheed_diwas", name: "Shaheed Diwas – Bhagat Singh, Rajguru & Sukhdev", description: "Martyrdom day of Bhagat Singh, Rajguru and Sukhdev", type: "observance", date: "2025-03-23", recurring: true },
  { id: "hol_ambedkar_jayanti", name: "Dr. B.R. Ambedkar Jayanti", description: "Birth anniversary of Dr. Bhimrao Ramji Ambedkar", type: "observance", date: "2025-04-14", recurring: true },
  { id: "hol_asr_punyatithi", name: "Alluri Sitarama Raju Punyatithi", description: "Death anniversary of the Telugu freedom fighter who led the Rampa Rebellion", type: "observance", date: "2025-05-07", recurring: true },
  { id: "hol_telangana_formation", name: "Telangana State Formation Day", description: "Marks the formation of Telangana state", type: "regional", date: "2025-06-02", recurring: true },
  { id: "hol_asr_jayanti", name: "Alluri Sitarama Raju Jayanti", description: "Birth anniversary of the Telugu freedom fighter who led the Rampa Rebellion", type: "observance", date: "2025-07-04", recurring: true },
  { id: "hol_komaram_bheem", name: "Komaram Bheem Remembrance Day", description: "Death anniversary of the Telangana tribal freedom fighter, known for \"Jal, Jangal, Zameen\"", type: "observance", date: "2025-10-27", recurring: true },
  { id: "hol_patel_jayanti", name: "Sardar Vallabhbhai Patel Jayanti (National Unity Day)", description: "Birth anniversary of Sardar Vallabhbhai Patel", type: "observance", date: "2025-10-31", recurring: true },
  { id: "hol_ap_formation", name: "Andhra Pradesh State Formation Day", description: "Marks the formation of Andhra Pradesh state", type: "regional", date: "2025-11-01", recurring: true },
  { id: "hol_nehru_jayanti", name: "Jawaharlal Nehru Jayanti (Children's Day)", description: "Birth anniversary of India's first Prime Minister", type: "observance", date: "2025-11-14", recurring: true },
  { id: "hol_ambedkar_mahaparinirvan", name: "Dr. B.R. Ambedkar Mahaparinirvan Din", description: "Death anniversary of Dr. Bhimrao Ramji Ambedkar", type: "observance", date: "2025-12-06", recurring: true },
  { id: "hol_potti_sreeramulu", name: "Potti Sreeramulu Punyatithi", description: "Death anniversary of the freedom fighter whose fast led to the formation of Andhra state", type: "observance", date: "2025-12-15", recurring: true },

  // ---- Telugu festivals (Telangana/AP Panchangam — 2026 dates) ----
  { id: "hol_bhogi_2026", name: "Bhogi", description: "First day of the Sankranti festival cluster", type: "festival", date: "2026-01-13", recurring: false },
  { id: "hol_sankranti_2026", name: "Makara Sankranti (Pedda Panduga)", description: "The biggest harvest festival for Telugu households", type: "festival", date: "2026-01-14", recurring: false },
  { id: "hol_kanuma_2026", name: "Kanuma", description: "Third day of Sankranti, honoring cattle and farm animals", type: "festival", date: "2026-01-15", recurring: false },
  { id: "hol_shivaratri_2026", name: "Maha Shivaratri", description: "Festival dedicated to Lord Shiva", type: "festival", date: "2026-02-15", recurring: false },
  { id: "hol_holi_2026", name: "Holi", description: "Festival of colors", type: "festival", date: "2026-03-03", recurring: false },
  { id: "hol_ugadi_2026", name: "Ugadi", description: "Telugu New Year — marks the start of the Telugu Panchangam calendar", type: "festival", date: "2026-03-19", recurring: false },
  { id: "hol_rama_navami_2026", name: "Sri Rama Navami", description: "Celebrates the birth of Lord Rama", type: "festival", date: "2026-03-26", recurring: false },
  { id: "hol_varalakshmi_2026", name: "Varalakshmi Vratam", description: "Puja performed by married women seeking blessings of Goddess Lakshmi", type: "festival", date: "2026-08-21", recurring: false },
  { id: "hol_bonalu_2026", name: "Bonalu", description: "Telangana festival honoring Goddess Mahakali, celebrated through Ashada masam", type: "festival", date: "2026-08-10", recurring: false },
  { id: "hol_janmashtami_2026", name: "Sri Krishna Janmashtami", description: "Celebrates the birth of Lord Krishna", type: "festival", date: "2026-09-04", recurring: false },
  { id: "hol_vinayaka_chavithi_2026", name: "Vinayaka Chavithi", description: "Ganesh Chaturthi — celebrates the birth of Lord Ganesha", type: "festival", date: "2026-09-14", recurring: false },
  { id: "hol_bathukamma_start_2026", name: "Bathukamma Starting Day (Engili Pula Bathukamma)", description: "First day of the nine-day Telangana flower festival", type: "festival", date: "2026-10-11", recurring: false },
  { id: "hol_saddula_bathukamma_2026", name: "Saddula Bathukamma (Durgashtami)", description: "Final day of Bathukamma, coinciding with Durgashtami", type: "festival", date: "2026-10-19", recurring: false },
  { id: "hol_dasara_2026", name: "Vijaya Dasami (Dasara)", description: "Marks the triumph of good over evil — Durga's victory over Mahishasura and Rama's victory over Ravana", type: "festival", date: "2026-10-20", recurring: false },
  { id: "hol_diwali_2026", name: "Deepavali (Diwali)", description: "Festival of lights", type: "festival", date: "2026-11-08", recurring: false },
];

export function getAllHolidays() {
  return getData(STORAGE_KEYS.HOLIDAYS, DEFAULT_HOLIDAYS);
}

// Pulls the shared holiday calendar down from the Sheets backend (when
// configured) into the local cache. Call once on mount — see useHolidays.
export function syncHolidays() {
  return syncCollection(STORAGE_KEYS.HOLIDAYS, DEFAULT_HOLIDAYS);
}

async function saveAll(list) {
  return persistCollection(STORAGE_KEYS.HOLIDAYS, list);
}

export async function addHoliday({ name, description = "", type = "public", date, recurring = false }) {
  const record = {
    id: generateId("hol"),
    name: (name || "").trim(),
    description: description || "",
    type,
    date,
    recurring: !!recurring,
  };
  await saveAll([...getAllHolidays(), record]);
  return record;
}

export async function updateHoliday(id, updates) {
  const list = getAllHolidays();
  const updated = list.map((h) => (h.id === id ? { ...h, ...updates } : h));
  await saveAll(updated);
}

export async function deleteHoliday(id) {
  await saveAll(getAllHolidays().filter((h) => h.id !== id));
}

// Resolves a holiday record to its actual occurrence date in `year`. For a
// recurring holiday this replays its month/day onto that year; for a
// one-off holiday it only "occurs" in the year it was set for.
function occurrenceInYear(holiday, year) {
  const [hYear, month, day] = holiday.date.split("-").map(Number);
  if (holiday.recurring) {
    const d = new Date(year, month - 1, day);
    return toISODate(d);
  }
  return hYear === year ? holiday.date : null;
}

// All holiday occurrences falling within a given year, sorted by date —
// used by the Month/List holiday calendar view.
export function getHolidaysForYear(year) {
  return getAllHolidays()
    .map((h) => ({ ...h, occursOn: occurrenceInYear(h, year) }))
    .filter((h) => h.occursOn)
    .sort((a, b) => a.occursOn.localeCompare(b.occursOn));
}

export function getHolidaysForMonth(year, month) {
  const mm = String(month + 1).padStart(2, "0");
  return getHolidaysForYear(year).filter((h) => h.occursOn.slice(5, 7) === mm);
}

// Remaining holidays in the current calendar month (from today onward) —
// used by the Settings "Upcoming reminders" widget.
export function getUpcomingHolidaysThisMonth() {
  const today = toISODate(new Date());
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  return getHolidaysForMonth(year, month).filter((h) => h.occursOn >= today);
}

// Holidays for the current month plus the following `monthsAhead` months
// (default 2, i.e. current + next + the one after), grouped by month.
// Wraps the year boundary correctly (e.g. Nov -> Dec -> Jan).
export function getHolidaysByUpcomingMonths(monthsAhead = 2) {
  const today = toISODate(new Date());
  const baseYear = Number(today.slice(0, 4));
  const baseMonth = Number(today.slice(5, 7)) - 1;

  const groups = [];
  for (let i = 0; i <= monthsAhead; i++) {
    let month = baseMonth + i;
    let year = baseYear;
    while (month > 11) { month -= 12; year += 1; }
    const holidays = getHolidaysForMonth(year, month).filter((h) => (i === 0 ? h.occursOn >= today : true));
    groups.push({ year, month, holidays });
  }
  return groups;
}

// Upcoming holidays within the next `days` (default 30), spanning a year
// boundary correctly for recurring holidays.
export function getUpcomingHolidays(days = 30) {
  const today = toISODate(new Date());
  const endDate = addDays(today, days);
  const years = new Set([Number(today.slice(0, 4)), Number(endDate.slice(0, 4))]);
  const occurrences = [];
  years.forEach((y) => occurrences.push(...getHolidaysForYear(y)));
  return occurrences
    .filter((h) => h.occursOn >= today && h.occursOn <= endDate)
    .sort((a, b) => a.occursOn.localeCompare(b.occursOn));
}

// Upcoming staff birthdays within the next `days` (default 30), based on
// each staff member's `birthDate` (YYYY-MM-DD, year of birth is ignored).
export function getUpcomingBirthdays(days = 30) {
  const today = toISODate(new Date());
  const endDate = addDays(today, days);
  const years = new Set([Number(today.slice(0, 4)), Number(endDate.slice(0, 4))]);

  return getAllStaff()
    .filter((s) => s.birthDate)
    .map((s) => {
      const [, month, day] = s.birthDate.split("-").map(Number);
      const nextOccurrence = [...years]
        .map((y) => toISODate(new Date(y, month - 1, day)))
        .filter((occ) => occ >= today)
        .sort()[0];
      return { staff: s, occursOn: nextOccurrence };
    })
    .filter((b) => b.occursOn && b.occursOn <= endDate)
    .sort((a, b) => a.occursOn.localeCompare(b.occursOn));
}
