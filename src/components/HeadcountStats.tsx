/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Users, FileDown, Search, ArrowUpDown, Building, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface HeadcountItem {
  id: string;
  name: string;
  value: number;
  description: string;
  type: 'Office' | 'Support' | 'Project';
  focus: string;
  status: 'Stable' | 'Completed' | 'In Progress' | 'Peak' | 'Mobilizing' | 'Warranty';
}

interface HeadcountStatsProps {
  employees: any[];
  resourceSummary?: any[];
}

export const HeadcountStats: React.FC<HeadcountStatsProps> = ({ employees, resourceSummary }) => {
  const headcountData: HeadcountItem[] = useMemo(() => {
    // Primary source: ResourceSummary from the Excel "Resource" summary table
    // (real per-project FTE totals, incl. fractional values like 6.5).
    if (resourceSummary && resourceSummary.length > 0) {
      return resourceSummary.map((s: any) => {
        const n = String(s.name || '').toLowerCase();
        const type: HeadcountItem['type'] =
          n.includes('văn phòng') || n.includes('bhbt') || n.includes('bim') ? 'Office' : 'Project';
        return {
          id: s.id || s.name,
          name: s.name,
          value: Number(s.value) || 0,
          description: '',
          type,
          focus: s.focus || '',
          status: (s.status || 'In Progress') as HeadcountItem['status'],
        };
      });
    }

    // Fallback: derive counts from the employee list grouped by department.
    if (!employees || employees.length === 0) return [];
    const projectMap = new Map<string, HeadcountItem>();
    employees.forEach(emp => {
      const projId = emp.department || 'other';
      if (!projectMap.has(projId)) {
        projectMap.set(projId, {
          id: projId, name: projId, value: 0, description: '',
          type: 'Project', focus: '', status: 'In Progress'
        });
      }
      projectMap.get(projId)!.value += 1;
    });
    return Array.from(projectMap.values());
  }, [employees, resourceSummary]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof HeadcountItem>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<string>('All');

  // Compute stats
  const totalHeadcount = useMemo(() => {
    return headcountData.reduce((sum, item) => sum + item.value, 0);
  }, [headcountData]);

  const maxValue = useMemo(() => {
    return headcountData.length ? Math.max(...headcountData.map(item => item.value)) : 0;
  }, [headcountData]);

  // Format Status Labels
  const getStatusBadge = (status: HeadcountItem['status']) => {
    switch (status) {
      case 'Stable':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">Thường trực</span>;
      case 'Completed':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Đã hoàn thành</span>;
      case 'In Progress':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Đang thi công</span>;
      case 'Peak':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Cao điểm (Hot)</span>;
      case 'Mobilizing':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Đang huy động</span>;
      case 'Warranty':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">Bảo hành</span>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: HeadcountItem['type']) => {
    switch (type) {
      case 'Office':
        return 'Văn phòng';
      case 'Support':
        return 'Hỗ trợ chuyên môn';
      case 'Project':
        return 'Dự án thi công';
      default:
        return '';
    }
  };

  // Filter and sort
  const processedData = useMemo(() => {
    let result = headcountData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.focus.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || item.type === filterType;
      return matchesSearch && matchesType;
    });

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });

    return result;
  }, [searchTerm, sortField, sortAsc, filterType]);

  const handleSort = (field: keyof HeadcountItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['STT', 'Bộ phận / Dự án', 'Số lượng nhân sự (FTE)', 'Tỷ trọng %', 'Phân loại', 'Hạng mục trọng tâm', 'Trạng thái'];
    const rows = headcountData.map((item, idx) => [
      idx + 1,
      item.name,
      item.value,
      ((item.value / totalHeadcount) * 100).toFixed(1) + '%',
      getTypeLabel(item.type),
      item.focus,
      item.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Thong_ke_nhan_su_du_an_Vinacon.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="headcount-section">
      {/* 1. CHART VISUALIZATION CARD */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-5">
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Nhân Sự Tại Các Dự Án</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Phân bổ chi tiết nguồn lực thực tế trên từng mặt bằng thi công & phòng ban chức năng (Tổng số: {totalHeadcount} nhân sự)</p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Xuất báo cáo nhân sự</span>
          </button>
        </div>

        {/* Column Bar Chart Representation (mimics excel dashboard perfectly!) */}
        <div className="w-full pt-4 overflow-x-auto">
          <div className="min-w-[760px] h-72 relative flex items-end justify-between px-6 pb-8 border-b border-slate-100">
            {/* Grid Line Marks */}
            <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none z-0">
              {[30, 25, 20, 15, 10, 5, 0].map((v, i) => (
                <div key={i} className="relative w-full border-t border-slate-100 flex justify-between">
                  <span className="absolute left-0 -translate-y-2 text-[9px] font-bold font-mono text-slate-400 select-none bg-white pr-2">
                    {v}
                  </span>
                  <span className="absolute right-0 -translate-y-2 text-[9px] font-bold font-mono text-slate-400 select-none bg-white pl-2">
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {/* Bars Column List */}
            <div className="w-full flex items-end justify-around h-[220px] relative z-10 px-8">
              {headcountData.map((item) => {
                const heightPercentage = (item.value / 30) * 100; // max Y value in image is 30
                return (
                  <div key={item.id} className="flex flex-col items-center justify-end h-full flex-1 group relative">
                    {/* Hover Card / Tooltip */}
                    <div className="absolute bottom-full mb-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-slate-900 text-white text-xs p-2 rounded shadow-xl border border-slate-800 z-50 w-44 text-center">
                      <p className="font-extrabold text-blue-300">{item.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                      <p className="text-[11px] font-mono font-bold text-emerald-400 mt-1">{item.value} Nhân sự ({((item.value / totalHeadcount) * 100).toFixed(1)}%)</p>
                    </div>

                    {/* Height scaled wrapper containing the value and the animated bar */}
                    <div className="relative w-8" style={{ height: `${heightPercentage}%` }}>
                      {/* Value on top of bar */}
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 text-xs font-black text-slate-700 font-mono whitespace-nowrap">
                        {item.value}
                      </div>

                      {/* Bar graphic with motion */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: '100%' }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="w-full h-full bg-blue-600 rounded-t shadow-xs hover:bg-blue-500 transition-colors duration-200 cursor-pointer"
                      />
                    </div>

                    {/* Name beneath bar */}
                    <div className="absolute top-full mt-2.5 text-[10px] font-bold text-slate-500 whitespace-nowrap text-center transform -rotate-12 group-hover:text-blue-600 group-hover:scale-105 transition-all">
                      {item.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATISTICAL HEADCOUNT TABLE CARD */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Bảng Thống Kê Chi Tiết Nhân Sự Theo Dự Án</h3>
            <p className="text-[11px] text-slate-400 mt-1">Đối chiếu khối lượng FTE, trọng tâm công việc và mức độ an toàn lực lượng hiện tại</p>
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm dự án, mô tả..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium w-48 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Filter select */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors bg-white font-sans"
            >
              <option value="All">Tất cả hạng mục</option>
              <option value="Office">Khối Văn phòng</option>
              <option value="Support">Hỗ trợ kỹ thuật</option>
              <option value="Project">Dự án hiện trường</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-[#E5E7EB] bg-slate-50">
                <th className="py-3 px-4 w-12 font-sans">TT</th>
                <th className="py-3 px-4 font-sans cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>Bộ Phận / Dự Án</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right font-sans cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('value')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Số Lượng Nhân Sự</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center font-sans">Tỉ Trọng Phân Bổ</th>
                <th className="py-3 px-4 font-sans">Phân Loại</th>
                <th className="py-3 px-4 font-sans">Hạng Mục Trọng Tâm</th>
                <th className="py-3 px-4 text-center font-sans">Trạng Thái Lực Lượng</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#E5E7EB] font-medium">
              {processedData.length > 0 ? (
                processedData.map((item, idx) => {
                  const percentRatio = (item.value / totalHeadcount) * 100;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-blue-600 text-sm">
                        {item.value} <span className="text-[10px] text-slate-400 font-semibold font-sans">FTE</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2 max-w-[120px] mx-auto">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${percentRatio}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 font-bold w-10 text-right">{percentRatio.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-bold">
                        {getTypeLabel(item.type)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-sans font-semibold text-[11px] max-w-[240px] truncate" title={item.focus}>
                        {item.focus}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-bold">Không tìm thấy bản ghi phù hợp với từ khoá tìm kiếm</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
