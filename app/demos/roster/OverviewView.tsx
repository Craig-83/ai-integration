"use client";

import { useState } from "react";
import { PLAN_EVENTS, summariseWeek, type Light, type WeekSummary } from "@/lib/roster/weeks";
import { usePlannedWeeks } from "./planner";
import { addDays, DAY_SHORT, formatDate } from "@/lib/roster/dates";
import { useRoster } from "./store";
import { Icon, money } from "./ui";

const LIGHT_WORD: Record<Light, string> = { green: "Covered", amber: "Warnings", red: "Action needed", grey: "Not rostered" };
const KIND_LABEL = { past: "Completed", current: "This week", planned: "Planned", unrostered: "Draft" } as const;

function weekLabel(start: string) {
  return `${formatDate(start)} to ${formatDate(addDays(start, 6))}`;
}

export function OverviewView({ onOpenRoster }: { onOpenRoster: () => void }) {
  const { state, analysis } = useRoster();
  const [mode, setMode] = useState<"weeks" | "month">("weeks");
  const [open, setOpen] = useState<string | null>(null);

  // Other weeks are rostered in the background by the same engine
  const others = usePlannedWeeks(state);
  const current = summariseWeek(state, analysis, "current");
  const weeks: WeekSummary[] = [...(others.past ? [others.past] : []), current, ...others.ahead];
  const next = others.ahead[0];
  const pending = PLAN_EVENTS.length + 1 - others.ahead.length;

  return (
    <div className="rg-view">
      <div className="rg-glance">
        <GlanceCard title="This week" week={current} onClick={onOpenRoster} cta="Open roster" />
        <GlanceCard title="Next week" week={next} big />
        <GlanceCard title="Week after" week={others.ahead[1]} />
        {!next && <div className="rg-glance-card big rg-pending">Checking next week…</div>}
        {!others.ahead[1] && <div className="rg-glance-card rg-pending">Checking the week after…</div>}
      </div>

      <div className="rg-view-head" style={{ marginTop: 20 }}>
        <div>
          <div className="rg-h1">Coverage at a glance</div>
          <div className="rg-lede">Every clean for the coming weeks, checked against people, rules and budget. Green is covered, amber has warnings, red needs action.</div>
        </div>
        <div className="rg-filters" role="group" aria-label="View">
          <button className="rg-filter" aria-pressed={mode === "weeks"} onClick={() => setMode("weeks")}>
            Weeks
          </button>
          <button className="rg-filter" aria-pressed={mode === "month"} onClick={() => setMode("month")}>
            Month
          </button>
        </div>
      </div>

      {mode === "weeks" ? (
        <div className="rg-weeks">
          {weeks.map((w) => (
            <div key={w.weekStart} className={`rg-week ${w.kind === "current" ? "is-current" : ""}`}>
              <button
                className="rg-week-head"
                onClick={() => (w.kind === "current" ? onOpenRoster() : setOpen(open === w.weekStart ? null : w.weekStart))}
                aria-expanded={w.kind === "current" ? undefined : open === w.weekStart}
              >
                <div className="rg-week-title">
                  <span className={`rg-light ${w.light}`} aria-hidden="true" />
                  <div>
                    <b>{weekLabel(w.weekStart)}</b>
                    <span className="rg-chip" style={{ marginLeft: 8 }}>
                      {KIND_LABEL[w.kind]}
                    </span>
                    <div className="rg-week-headline">{w.headline}</div>
                  </div>
                </div>
                <div className="rg-week-days">
                  {w.days.map((d, i) => (
                    <div key={d.date} className={`rg-daylight ${d.light}`} title={`${DAY_SHORT[i]} ${formatDate(d.date)}: ${LIGHT_WORD[d.light]}${d.issues.length ? `. ${d.issues.join("; ")}` : ""}`}>
                      <span className="rg-daylight-d">{DAY_SHORT[i]}</span>
                      <span className="rg-daylight-n">{formatDate(d.date).split(" ")[0]}</span>
                      <span className="rg-daylight-s">{d.light === "grey" ? "Draft" : `${d.filled}/${d.slots}`}</span>
                    </div>
                  ))}
                </div>
                <div className="rg-week-money num">
                  {w.kind === "unrostered" ? (
                    <span style={{ color: "var(--rg-muted)" }}>{w.hours}h to roster</span>
                  ) : (
                    <>
                      <span style={{ color: w.cost > w.alloc ? "var(--rg-critical)" : "var(--rg-ink)" }}>{money(w.cost)}</span>
                      <small> / {money(w.alloc)}</small>
                    </>
                  )}
                </div>
                <span className="rg-week-go" aria-hidden="true">
                  {w.kind === "current" ? <Icon name="chevron" size={16} /> : null}
                </span>
              </button>
              {open === w.weekStart && (
                <div className="rg-week-detail">
                  {w.notes.length > 0 && (
                    <ul>
                      {w.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {w.days.some((d) => d.issues.length) ? (
                    <div className="rg-week-issues">
                      {w.days.map((d, i) =>
                        d.issues.length ? (
                          <div key={d.date}>
                            <b>
                              {DAY_SHORT[i]} {formatDate(d.date)}:
                            </b>{" "}
                            {d.issues.join("; ")}
                          </div>
                        ) : null,
                      )}
                    </div>
                  ) : (
                    w.kind !== "unrostered" && <div style={{ color: "var(--rg-ok)", fontWeight: 600 }}>Every clean covered by someone cleared to do it.</div>
                  )}
                </div>
              )}
            </div>
          ))}
          {Array.from({ length: Math.max(0, pending) }).map((_, i) => (
            <div key={`p${i}`} className="rg-week rg-pending" aria-hidden="true">
              Rostering a week ahead…
            </div>
          ))}
        </div>
      ) : (
        <MonthGrid weeks={weeks} onOpenRoster={onOpenRoster} currentStart={state.weekStart} />
      )}

      <div className="rg-legend" style={{ borderTop: 0, padding: "14px 2px" }}>
        {(["green", "amber", "red", "grey"] as Light[]).map((l) => (
          <span key={l}>
            <span className={`rg-light ${l}`} style={{ width: 12, height: 12 }} /> {LIGHT_WORD[l]}
          </span>
        ))}
      </div>
    </div>
  );
}

function GlanceCard({ title, week, big, onClick, cta }: { title: string; week?: WeekSummary; big?: boolean; onClick?: () => void; cta?: string }) {
  if (!week) return null;
  const sentence =
    week.light === "green"
      ? `${title} is covered`
      : week.light === "amber"
        ? `${title} is covered, with warnings`
        : week.light === "grey"
          ? `${title} isn't rostered yet`
          : `${title} needs attention`;
  return (
    <div className={`rg-glance-card ${week.light} ${big ? "big" : ""}`}>
      <div className="rg-glance-top">
        <span className={`rg-light ${week.light}`} aria-hidden="true" />
        <span>
          {title} · {weekLabel(week.weekStart)}
        </span>
      </div>
      <div className="rg-glance-sentence">{sentence}</div>
      <div className="rg-glance-sub">
        {week.kind === "unrostered"
          ? week.notes[0]
          : `${week.filled} of ${week.slots} cleans staffed · ${money(week.cost)} of ${money(week.alloc)}${week.headline !== "Covered" ? ` · ${week.headline}` : ""}`}
      </div>
      {onClick && (
        <button className="rg-btn rg-btn-sm" style={{ marginTop: 10 }} onClick={onClick}>
          {cta}
        </button>
      )}
    </div>
  );
}

function MonthGrid({ weeks, onOpenRoster, currentStart }: { weeks: WeekSummary[]; onOpenRoster: () => void; currentStart: string }) {
  const monthOf = currentStart.slice(0, 7);
  return (
    <div className="rg-month" role="grid" aria-label="Month view">
      {DAY_SHORT.map((d) => (
        <div key={d} className="rg-month-h">
          {d}
        </div>
      ))}
      {weeks.flatMap((w) =>
        w.days.map((d) => {
          const inMonth = d.date.slice(0, 7) === monthOf;
          return (
            <button
              key={d.date}
              className={`rg-month-cell ${d.light} ${inMonth ? "" : "out"} ${w.kind === "current" ? "current" : ""}`}
              onClick={w.kind === "current" ? onOpenRoster : undefined}
              title={d.issues.join("; ") || LIGHT_WORD[d.light]}
            >
              <span className="rg-month-date">{formatDate(d.date)}</span>
              <span className="rg-month-status">
                <span className={`rg-light ${d.light}`} aria-hidden="true" />
                {d.light === "grey" ? "Draft" : d.light === "green" ? "Covered" : d.slots - d.filled > 0 ? `${d.slots - d.filled} open` : d.light === "red" ? "Breach" : "Warnings"}
              </span>
              {d.holiday && <span className="rg-month-ph">{d.holiday}</span>}
            </button>
          );
        }),
      )}
    </div>
  );
}
