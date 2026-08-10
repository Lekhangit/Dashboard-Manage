# Thiết kế: Làm lại Dashboard theo file `TPL Project Management BIM (1).xlsx`

- Ngày: 2026-08-10
- Trạng thái: Đã duyệt thiết kế (chờ review spec)
- Nguồn dữ liệu chuẩn: `public/TPL Project Management BIM (1).xlsx`

## 1. Mục tiêu

- Viết lại **toàn bộ màn hình** cho khớp cấu trúc file Excel mới (10 sheet phẳng), **giữ nguyên phong cách nhìn của code cũ** (nền sáng, tông xanh `#104e8b`, sidebar có logo, card viền mảnh bo góc `rounded-xl shadow-xs`, bảng số kiểu báo cáo).
- Viết lại **bộ đọc Excel** theo nhãn cột (không phụ thuộc vị trí cột).
- **Giữ toàn bộ tính năng hệ thống**: đăng nhập/JWT, phân quyền theo vai trò, ẩn Chi phí & Lương theo quyền, duyệt file 2 cấp (admin + GĐĐH), chat theo vấn đề.
- **Tuyệt đối không bịa dữ liệu**: ô trống để trống; số/% chỉ lấy hoặc suy ra từ cột thật.

## 2. Ngoài phạm vi (Non-goals)

- Không đổi hệ thiết kế/thẩm mỹ (giữ như hiện tại).
- Không thêm biểu đồ/số liệu không có nguồn trong file.
- Không làm timeline/dòng tiền theo tháng (file mới không còn dữ liệu này).

## 3. Kiến trúc

- **Cách A — viết lại tại chỗ.** Giữ `server.ts` (Express + Vite middleware), MongoDB/Mongoose, `authService`, middleware `requireAuth/requireAdmin/requirePermission`, luồng upload duyệt 2 cấp, chat.
- Thay: **models**, **bộ đọc Excel (`templateImportService`)**, **toàn bộ component màn hình**, **các endpoint `/data/*`**.
- Bỏ collection không còn nguồn: `cashflows`, `cashflowDetails`, `milestones`, `resourceSummaries`.

## 4. Model dữ liệu mới (MongoDB)

Mã dự án (`projectId`) = slug hoá tên dự án ở cột `DỰ ÁN` (bỏ dấu, đ→d, thường hoá, bỏ ký tự không phải a-z0-9). Áp dụng nhất quán ở mọi collection để join theo dự án.

### 4.1 `projects` (sheet **Project**, header có `DỰ ÁN`, `NGÂN SÁCH`)
`id, name, bch(số BCH), revenue(DOANH THU), avgBch(BQ BCH), ipc, ipcPct(%IPC), budget(NGÂN SÁCH), budgetUsed(ĐÃ SỬ DỤNG), budgetPct(%NS), planStart(KH B.ĐẦU), planEnd(KH K.THÚC), planDays(KẾ HOẠCH), actualStart(TT B.ĐẦU), actualEnd(TT K.THÚC), actualDays(THỰC TẾ), progressVsPlanPct(%TT/KH), bchEvalPct(% BCH ĐÁNH GIÁ), progressPct(% T.ĐỘ), status(TÌNH TRẠNG)`
- Bỏ dòng `Total`.

### 4.2 `employees` (sheet **Resource**)
`tt, department(PHÒNG BAN), project(DỰ ÁN), name(HỌ VÀ TÊN), title(CHỨC DANH), plan(KẾ HOẠCH), jobDesc(MÔ TẢ CÔNG VIỆC), kpi(KPI), salary(LƯƠNG), insurance(BH+YT), allowance(PHỤ CẤP), cost(CHI PHÍ), level(CẤP BẬC), subsystem(PHÂN HỆ), field(NGÀNH), education(Trình độ), cchn(CCHN), rank(HẠNG)`
- Trường nhạy cảm ẩn theo quyền: `salary, insurance, allowance, cost`.
- Chỉ nhận dòng có `name`.

### 4.3 `contracts` (sheet **Contracts**)
`project(DỰ ÁN), code(SỐ HỢP ĐỒNG - PHỤ LỤC - VO), issueDate(NGÀY PHÁT HÀNH), amount(Số tiền), budget(Ngân sách), content(Nội dung), note(GHI CHÚ), status(Tình trạng)`
- Giữ cả dòng không có `code` nhưng có `content`/số tiền (phụ lục nối tiếp).

### 4.4 `ipc` (sheet **IPC**)
`project(DỰ ÁN), ipcNo(SỐ IPC), date(NGÀY IPC), content(NỘI DUNG), amount(SỐ TIỀN), vat(THUẾ GTGT), total(CỘNG), actualReceived(THỰC NHẬN), received(ĐÃ NHẬN), remaining(CÒN LẠI), status(TÌNH TRẠNG), note(GHI CHÚ)`

### 4.5 `budgetItems` (sheet **Budget**)
`project(DỰ ÁN), package(GÓI THẦU), category(PHÂN LOẠI), dept(PHÒNG/BAN), desc(DIỄN GIẢI), plan(KẾ HOẠCH), actual(THỰC TẾ), variance(CHÊNH LỆCH), usagePct(% SỬ DỤNG), status(TÌNH TRẠNG)`

### 4.6 `issues` (sheet **Chance Logs**)
`id(ổn định, xem §7), loggedDate(Ngày ghi nhận), responseDays(Ngày phản hồi), project(Dự án), assignee(Người phụ trách), problem(Vấn đề phát sinh), solution(Giải pháp hành động), result(Kết quả), voBoq(VO / BOQ), budget(Ngân sách), plannedDate(Dự kiến hoàn thành), actualDate(Thực tế hoàn thành), status(Tình trạng)`

### 4.7 `todos` (sheet **To-do**)
`tt, group(NHÓM), project(DỰ ÁN), content(NỘI DUNG), start(BẮT ĐẦU), end(KẾT THÚC), days(SỐ NGÀY), status(TÌNH TRẠNG), important(QUAN TRỌNG=TRUE/FALSE), urgent(KHẨN CẤP), performer(THỰC HIỆN), coordinator(PHỐI HỢP), actual(THỰC TẾ), earlyLate(SỚM/TRỄ), note(GHI CHÚ)`

### 4.8 Suy ra, không lưu riêng
- **Kanban**: gom `todos` + `issues` theo `status` (Opened / Pending / On-going / Closed). Không parse sheet Kanban.
- **Phân tích (Pivot)**: tự tính từ các collection thật (IPC theo dự án; ngân sách KH/TT theo phòng ban & dự án; nhân sự theo cấp bậc/ngành/dự án; quỹ lương — chỉ khi có quyền). Không parse sheet Pivot.

### 4.9 Giữ nguyên
`users`, `uploadRequests`, `issueComments`, `activityLogs`, `importHistory`.

## 5. Bộ đọc Excel (`templateImportService`)

- Hàm dùng chung: `norm()` (chuẩn hoá nhãn), `findHeaderRow(rows, labels)` (dò dòng header theo nhãn), `colOf(headerRow, label)`, `fmtDate` (dùng local getter, không `toISOString`, tránh lệch 1 ngày), `numOr(v)` (parse số từ chuỗi có dấu phẩy/`-`/`()` âm → 0 nếu trống nhưng **không** bịa khi nên để trống → dùng `null`/`''`).
- Mỗi sheet 1 hàm: `parseProjects, parseEmployees, parseContracts, parseIpc, parseBudget, parseIssues, parseTodos`.
- Quy tắc dừng: đọc từ dòng dưới header tới khi gặp vùng trống/`Total`/`Grand Total`.
- `importTemplate(bufferOrPath, filename, username)`:
  1. Đọc workbook (`cellDates:true`).
  2. Parse từng sheet.
  3. Clean-replace: `deleteMany({})` rồi `insertMany` cho từng collection dữ liệu.
  4. Ghi `importHistory` + `activityLog`.
- **Không bịa**: không suy ra `budget` từ `revenue`; không điền `%` nếu thiếu cột; ngày trống để trống.

## 6. Backend / Endpoints

- Giữ: `/auth/*`, `/import` (tạo yêu cầu duyệt), `/uploads`, `/uploads/:id/preview|download|approve|reject`, `/issues/:issueId/comments` (GET/POST).
- `/data/:category` trả về theo collection: `projects | employees | contracts | ipc | budget | issues | todos | analytics`.
- `/data/compensation` (yêu cầu quyền `view_compensation`) trả `employees` đầy đủ trường lương.
- `getCategoryData` với `employees`: strip `salary, insurance, allowance, cost` nếu user không có quyền `view_compensation` (admin/gddh luôn có).
- `analytics`: tổng hợp tính sẵn ở server từ dữ liệu thật (cho Tổng Quan & tab Phân tích).

## 7. Chat theo vấn đề (giữ)

- Vì import clean-replace, `issues.id` sinh **ổn định** từ nội dung: `slug(project) + '|' + slug(problem) + '|' + loggedDateISO`. Nhờ vậy comment (`issueComments.issueId`) không mất khi upload lại cùng nội dung.
- Quyền gửi: chỉ `gddh` và `cht` (giữ `commentController`).

## 8. Frontend — Màn hình (sidebar), giữ phong cách hiện tại

1. **Tổng Quan** — thẻ KPI 6 dự án (doanh thu, IPC/%, ngân sách/%, tiến độ KH vs TT, tình trạng) + biểu đồ từ `analytics`.
2. **Dự án** (mỗi dự án 1 portal) — tab: Tổng quan · Hợp đồng · IPC · Ngân sách · Vấn đề · Nhân sự · Công việc. Nhân sự lọc `employee.project === projectName` (chính xác, hết bịa).
3. **Nhân Lực** — danh bạ, lọc theo phòng ban/dự án; cột lương ẩn theo quyền.
4. **Hợp Đồng & IPC** — bảng tổng toàn công ty (2 bảng/2 tab).
5. **Ngân Sách** — bảng chi tiết + phân tích theo phòng ban; responsive (cuộn ngang trên điện thoại).
6. **Vấn Đề** — danh sách Chance Logs + bảng **Kanban** (cột theo status); mở chi tiết có chat.
7. **Công Việc** — To-do (ma trận quan trọng/khẩn cấp, trạng thái sớm/trễ).
8. **Chi phí & Lương** — khoá theo quyền (chỉ GĐĐH + admin).
9. **Quản lý tài khoản** (admin) · **Upload & Lịch sử duyệt** (2 cấp, xem trước file).

- Responsive: mọi bảng rộng bọc `overflow-x-auto` + `min-w`; cột dính (nếu có) nền đục hoàn toàn.

## 9. Kiểm thử / nghiệm thu

- Chạy bộ đọc trên `public/TPL Project Management BIM (1).xlsx`, đối chiếu:
  - `projects` = 6 (NaFoods, Phú Hữu, Salacia, Promea, Charm Ming, TTI Kitchen), không có dòng Total.
  - `employees`: mỗi người đúng `department` + `project` như file (vd Trần Vinh Quí → HSE / NaFoods).
  - Team NaFoods = đúng số người có `project === 'NaFoods'` (không kèm PMO/BIM).
  - `contracts/ipc/budget/issues/todos` khớp số dòng thật, ô trống để trống.
- Compile bằng esbuild (tsc OOM với mongoose types).
- Đăng nhập + phân quyền: user không có quyền không thấy lương; chat chỉ gddh/cht gửi được.

## 10. Rủi ro & giảm thiểu

- Mất chat khi re-import → id vấn đề ổn định (§7).
- Lệch ngày → local getter (§5).
- Mất tính năng khi viết lại → giữ backend tại chỗ, chỉ thay lớp dữ liệu + UI (§3).
- Dữ liệu file nội bộ không đẩy lên GitHub → `uploads/` vẫn git-ignore; (đề xuất tách riêng) lưu file duyệt vào MongoDB để chạy bền trên Render — **để sau, không thuộc phạm vi lần này**.
