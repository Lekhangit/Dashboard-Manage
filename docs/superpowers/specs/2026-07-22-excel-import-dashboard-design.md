# Spec: Template-aware Excel import → typed MongoDB → dashboard

Date: 2026-07-22
Status: Approved direction, pending spec review

## Tóm tắt (VI)

Khi upload file **TPL Project Management Template.xlsx**, hệ thống phải đọc đúng cấu trúc
từng sheet, ghi vào MongoDB dưới dạng các collection có kiểu (typed), và 6 màn hình dashboard
tự động điền dữ liệu. **Chỉ dùng dữ liệu có thật trong file** — ô trống để trống, không sinh số giả.
Các con số "tổng hợp" chỉ là phép tính trên các cột có thật và phải khớp với ảnh chụp mẫu.

## Problem

The app was refactored from a working client-only importer (which produced the reference
screenshots) into a backend that stores the workbook in a **generic EAV** structure
(`Project → Category(sheet) → Field(column) → Record(row) → CellValue`). The dashboard,
however, fetches typed objects from `/api/data/Projects|Employees|Contracts|Issues|Milestones|Risks`
expecting English camelCase fields. The Vietnamese, report-style template matches neither the
sheet names nor the field names, so **after upload every screen renders empty**. The rich
client-side mappers still in `ExcelReader.tsx` are now dead code.

## Goal

Uploading the TPL template populates all 6 screens exactly as in the reference screenshots,
using only data present in the file. Data persists in MongoDB (Atlas, already reachable).

## Non-goals / constraints

- **No fabricated data.** Every rendered value traces to a real cell, or to a computation over
  real cells. Empty cell → blank in UI.
- **Heatmap** ("phân bổ lực lượng theo ngày"): template has no source data → render empty, no
  random values.
- **Activity feed** ("Nhật ký hành động khẩn"): sourced from real issue rows (assignee, project,
  item, issue text) — not invented.
- Do not touch unrelated features (AI suggest, UX-state demo).

## Architecture & data flow

```
Upload .xlsx → POST /api/import
   → templateImportService (NEW; replaces generic excelService)
       parse each known sheet by its real layout
       clear + re-insert typed collections (idempotent refresh per upload)
   → typed MongoDB collections
   → GET /api/data/* (dataController rewritten to return typed docs)
   → App.tsx fetch on load → 6 screens render
```

Re-import is a **clean replace**: on each upload, clear the typed collections, then insert fresh
rows parsed from the workbook. Old generic EAV collections are left untouched and unused.

## Collections (Mongoose, matching `src/types.ts` + additions)

Existing typed interfaces are already in `src/types.ts`: `Project, Employee, Contract, Issue,
CashFlowMonth, ActivityLog, Milestone, RiskAndKpi`. Add schemas for all of them plus:

- **ResourceSummary** — `{ id, name, value (FTE total), roleCounts{...}, focus, status, type }`
  (from Resource left table; feeds HeadcountStats bar chart + summary table).
- **CashFlow** — `{ projectId, month, plannedIn, plannedOut, actualIn, actualOut }`
  (from per-project cashflow blocks; feeds ProjectPortal chart).

## Sheet → parse rule → collection → screen

| Sheet | Header row(s) | Parse | Collection | Screen(s) |
|---|---|---|---|---|
| **Timeline** | groups row 4, cols row 5, data 6+ | 18 cols: DỰ ÁN, QLDA/CHT, BCH, DOANH THU, BQ BCH, IPC, GT CÒN LẠI, % TT/KH, KH/TT/CL begin+end, TÌNH TRẠNG | `Project` (name, manager, revenue, ipcActual, outstanding, progress, dates, status) | Tiến Độ, Dashboard, Ngân sách |
| **Budget** | row 3, data 4+ | TT, TÊN DỰ ÁN, NGÂN SÁCH, ĐÃ SỬ DỤNG, CÒN LẠI, % | merged into `Project.budget` (+ `spent` if present) | Ngân sách, Dashboard |
| **Resource** LEFT | row 4, data 5+ | project + per-role counts + TỔNG CỘNG | `ResourceSummary` | Hồ Sơ Nhân Sự |
| **Resource** RIGHT | row 4, data 5+ | staff: dept, name, title, desc, KPI, salary, insurance, allowance, cost, level, segment, branch, qualification, CCHN, grade | `Employee` | Hồ Sơ Nhân Sự (list) |
| **NaFoods, Phu Huu, Salacia, Promea, Charm** | block layout (blocks located by label text, not fixed rows) | block1 planned cashflow, block2 actual cashflow, block3 contracts+VO (IPC cols vary per sheet), block4 issues | `CashFlow`, `Contract`, `Issue` | ProjectPortal (per project) |
| **Old_Pro** | row 5, data 6+ | date, project, assignee, issue, action, result, VO/BOQ, budget, dueDate, actualDate, status | `Issue` | Vướng Mắc & Bảo Hành |
| **Dashboard** | — | weekly-report banner text only | (metadata, optional) | header text |

Per-project sheets have **variable columns** (NaFoods IPC01–08, Phu Huu IPC01–04 + a second
actual block, Salacia none, Charm IPC01–03). Parsers locate blocks by their Vietnamese label
cells ("DÒNG TIỀN DỰ ÁN - KẾ HOẠCH", "THÔNG TIN HỢP ĐỒNG, PHỤ LỤC VÀ VO", "THEO DÕI CÁC VẤN ĐỀ…")
and read columns dynamically rather than by fixed index.

## Derived fields (computed from real columns — verify vs screenshots)

Confirmed from parsed data + screenshots:

- **Dashboard "TỔNG NGÂN SÁCH DỰ ÁN" / Ngân sách "ĐƯỢC GIAO"** = Σ Budget.NGÂN SÁCH
  = 149,900,221,765 ✓
- **Ngân sách "ĐÃ GIẢI NGÂN CAM KẾT" / Dashboard "ĐÃ CHI"** = Σ Project.spent = 132,336,018,277 ✓
- Per-project `spent` ("ĐÃ SỬ DỤNG") is **not** a single column; it is reverse-engineered per
  project from real cells (e.g. NaFoods = Timeline GT CÒN LẠI = 73,224,058,939; Phú Hữu / Salacia /
  Promea = Budget CÒN LẠI; Charm from actual IPC). **Implementation must confirm each formula
  against the screenshot before marking a screen done.**

Acceptance = rendered numbers match the reference screenshots for every screen.

## Code changes

- **NEW** `src/services/templateImportService.ts` — one small parser function per sheet, each
  independently testable (`parseTimeline`, `parseBudget`, `parseResource`, `parseProjectSheet`,
  `parseOldPro`). Orchestrator clears + inserts typed collections and writes ImportHistory.
- **`src/models/index.ts`** — add typed schemas (Project, Employee, ResourceSummary, Contract,
  Issue, Milestone, CashFlow, ActivityLog, RiskAndKpi).
- **`src/services/excelService.ts`** — retired (kept or removed; no longer wired to /api/import).
- **`src/controllers/dataController.ts`** — return typed docs; add `ResourceSummary`, `CashFlow`
  (per project) endpoints.
- **`src/controllers/importController.ts`** — call templateImportService.
- **`src/App.tsx`** — wire the cashflow fetch (currently `cashflowData` is declared but never
  loaded) so ProjectPortal chart fills; wire activity feed from issues.
- **`src/components/HeadcountStats.tsx`** — consume `ResourceSummary` (project→FTE/focus/status)
  instead of counting employees, to match fractional FTEs (DenEast 26, Phú Hữu 6.5…).
- **`src/components/ExcelReader.tsx`** — remove dead client-side mappers; keep upload UI wired to
  `/api/import` + reload.

## Testing

- Unit test each sheet parser against `uploads/TPL Project Management Templete.xlsx` fixture:
  assert row counts and key values (e.g. Timeline NaFoods BCH=12, DOANH THU=132,315,862,169).
- Integration: run import, then GET each `/api/data/*` and assert typed shape + known values.
- Manual/visual: each of the 6 screens matches its reference screenshot; blank cells stay blank.

## Open items to resolve during implementation

1. Exact per-project `spent` / IPC roll-up formulas (reverse-engineer + verify per screenshot).
2. Milestone source (screens show milestones; confirm which sheet/block supplies them, else leave
   empty rather than fabricate).
3. Whether to keep or drop the old EAV collections/models.
