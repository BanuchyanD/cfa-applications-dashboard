"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FilterX,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#245c4d", "#9f4f42", "#315d86", "#b8862f", "#55706f", "#7c6957"];
const ARMENIAN_MONTHS = [
  "հնվ",
  "փտվ",
  "մրտ",
  "ապր",
  "մյս",
  "հնս",
  "հլս",
  "օգս",
  "սեպ",
  "հոկ",
  "նոյ",
  "դեկ",
];
const YEREVAN_UTC_OFFSET_MS = 4 * 60 * 60 * 1000;

const initialFilters = {
  competition: "",
  subgroup: "",
  participationCount: "",
  applicationStatus: "",
  correctionStatus: "",
  search: "",
};

const metricLabels = {
  totalApplications: "Ընդհանուր հայտեր",
  totalFilmBudget: "Ֆիլմերի ընդհանուր բյուջե",
  requestedFunding: "Հայցվող պետական ֆինանսավորում",
  averageRequested: "Միջին հայցվող ֆինանսավորում",
  needsCorrection: "Շտկման ենթակա հայտեր",
  acceptedApplications: "Ընդունված հայտեր",
};

export default function Dashboard({ initialPayload }) {
  const [applications, setApplications] = useState(initialPayload?.applications || []);
  const [filters, setFilters] = useState(initialFilters);
  const [status, setStatus] = useState(initialPayload?.error ? "error" : "ready");
  const [error, setError] = useState(initialPayload?.error || "");
  const [meta, setMeta] = useState({
    source: initialPayload?.source || "",
    boardName: initialPayload?.boardName || "Փաստաթղթերի ուսումնասիրություն",
    updatedAt: initialPayload?.updatedAt || "",
    message: initialPayload?.message || "",
  });

  const loadApplications = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/applications", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Տվյալները բեռնել չհաջողվեց։");
      }

      setApplications(payload.applications || []);
      setMeta({
        source: payload.source,
        boardName: payload.boardName,
        updatedAt: payload.updatedAt,
        message: payload.message,
      });
      setStatus("ready");
    } catch (loadError) {
      setError(loadError.message);
      setApplications([]);
      setStatus("error");
    }
  }, []);

  const options = useMemo(
    () => ({
      competition: uniqueOptions(applications, "competition"),
      subgroup: uniqueOptions(applications, "subgroup"),
      participationCount: orderedParticipation(uniqueOptions(applications, "participationCount")),
      applicationStatus: uniqueOptions(applications, "applicationStatus"),
      correctionStatus: uniqueOptions(applications, "correctionStatus"),
    }),
    [applications],
  );

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase("hy-AM");

    return applications.filter((item) => {
      const matchesSelects =
        matchesFilter(item.competition, filters.competition) &&
        matchesFilter(item.subgroup, filters.subgroup) &&
        matchesFilter(item.participationCount, filters.participationCount) &&
        matchesFilter(item.applicationStatus, filters.applicationStatus) &&
        matchesFilter(item.correctionStatus, filters.correctionStatus);

      if (!matchesSelects) return false;
      if (!query) return true;

      return [
        item.filmTitle,
        item.applicantOrganization,
        item.director,
        item.producer,
      ]
        .join(" ")
        .toLocaleLowerCase("hy-AM")
        .includes(query);
    });
  }, [applications, filters]);

  const metrics = useMemo(() => {
    const requestedFunding = sumBy(filtered, "requestedBudget");
    const totalApplications = filtered.length;

    return {
      totalApplications,
      totalFilmBudget: sumBy(filtered, "totalBudget"),
      requestedFunding,
      averageRequested: totalApplications ? requestedFunding / totalApplications : 0,
      needsCorrection: filtered.filter(isCorrectionRequired).length,
      acceptedApplications: filtered.filter(isAccepted).length,
    };
  }, [filtered]);

  const chartData = useMemo(
    () => ({
      length: countGroups(filtered, classifyLength),
      debut: countGroups(filtered, classifyDebut),
      participation: countGroups(filtered, (item) => normalizeParticipation(item.participationCount)),
      applicationStatus: countGroups(filtered, classifyApplicationStatus),
      correctionStatus: countGroups(filtered, (item) => item.correctionStatus || "Չնշված"),
      totalBudgetByCompetition: sumGroups(filtered, "competition", "totalBudget"),
      requestedByCompetition: sumGroups(filtered, "competition", "requestedBudget"),
    }),
    [filtered],
  );

  const deadlines = useMemo(() => getDeadlineGroups(filtered), [filtered]);
  const filtersActive = Object.values(filters).some(Boolean);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Cinema Foundation of Armenia</p>
          <h1>CFA Applications Dashboard</h1>
          <p className="subtitle">Հայտերի ուսումնասիրություն</p>
        </div>

        <div className="header-actions">
          <div className="updated-card">
            <span>Վերջին թարմացում</span>
            <strong>{meta.updatedAt ? formatDateTime(meta.updatedAt) : "Բեռնվում է"}</strong>
          </div>
          <button className="icon-button" onClick={loadApplications} disabled={status === "loading"} aria-label="Թարմացնել">
            <RefreshCw size={18} />
            <span>Թարմացնել</span>
          </button>
        </div>
      </section>

      {meta.source === "demo" && (
        <div className="demo-banner" role="status">
          Ցուցադրված է զարգացման demo dataset, քանի որ `MONDAY_API_TOKEN`-ը դեռ կարգավորված չէ։
        </div>
      )}

      <section className="filters-panel" aria-label="Ֆիլտրեր">
        <div className="search-box">
          <Search size={18} />
          <input
            value={filters.search}
            onChange={(event) => updateFilter(setFilters, "search", event.target.value)}
            placeholder="Որոնել ֆիլմով, հայտատուով, ռեժիսորով կամ պրոդյուսերով"
          />
        </div>

        <SelectFilter label="Մրցույթ" value={filters.competition} options={options.competition} onChange={(value) => updateFilter(setFilters, "competition", value)} />
        <SelectFilter label="Ենթախումբ" value={filters.subgroup} options={options.subgroup} onChange={(value) => updateFilter(setFilters, "subgroup", value)} />
        <SelectFilter label="Մասնակցություն" value={filters.participationCount} options={options.participationCount} onChange={(value) => updateFilter(setFilters, "participationCount", value)} />
        <SelectFilter label="Հայտի կարգավիճակ" value={filters.applicationStatus} options={options.applicationStatus} onChange={(value) => updateFilter(setFilters, "applicationStatus", value)} />
        <SelectFilter label="Շտկված/Չշտկված" value={filters.correctionStatus} options={options.correctionStatus} onChange={(value) => updateFilter(setFilters, "correctionStatus", value)} />

        <button className="clear-button" onClick={() => setFilters(initialFilters)} disabled={!filtersActive}>
          <FilterX size={17} />
          <span>Մաքրել ֆիլտրերը</span>
        </button>
      </section>

      {status === "loading" && <StatePanel title="Տվյալները բեռնվում են" description="Մի քանի վայրկյանում կտեսնենք հայտերի ընթացիկ պատկերը։" />}
      {status === "error" && <StatePanel tone="error" title="Տվյալների բեռնումը չստացվեց" description={error} />}

      {status === "ready" && (
        <>
          <section className="kpi-grid" aria-label="Հիմնական ցուցանիշներ">
            <KpiCard label={metricLabels.totalApplications} value={formatNumber(metrics.totalApplications)} />
            <KpiCard label={metricLabels.totalFilmBudget} value={formatAmd(metrics.totalFilmBudget)} />
            <KpiCard label={metricLabels.requestedFunding} value={formatAmd(metrics.requestedFunding)} />
            <KpiCard label={metricLabels.averageRequested} value={formatAmd(metrics.averageRequested)} />
            <KpiCard label={metricLabels.needsCorrection} value={formatNumber(metrics.needsCorrection)} tone="attention" />
            <KpiCard label={metricLabels.acceptedApplications} value={formatNumber(metrics.acceptedApplications)} tone="success" />
          </section>

          {filtered.length === 0 ? (
            <StatePanel title="Այս ֆիլտրերով հայտեր չկան" description="Փոխեք որոնումը կամ մաքրեք ֆիլտրերը՝ ամբողջ պատկերը տեսնելու համար։" />
          ) : (
            <>
              <section className="visual-grid" aria-label="Վիճակագրական գրաֆիկներ">
                <ChartPanel title="Լիամետրաժ / Կարճամետրաժ">
                  <DonutChart data={chartData.length} />
                </ChartPanel>
                <ChartPanel title="Դեբյուտային vs Ոչ դեբյուտային">
                  <DonutChart data={chartData.debut} />
                </ChartPanel>
                <ChartPanel title="Մասնակցության քանակը">
                  <SimpleBarChart data={chartData.participation} />
                </ChartPanel>
                <ChartPanel title="Ընդունված vs Չընդունված">
                  <DonutChart data={chartData.applicationStatus} />
                </ChartPanel>
                <ChartPanel title="Շտկման կարգավիճակ">
                  <SimpleBarChart data={chartData.correctionStatus} />
                </ChartPanel>
                <ChartPanel title="Ֆիլմերի ընդհանուր բյուջեն ըստ մրցույթի">
                  <MoneyBarChart data={chartData.totalBudgetByCompetition} />
                </ChartPanel>
                <ChartPanel title="Հայցվող պետական ֆինանսավորումն ըստ մրցույթի" wide>
                  <MoneyBarChart data={chartData.requestedByCompetition} />
                </ChartPanel>
              </section>

              <DeadlinesSection deadlines={deadlines} />
              <ApplicationsTable applications={filtered} />
            </>
          )}
        </>
      )}
    </main>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Բոլորը</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function KpiCard({ label, value, tone = "default" }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ChartPanel({ title, wide = false, children }) {
  return (
    <article className={`chart-panel ${wide ? "wide" : ""}`}>
      <h2>{title}</h2>
      {children}
    </article>
  );
}

function DonutChart({ data }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatNumber(value)} />
        </PieChart>
      </ResponsiveContainer>
      <ChartLegend data={data} />
    </div>
  );
}

function SimpleBarChart({ data }) {
  return (
    <div className="bar-wrap">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatNumber(value)} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MoneyBarChart({ data }) {
  return (
    <div className="money-wrap">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => compactAmd(value)} />
          <Tooltip formatter={(value) => formatAmd(value)} />
          <Bar dataKey="value" fill="#245c4d" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartLegend({ data }) {
  return (
    <div className="chart-legend">
      {data.map((item, index) => (
        <span key={item.name}>
          <i style={{ background: COLORS[index % COLORS.length] }} />
          {item.name}: {formatNumber(item.value)}
        </span>
      ))}
    </div>
  );
}

function DeadlinesSection({ deadlines }) {
  return (
    <section className="deadline-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Ուշադրության կենտրոնում</p>
          <h2>Ժամկետներ և ուշադրություն պահանջող հայտեր</h2>
        </div>
      </div>

      <div className="deadline-grid">
        <DeadlineColumn
          title="Ժամկետանց շտկումներ"
          icon={<AlertTriangle size={18} />}
          tone="overdue"
          items={deadlines.overdue}
          empty="Ժամկետանց շտկումներ չկան։"
        />
        <DeadlineColumn
          title="Առաջիկա 5 օրում"
          icon={<Clock3 size={18} />}
          tone="upcoming"
          items={deadlines.upcoming}
          empty="Առաջիկա 5 օրում շտկման վերջնաժամկետ չկա։"
        />
        <DeadlineColumn
          title="Շտկման ենթակա"
          icon={<CheckCircle2 size={18} />}
          tone="attention"
          items={deadlines.required}
          empty="Շտկման ենթակա հայտ չկա։"
        />
      </div>
    </section>
  );
}

function DeadlineColumn({ title, icon, tone, items, empty }) {
  return (
    <article className={`deadline-column ${tone}`}>
      <h3>
        {icon}
        {title}
        <span>{formatNumber(items.length)}</span>
      </h3>
      {items.length ? (
        <div className="deadline-list">
          {items.slice(0, 6).map((item) => (
            <div className="deadline-item" key={`${tone}-${item.id}`}>
              <strong>{item.filmTitle || "Անվանում չկա"}</strong>
              <span>{item.applicantOrganization || "Հայտատուն նշված չէ"}</span>
              <time>{formatDate(item.correctionDeadline)}</time>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-note">{empty}</p>
      )}
    </article>
  );
}

function ApplicationsTable({ applications }) {
  return (
    <section className="table-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Հայտերի ռեեստր</p>
          <h2>Դիմումների աղյուսակ</h2>
        </div>
        <span>{formatNumber(applications.length)} հայտ</span>
      </div>

      <div className="table-frame">
        <table>
          <thead>
            <tr>
              <th>Գրանցման համար</th>
              <th>Ֆիլմ</th>
              <th>Հայտատու</th>
              <th>Ռեժիսոր</th>
              <th>Պրոդյուսեր</th>
              <th>Մրցույթ</th>
              <th>Ենթախումբ</th>
              <th>Ընդհանուր բյուջե</th>
              <th>Հայցվող գումար</th>
              <th>Նույն նախագծով մասնակցության քանակը</th>
              <th>Շտկման կարգավիճակ</th>
              <th>Շտկման վերջնաժամկետ</th>
              <th>Հայտի կարգավիճակ</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((item) => (
              <tr key={item.id}>
                <td>{item.registrationNumber || "Չնշված"}</td>
                <td className="strong-cell">{item.filmTitle || "Չնշված"}</td>
                <td>{item.applicantOrganization || "Չնշված"}</td>
                <td>{item.director || "Չնշված"}</td>
                <td>{item.producer || "Չնշված"}</td>
                <td>{item.competition || "Չնշված"}</td>
                <td>{item.subgroup || "Չնշված"}</td>
                <td>{formatAmd(item.totalBudget)}</td>
                <td>{formatAmd(item.requestedBudget)}</td>
                <td>{item.participationCount || "Չնշված"}</td>
                <td><StatusPill value={item.correctionStatus} /></td>
                <td>{formatDate(item.correctionDeadline)}</td>
                <td><StatusPill value={item.applicationStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ value }) {
  const label = value || "Չնշված";
  const tone = label.includes("Չ") || label.includes("ենթակա") ? "warn" : label.includes("Ընդունված") || label.includes("Շտկված") ? "ok" : "neutral";

  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function StatePanel({ title, description, tone = "default" }) {
  return (
    <section className={`state-panel ${tone}`}>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

function updateFilter(setFilters, key, value) {
  setFilters((current) => ({ ...current, [key]: value }));
}

function matchesFilter(value, selected) {
  return !selected || value === selected;
}

function uniqueOptions(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "hy-AM"));
}

function orderedParticipation(options) {
  const order = ["1", "2", "3", "4"];
  return options.sort((a, b) => {
    const aIndex = order.findIndex((item) => a.includes(item));
    const bIndex = order.findIndex((item) => b.includes(item));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
}

function sumBy(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function countGroups(items, classifier) {
  const groups = new Map();
  items.forEach((item) => {
    const name = classifier(item) || "Չնշված";
    groups.set(name, (groups.get(name) || 0) + 1);
  });
  return mapToChartRows(groups);
}

function sumGroups(items, labelKey, valueKey) {
  const groups = new Map();
  items.forEach((item) => {
    const name = item[labelKey] || "Չնշված";
    groups.set(name, (groups.get(name) || 0) + Number(item[valueKey] || 0));
  });
  return mapToChartRows(groups);
}

function mapToChartRows(groups) {
  return [...groups.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function classifyLength(item) {
  const value = `${item.subgroup} ${item.competition}`.toLocaleLowerCase("hy-AM");
  if (value.includes("կարճ")) return "Կարճամետրաժ";
  if (value.includes("լիամետրաժ")) return "Լիամետրաժ";
  return "Չնշված";
}

function classifyDebut(item) {
  const value = `${item.subgroup} ${item.competition}`.toLocaleLowerCase("hy-AM");
  if (value.includes("ոչ դեբյուտ")) return "Ոչ դեբյուտային";
  if (value.includes("դեբյուտ")) return "Դեբյուտային";
  return "Չնշված";
}

function classifyApplicationStatus(item) {
  if (isAccepted(item)) return "Ընդունված";
  if ((item.applicationStatus || "").includes("Չընդունված")) return "Չընդունված";
  return item.applicationStatus || "Այլ";
}

function normalizeParticipation(value = "") {
  if (value.includes("1")) return "1-ին";
  if (value.includes("2")) return "2-րդ";
  if (value.includes("3")) return "3-րդ";
  if (value.includes("4")) return "4-րդ";
  return value || "Չնշված";
}

function isAccepted(item) {
  return (item.applicationStatus || "").trim() === "Ընդունված";
}

function isCorrectionRequired(item) {
  const status = item.correctionStatus || "";
  return status.includes("Շտկման ենթակա") || status.includes("Չշտկված");
}

function getDeadlineGroups(items) {
  const today = startOfDay(new Date());
  const withOpenCorrection = items.filter((item) => item.correctionDeadline && isCorrectionRequired(item));

  const overdue = withOpenCorrection
    .filter((item) => daysUntil(item.correctionDeadline, today) < 0)
    .sort((a, b) => new Date(a.correctionDeadline) - new Date(b.correctionDeadline));

  const upcoming = withOpenCorrection
    .filter((item) => {
      const distance = daysUntil(item.correctionDeadline, today);
      return distance >= 0 && distance <= 5;
    })
    .sort((a, b) => new Date(a.correctionDeadline) - new Date(b.correctionDeadline));

  const required = items
    .filter((item) => (item.correctionStatus || "").includes("Շտկման ենթակա"))
    .sort((a, b) => new Date(a.correctionDeadline || "9999-12-31") - new Date(b.correctionDeadline || "9999-12-31"));

  return { overdue, upcoming, required };
}

function daysUntil(dateValue, today) {
  const date = startOfDay(new Date(`${dateValue}T00:00:00`));
  return Math.floor((date - today) / 86400000);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatNumber(value) {
  const number = Math.round(Number(value || 0));
  return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

function formatAmd(value) {
  return `${formatNumber(value)} ֏`;
}

function compactAmd(value) {
  const number = Number(value || 0);
  if (number >= 1000000000) return `${formatNumber(number / 1000000000)} մլրդ ֏`;
  if (number >= 1000000) return `${formatNumber(number / 1000000)} մլն ֏`;
  return `${formatNumber(number)} ֏`;
}

function formatDate(value) {
  if (!value) return "Չնշված";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return "Չնշված";

  return `${padDatePart(day)} ${ARMENIAN_MONTHS[month - 1]}, ${year} թ.`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Չնշված";

  const yerevanDate = new Date(date.getTime() + YEREVAN_UTC_OFFSET_MS);
  const day = yerevanDate.getUTCDate();
  const month = yerevanDate.getUTCMonth();
  const year = yerevanDate.getUTCFullYear();
  const hour = yerevanDate.getUTCHours();
  const minute = yerevanDate.getUTCMinutes();

  return `${padDatePart(day)} ${ARMENIAN_MONTHS[month]}, ${year} թ., ${padDatePart(hour)}:${padDatePart(minute)}`;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}
