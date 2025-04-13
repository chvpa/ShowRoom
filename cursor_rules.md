# Cursor Rule – ShowRoom: High Performance Data Handling & Scalability

## 📦 Data fetching rules

- ✅ Always use **efficient data fetching strategies**:
  - Implement **client-side caching** with SWR or React Query (if available).
  - Fetch **only** the necessary data, never over-fetch.
  - Use **selective queries**: avoid SELECT *.
  - Fetch data lazily when possible (on-demand).
  - Avoid multiple unnecessary requests to Supabase.
  
- ✅ Use **paginated queries** for large datasets:
  - Implement limit and offset for lists.
  - Display loading indicators while fetching next pages.
  - Support infinite scrolling or pagination in UI.

- ✅ Prefer **server-side pagination and filtering** over client-side:
  - Apply filters and sorts in the query, not in the frontend.
  - Always validate and sanitize query parameters.

- ✅ Use **batch requests** when fetching multiple items (group queries).

- ✅ Debounce search/filter inputs to prevent rapid multiple API calls.

---

## 🚀 Caching and data performance

- ✅ Use **caching** aggressively:
  - Implement SWR (stale-while-revalidate) or similar caching strategy.
  - Revalidate data intelligently (manual invalidation when needed).
  - Cache static assets and images properly.
  - Prefer local storage or IndexedDB for persistent caching if beneficial.

- ✅ Apply **memoization** for expensive calculations and components.

- ✅ Use **React.memo**, `useMemo`, and `useCallback` for heavy components and utilities.

- ✅ Prefetch data **before it is needed**, especially for known flows (brand selection → rubro → producto).

---

## ⚙️ Database handling best practices (Supabase)

- ✅ Avoid SELECT * in production. Always specify fields.
- ✅ Use **Supabase Row Level Security (RLS)** for data safety.
- ✅ Apply **database-side filtering**, pagination, and ordering.
- ✅ Reduce reads by caching frequently used metadata (e.g., brands, rubros).
- ✅ Avoid unnecessary nested queries.
- ✅ Prepare for **incremental static regeneration** (if future SSR).
- ✅ Design the schema for **query performance**:
  - Proper indexing.
  - Avoid N+1 problems.
  - Use efficient joins.

---

## 🧩 Large data sets UX

- ✅ Use **loading skeletons** and placeholders for better perception of performance.
- ✅ Implement virtual scrolling if lists are very long (e.g., >500 items).
- ✅ Show data in chunks ("load more" or infinite scroll).
- ✅ Lazy load images and heavy media assets.
- ✅ Compress images and use modern formats (WebP, AVIF).

---

## 🧱 Code structure for performance

- ✅ Split code by route and by feature (code-splitting).
- ✅ Use dynamic imports and React.lazy where applicable.
- ✅ Avoid global state pollution.
- ✅ Minimize re-renders through proper state management.
- ✅ Keep component trees shallow where possible.

---

## 🛡️ Security considerations for data flow

- ✅ Sanitize and validate all inputs at client and server side.
- ✅ Do not expose sensitive queries or variables in frontend code.
- ✅ Never store API keys or secrets in client-side JS.
- ✅ Use environment variables securely.
- ✅ Apply strict permissions in Supabase policies.

---

## 🧠 AI Reminder for Cursor

> - Prioritize efficient queries over convenience.
> - Always cache responses when appropriate.
> - Avoid unnecessary data fetching, and combine requests when logical.
> - Keep data flow clean, predictable, and safe.
> - Focus on perceived performance (fast UX first).
> - Think of scalability: the app should handle thousands of products and users smoothly.

---

## 🌟 Future-proofing (Recommended)

- Prepare for **offline support** with service workers.
- Consider **PWA optimization** for mobile experience.
- Use **preload** and **preconnect** hints in `<head>` for critical resources.
- Set up **critical CSS extraction** for faster first paint.
- Use **lazy hydration** for non-critical components.

---

