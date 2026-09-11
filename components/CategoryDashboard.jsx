"use client";

import { useMemo, useState } from "react";
import Dashboard from "@/components/Dashboard";
import { FILM_CATEGORIES, normalizeFilmCategory } from "@/lib/film-category";

const CATEGORY_COOKIE = "cfa-film-category";

export default function CategoryDashboard({ initialPayload, initialCategory = "" }) {
  const [selectedCategory, setSelectedCategory] = useState(normalizeFilmCategory(initialCategory));
  const applications = initialPayload?.applications || [];

  const counts = useMemo(() => {
    const result = Object.fromEntries(FILM_CATEGORIES.map((category) => [category, 0]));
    let unspecified = 0;

    applications.forEach((item) => {
      const category = normalizeFilmCategory(item.filmCategory);
      if (category) result[category] += 1;
      else unspecified += 1;
    });

    return { ...result, unspecified };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (!selectedCategory) return applications;
    return applications.filter(
      (item) => normalizeFilmCategory(item.filmCategory) === selectedCategory,
    );
  }, [applications, selectedCategory]);

  function changeCategory(value) {
    const nextCategory = normalizeFilmCategory(value);
    setSelectedCategory(nextCategory);

    if (nextCategory) {
      document.cookie = `${CATEGORY_COOKIE}=${encodeURIComponent(nextCategory)}; Path=/; SameSite=Lax`;
    } else {
      document.cookie = `${CATEGORY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  }

  const dashboardPayload = {
    ...initialPayload,
    applications: filteredApplications,
  };

  return (
    <>
      <section className="dashboard-shell" style={{ paddingBottom: 0 }}>
        <div className="section-title" style={{ alignItems: "end" }}>
          <div>
            <p className="eyebrow">Ֆիլմի անվանակարգ</p>
            <h2>Խաղարկային / Դոկումենտալ / Անիմացիոն</h2>
          </div>

          <label className="filter-control" style={{ minWidth: 260 }}>
            <span>Ֆիլտրել ըստ անվանակարգի</span>
            <select value={selectedCategory} onChange={(event) => changeCategory(event.target.value)}>
              <option value="">Բոլոր անվանակարգերը</option>
              {FILM_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="deadline-grid">
          {FILM_CATEGORIES.map((category) => (
            <article className="kpi-card" key={category}>
              <span>{category}</span>
              <strong>{formatNumber(counts[category])}</strong>
            </article>
          ))}
        </div>

        <p className="subtitle" style={{ marginTop: 10 }}>
          {selectedCategory
            ? `Ցուցադրվում է ${selectedCategory.toLocaleLowerCase("hy-AM")} անվանակարգի ${formatNumber(filteredApplications.length)} հայտ։`
            : `Ընդհանուր՝ ${formatNumber(applications.length)} հայտ։`}
          {counts.unspecified ? ` Չնշված անվանակարգ՝ ${formatNumber(counts.unspecified)}։` : ""}
        </p>
      </section>

      <Dashboard
        key={selectedCategory || "all-categories"}
        initialPayload={dashboardPayload}
      />
    </>
  );
}

function formatNumber(value) {
  return String(Math.round(Number(value || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}
