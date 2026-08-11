/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DỰ ÁN - PHÒNG BẢO HÀNH BẢO TRÌ - BIM CENTER.
 * Dữ liệu được CHỐT CỨNG theo đúng yêu cầu (12 dòng NaFoods) — không đổi theo
 * ngày, không phụ thuộc lần import.
 */
import React from 'react';
import { DataTable, Column, txt, StatusPill } from './tableKit';

interface Row {
  ghiNhan: string; phanHoi: string; duAn: string; nguoi: string; vande: string;
  giaiphap: string; ketqua: string; vo: string; ngansach: string;
  duKien: string; thucTe: string; tinhTrang: string;
}

// Chốt cứng đúng bảng trong ảnh (Phòng Bảo Hành Bảo Trì - NaFoods).
const ROWS: Row[] = [
  { ghiNhan: '5/15/2026', phanHoi: '80', duAn: 'NaFoods', nguoi: 'Nguyễn Duy Tân', vande: 'VO01 - Phát sinh điều chỉnh hệ MEP', giaiphap: '', ketqua: 'Lên Phụ lục hợp đồng', vo: '', ngansach: '', duKien: '7/31/2026', thucTe: '8/3/2026', tinhTrang: 'Closed' },
  { ghiNhan: '5/15/2026', phanHoi: '88', duAn: 'NaFoods', nguoi: 'Nguyễn Duy Tân', vande: 'VO02 - Phát sinh xây dựng theo cập nhật kiến trúc', giaiphap: '', ketqua: '', vo: '', ngansach: '', duKien: '7/31/2026', thucTe: '', tinhTrang: 'Opened' },
  { ghiNhan: '6/6/2026', phanHoi: '58', duAn: 'NaFoods', nguoi: 'Nguyễn Duy Tân', vande: 'VO03 - Phát sinh xây dựng thay đổi thiết kế theo cuộc họp 04.06.2026', giaiphap: '', ketqua: 'Lên Phụ lục hợp đồng', vo: '', ngansach: '', duKien: '7/31/2026', thucTe: '8/3/2026', tinhTrang: 'Closed' },
  { ghiNhan: '6/22/2026', phanHoi: '42', duAn: 'NaFoods', nguoi: 'Nguyễn Duy Tân', vande: 'VO04 - Phát sinh thay đổi nan cửa cuốn và phát sinh mới cửa RD-02', giaiphap: '', ketqua: 'Lên Phụ lục hợp đồng', vo: '', ngansach: '', duKien: '7/31/2026', thucTe: '8/3/2026', tinhTrang: 'Closed' },
  { ghiNhan: '6/22/2026', phanHoi: '42', duAn: 'NaFoods', nguoi: 'Nguyễn Duy Tân', vande: 'VO05 - Phát sinh theo thay đổi thiết kế tầng 03', giaiphap: '', ketqua: 'Lên Phụ lục hợp đồng', vo: '', ngansach: '', duKien: '7/31/2026', thucTe: '8/3/2026', tinhTrang: 'Closed' },
  { ghiNhan: '7/20/2026', phanHoi: '14', duAn: 'NaFoods', nguoi: 'Lê Văn Thúy', vande: 'VO04: Mương nước tầng 3 và kính ghép lối thăm quan.', giaiphap: '', ketqua: 'Lên Phụ lục hợp đồng', vo: '', ngansach: '', duKien: '7/20/2026', thucTe: '8/3/2026', tinhTrang: 'Closed' },
  { ghiNhan: '7/23/2026', phanHoi: '7', duAn: 'NaFoods', nguoi: 'Lê Văn Thúy', vande: 'Cập nhật lại Cash Flow kế hoạch và thực tế', giaiphap: '', ketqua: '', vo: '', ngansach: '', duKien: '7/30/2026', thucTe: '7/30/2026', tinhTrang: 'Closed' },
  { ghiNhan: '7/23/2026', phanHoi: '7', duAn: 'NaFoods', nguoi: 'Lê Văn Thúy', vande: 'Tính toán lại khối lượng thực tế của bê tông, đá, cơ giới...', giaiphap: '', ketqua: '', vo: '', ngansach: '', duKien: '7/27/2026', thucTe: '7/30/2026', tinhTrang: 'Closed' },
  { ghiNhan: '7/23/2026', phanHoi: '7', duAn: 'NaFoods', nguoi: 'Nguyễn Duy Tân', vande: 'Cập nhật lại giá vốn VO từ 01 đến 05', giaiphap: '', ketqua: '', vo: '', ngansach: '', duKien: '7/27/2026', thucTe: '7/30/2026', tinhTrang: 'Closed' },
  { ghiNhan: '7/25/2026', phanHoi: '9', duAn: 'NaFoods', nguoi: 'Nguyễn Duy Tân', vande: 'IPC04 - Chốt % khối lượng để xuất hoá đơn', giaiphap: '', ketqua: 'Đã xuất hoá đơn', vo: '', ngansach: '', duKien: '7/27/2026', thucTe: '8/3/2026', tinhTrang: 'Closed' },
  { ghiNhan: '7/25/2026', phanHoi: '17', duAn: 'NaFoods', nguoi: 'Nguyễn Duy Tân', vande: 'IPC05 - Xác nhận khối lượng', giaiphap: '', ketqua: '', vo: '', ngansach: '', duKien: '7/30/2026', thucTe: '', tinhTrang: 'Opened' },
  { ghiNhan: '8/3/2026', phanHoi: '8', duAn: 'NaFoods', nguoi: 'Lê Văn Thúy', vande: 'Phụ lục hợp đồng cho VO01, VO03, VO04, VO05', giaiphap: '', ketqua: '', vo: '', ngansach: '', duKien: '8/6/2026', thucTe: '', tinhTrang: 'Ongoing' },
];

export function WarrantyTable() {
  const cols: Column<Row>[] = [
    { header: 'Ngày ghi nhận', render: r => txt(r.ghiNhan) },
    { header: 'Ngày phản hồi', align: 'right', className: 'bg-rose-50', render: r => txt(r.phanHoi) },
    { header: 'Dự án', render: r => <span className="font-semibold text-slate-700">{txt(r.duAn)}</span> },
    { header: 'Người phụ trách', render: r => txt(r.nguoi) },
    { header: 'Vấn đề phát sinh', render: r => <span className="text-slate-700">{txt(r.vande)}</span> },
    { header: 'Giải pháp hành động', render: r => <span className="text-slate-500">{txt(r.giaiphap)}</span> },
    { header: 'Kết quả', render: r => <span className="text-slate-500">{txt(r.ketqua)}</span> },
    { header: 'VO / BOQ', align: 'right', render: r => txt(r.vo) },
    { header: 'Ngân sách', align: 'right', render: r => txt(r.ngansach) },
    { header: 'Dự kiến hoàn thành', render: r => txt(r.duKien) },
    { header: 'Thực tế hoàn thành', render: r => txt(r.thucTe) },
    { header: 'Tình trạng', align: 'center', render: r => <StatusPill status={r.tinhTrang} /> },
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB] bg-[#8b1a1a]">
        <h3 className="font-black text-white text-sm uppercase tracking-wide text-center">Dự Án - Phòng Bảo Hành Bảo Trì - BIM Center</h3>
      </div>
      <DataTable
        columns={cols}
        rows={ROWS}
        minWidthClass="min-w-[1300px]"
        emptyLabel="Chưa có dữ liệu."
        footer={['Total', '', '', '', '', '', '', '—', '—', '', '', `${ROWS.length}`]}
      />
    </div>
  );
}
