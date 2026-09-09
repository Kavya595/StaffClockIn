import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarHeart, LayoutGrid, List } from "lucide-react";
import Card from "../components/common/Card";
import EmptyState from "../components/common/EmptyState";
import { useHolidays } from "../hooks/useHolidays";
import { getMonthMatrix, todayISO, formatDisplayDate } from "../utils/dateUtils";
import { HOLIDAY_TYPE_LABELS, HOLIDAY_TYPE_COLORS } from "../constants/storageKeys";
import * as holidayService from "../services/holidayService";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function HolidayDot({ type }) {
  const c = HOLIDAY_TYPE_COLORS[type] || HOLIDAY_TYPE_COLORS.public;
  return <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />;
}

function HolidayBadge({ type }) {
  const c = HOLIDAY_TYPE_COLORS[type] || HOLIDAY_TYPE_COLORS.public;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <HolidayDot type={type} />
      {HOLIDAY_TYPE_LABELS[type] || type}
    </span>
  );
}

export default function HolidayCalendar() {
  useHolidays(); // subscribes so this page re-renders if holidays change elsewhere
  const [view, setView] = useState("month"); // "month" | "list"
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const today = todayISO();

  const monthHolidays = useMemo(
    () => holidayService.getHolidaysForMonth(cursor.year, cursor.month),
    [cursor]
  );
  const holidaysByDate = useMemo(() => {
    const map = {};
    monthHolidays.forEach((h) => { (map[h.occursOn] = map[h.occursOn] || []).push(h); });
    return map;
  }, [monthHolidays]);

  const weeks = useMemo(() => getMonthMatrix(cursor.year, cursor.month), [cursor]);

  const yearHolidays = useMemo(() => holidayService.getHolidaysForYear(cursor.year), [cursor.year]);

  function shiftMonth(delta) {
    setCursor((c) => {
      let month = c.month + delta;
      let year = c.year;
      if (month < 0) { month = 11; year -= 1; }
      if (month > 11) { month = 0; year += 1; }
      return { year, month };
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Telugu Festival &amp; Holiday Calendar</h1>
          <p className="text-sm text-ink-400">Telugu festivals, national holidays, freedom fighters &amp; regional observances</p>
        </div>
        <div className="inline-flex rounded-card border border-ink-200 bg-white p-1 self-start">
          <button
            onClick={() => setView("month")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-colors ${view === "month" ? "bg-ink text-paper" : "text-ink-500 hover:text-ink"}`}
          >
            <LayoutGrid size={13} /> Month
          </button>
          <button
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-colors ${view === "list" ? "bg-ink text-paper" : "text-ink-500 hover:text-ink"}`}
          >
            <List size={13} /> List
          </button>
        </div>
      </div>

      {view === "month" ? (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => shiftMonth(-1)} className="p-2 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display font-semibold text-sm text-ink">{MONTH_NAMES[cursor.month]} {cursor.year}</h2>
            <button onClick={() => shiftMonth(1)} className="p-2 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] font-medium text-ink-400 uppercase py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((cell) => {
              const dayHolidays = holidaysByDate[cell.iso] || [];
              const isToday = cell.iso === today;
              return (
                <div
                  key={cell.iso}
                  className={`min-h-[64px] rounded-card border p-1.5 flex flex-col gap-1 ${
                    cell.inMonth ? "border-ink-100 bg-white" : "border-transparent bg-ink-50/40"
                  } ${isToday ? "ring-2 ring-brass/40" : ""}`}
                >
                  <span className={`text-[11px] tabular ${cell.inMonth ? "text-ink-500" : "text-ink-300"}`}>{cell.date.getDate()}</span>
                  <div className="flex flex-col gap-0.5">
                    {dayHolidays.slice(0, 2).map((h) => (
                      <span
                        key={h.id}
                        title={h.name}
                        className={`text-[9px] leading-tight rounded px-1 py-0.5 truncate ${HOLIDAY_TYPE_COLORS[h.type]?.bg || "bg-ink-100"} ${HOLIDAY_TYPE_COLORS[h.type]?.text || "text-ink-500"}`}
                      >
                        {h.name}
                      </span>
                    ))}
                    {dayHolidays.length > 2 && (
                      <span className="text-[9px] text-ink-400">+{dayHolidays.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-4 sm:p-5">
          {yearHolidays.length === 0 ? (
            <EmptyState icon={CalendarHeart} title="No holidays yet" message="Holidays added in Settings will appear here." />
          ) : (
            <ul className="divide-y divide-ink-50">
              {yearHolidays.map((h) => (
                <li key={h.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{h.name}</p>
                    {h.description && <p className="text-xs text-ink-400 mt-0.5">{h.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-ink-500 tabular">{formatDisplayDate(h.occursOn)}</span>
                    <HolidayBadge type={h.type} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
