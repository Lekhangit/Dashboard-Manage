import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet,
  UploadCloud,
  Search,
  Layers,
  CheckCircle, 
  AlertCircle, 
  X, 
  RefreshCw, 
  FileText,
  Table,
  ArrowRight,
  Info,
  Database,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  GitCompare,
  HelpCircle
} from 'lucide-react';
import { Project, Employee, Contract, Issue, Milestone, AuthUser } from '../types';
import { UploadHistory } from './UploadHistory';

// Declare XLSX globally for TypeScript since it will be loaded from CDN
declare global {
  interface Window {
    XLSX?: any;
  }
}

interface SheetData {
  sheetName: string;
  headers: string[];
  rows: any[][]; // array of row arrays
  jsonData: any[]; // parsed JSON objects
}

interface ExcelReaderProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  issues: Issue[];
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  triggerToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  authUser: AuthUser;
}

export function ExcelReader({
  projects,
  setProjects,
  employees,
  setEmployees,
  contracts,
  setContracts,
  issues,
  setIssues,
  milestones,
  setMilestones,
  triggerToast,
  authUser
}: ExcelReaderProps) {
  const [uploadRefreshKey, setUploadRefreshKey] = useState(0);
  const [libLoaded, setLibLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  
  // Parsed workbook data
  const [workbookData, setWorkbookData] = useState<SheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Import Target Selections
  const [targetSheets, setTargetSheets] = useState<{
    projects: string;
    employees: string;
    contracts: string;
    milestones: string;
    issues: string;
  }>({
    projects: '',
    employees: '',
    contracts: '',
    milestones: '',
    issues: ''
  });

  // Sync modes: overwrite or merge
  const [syncModes, setSyncModes] = useState<{
    projects: 'overwrite' | 'merge';
    employees: 'overwrite' | 'merge';
    contracts: 'overwrite' | 'merge';
    milestones: 'overwrite' | 'merge';
    issues: 'overwrite' | 'merge';
  }>({
    projects: 'overwrite',
    employees: 'overwrite',
    contracts: 'overwrite',
    milestones: 'overwrite',
    issues: 'overwrite'
  });

  // Sync log to give user confidence
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  
  // Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load SheetJS dynamically from CDN
  useEffect(() => {
    if (window.XLSX) {
      setLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = () => {
      if (window.XLSX) {
        setLibLoaded(true);
      } else {
        setLoadError('Không thể khởi tạo thư viện đọc Excel từ CDN.');
      }
    };
    script.onerror = () => {
      setLoadError('Lỗi tải mô-đun phân tích cú pháp Excel từ CDN.');
    };
    document.body.appendChild(script);
  }, []);

  // Try to auto-map worksheets to modules based on name keywords
  useEffect(() => {
    if (workbookData.length === 0) return;
    
    const newTargets = { projects: '', employees: '', contracts: '', milestones: '', issues: '' };
    
    workbookData.forEach(sheet => {
      const name = sheet.sheetName.toLowerCase();
      if (name === 'dashboard' || name.includes('dashboard') || name.includes('dự án') || name.includes('project') || name.includes('công trình')) {
        newTargets.projects = sheet.sheetName;
      } else if (name === 'resource' || name.includes('resource') || name.includes('nhân sự') || name.includes('nhân viên') || name.includes('employee') || name.includes('người')) {
        newTargets.employees = sheet.sheetName;
      } else if (name === 'budget' || name.includes('budget') || name.includes('hợp đồng') || name.includes('contract') || name.includes('phụ lục') || name.includes('ngân sách') || name.includes('tài chính') || name.includes('chi phí')) {
        newTargets.contracts = sheet.sheetName;
      } else if (name === 'timeline' || name.includes('timeline') || name.includes('tiến độ') || name.includes('mốc') || name.includes('milestone') || name.includes('lịch trình')) {
        newTargets.milestones = sheet.sheetName;
      } else if (name === 'old pro' || name.includes('old pro') || name.includes('old_pro') || name.includes('sự cố') || name.includes('vấn đề') || name.includes('khó khăn') || name.includes('issue') || name.includes('vướng mắc')) {
        newTargets.issues = sheet.sheetName;
      }
    });

    // Fallbacks if no exact keyword matched, assign first sheets
    if (!newTargets.projects && workbookData[0]) newTargets.projects = workbookData[0].sheetName;
    
    setTargetSheets(newTargets);
  }, [workbookData]);

  // Helper to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to parse dates uniformly
  const formatDateString = (val: any): string => {
    if (!val) return '2026-01-01';
    if (val instanceof Date) {
      try {
        return val.toISOString().split('T')[0];
      } catch {
        // Invalid date object, try to format
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    
    const parts = str.split(/[\/\-.]/);
    if (parts.length === 3) {
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      if (parts[2].length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    return '2026-01-01';
  };

  // Main workbook parser to Backend
  const parseFile = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    setFileSize(formatBytes(file.size));
    setSyncLogs([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', authUser?.fullName || authUser?.username || 'N/A');

    try {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString('vi-VN')}] ⏳ Đang gửi yêu cầu upload "${file.name}"...`]);
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload thất bại');

      setUploadRefreshKey(k => k + 1); // làm mới bảng lịch sử

      if (data.status === 'applied') {
        setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString('vi-VN')}] ✅ Đã đủ 2 cấp duyệt — dữ liệu đã được áp dụng!`]);
        triggerToast('File đã được duyệt và áp dụng vào hệ thống!', 'success');
        setTimeout(() => window.location.reload(), 1800);
      } else {
        setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString('vi-VN')}] 🕒 Đã tạo yêu cầu, chờ Quản trị viên và Giám đốc điều hành duyệt.`]);
        triggerToast('Đã gửi yêu cầu upload — chờ admin và Giám đốc điều hành duyệt.', 'info');
        setFileName(null);
        setFileSize(null);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast('Lỗi upload: ' + (err.message || err), 'error');
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString('vi-VN')}] ❌ Lỗi: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Drag-and-drop actions
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        parseFile(file);
      } else {
        alert('Vui lòng chỉ tải lên file định dạng Excel (.xlsx, .xls) hoặc CSV.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setFileName(null);
    setFileSize(null);
    setWorkbookData([]);
    setActiveSheetIdx(0);
    setSearchTerm('');
    setSyncLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Tự động kiểm tra và thêm công trình mới vào danh mục hệ thống nếu có công trình phát sinh từ các sheet dữ liệu khác
  const ensureProjectExists = (rawProjId: string, rawProjName?: string): string => {
    if (!rawProjId) return 'unknown';
    
    const id = rawProjId.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!id) return 'unknown';

    const exists = projects.some(p => p.id === id);
    if (!exists) {
      // Tự sinh tên đẹp từ mã ID dự án
      const displayProjName = rawProjName || id.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const newProj: Project = {
        id,
        name: displayProjName,
        fullName: `Dự án ${displayProjName}`,
        manager: 'Ban điều hành PMO',
        budget: 15000000000,
        spent: 0,
        ipcPlanned: 15000000000,
        ipcActual: 0,
        progressPlanned: 10,
        progressActual: 0,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'On Track',
        revenue: 17250000000,
        costPlan: 15000000000,
        costActual: 0,
        outstandingBudget: 15000000000,
        variance: 0
      };

      setProjects(prev => {
        if (prev.some(p => p.id === id)) return prev;
        return [...prev, newProj];
      });

      const time = new Date().toLocaleTimeString('vi-VN');
      setSyncLogs(prev => [...prev, `[${time}] 🛠️ [Tự động] Phát hiện công trình mới "${displayProjName}" (${id}) từ tệp liên kết. Đã đồng bộ thêm vào danh mục công trình hệ thống.`]);
    }
    return id;
  };

  // Sync execution handlers for each target module
  const executeSync = (targetModule: 'projects' | 'employees' | 'contracts' | 'milestones' | 'issues') => {
    const sheetName = targetSheets[targetModule];
    if (!sheetName) {
      alert(`Vui lòng chọn sheet dữ liệu tương ứng cho mô-đun ${targetModule.toUpperCase()}`);
      return;
    }

    const sheet = workbookData.find(s => s.sheetName === sheetName);
    if (!sheet) {
      alert(`Không tìm thấy sheet "${sheetName}" trong file.`);
      return;
    }

    const mode = syncModes[targetModule];
    const logTime = new Date().toLocaleTimeString('vi-VN');

    try {
      if (targetModule === 'projects') {
        const headers = sheet.headers.map(h => h.toLowerCase().trim());
        const idxId = headers.findIndex(h => h === 'mã dự án' || h === 'id' || h.includes('mã'));
        const idxName = headers.findIndex(h => h === 'tên dự án' || h === 'name' || h.includes('tên dự án') || h === 'tên');
        const idxFullName = headers.findIndex(h => h === 'tên đầy đủ' || h === 'full name' || h.includes('đầy đủ'));
        const idxManager = headers.findIndex(h => h === 'quản lý' || h === 'manager' || h.includes('quản lý'));
        const idxBudget = headers.findIndex(h => h === 'ngân sách' || h === 'budget' || h.includes('ngân sách'));
        const idxSpent = headers.findIndex(h => h === 'đã chi' || h === 'spent' || h.includes('đã chi'));
        const idxIpcPlanned = headers.findIndex(h => h === 'kế hoạch ipc' || h === 'ipc planned' || h.includes('kế hoạch ipc'));
        const idxIpcActual = headers.findIndex(h => h === 'đã xuất ipc' || h === 'ipc actual' || h.includes('đã xuất ipc') || h.includes('thực tế ipc'));
        const idxProgressPlanned = headers.findIndex(h => h === 'tiến độ kế hoạch (%)' || h === 'tiến độ kế hoạch' || h.includes('tiến độ kế hoạch'));
        const idxProgressActual = headers.findIndex(h => h === 'tiến độ thực tế (%)' || h === 'tiến độ thực tế' || h.includes('tiến độ thực tế') || h.includes('thực tế'));
        const idxStartDate = headers.findIndex(h => h === 'ngày bắt đầu' || h === 'start date' || h.includes('bắt đầu'));
        const idxEndDate = headers.findIndex(h => h === 'ngày kết thúc' || h === 'end date' || h.includes('kết thúc'));
        const idxStatus = headers.findIndex(h => h === 'trạng thái' || h === 'status' || h.includes('trạng thái'));
        const idxRevenue = headers.findIndex(h => h === 'doanh thu' || h === 'revenue' || h.includes('doanh thu'));
        const idxCostPlan = headers.findIndex(h => h === 'chi phí kế hoạch' || h === 'cost plan' || h.includes('chi phí kế hoạch'));
        const idxCostActual = headers.findIndex(h => h === 'chi phí thực tế' || h === 'cost actual' || h.includes('chi phí thực tế'));
        const idxOutstanding = headers.findIndex(h => h === 'ngân sách còn lại' || h === 'outstanding budget' || h.includes('còn lại'));
        const idxVariance = headers.findIndex(h => h === 'độ lệch' || h === 'variance' || h.includes('độ lệch') || h.includes('lệch'));

        const parseNum = (val: any): number => {
          if (val === undefined || val === null || val === '') return 0;
          if (typeof val === 'number') return val;
          const clean = String(val).replace(/[^0-9.-]/g, '');
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };

        const parsed: Project[] = sheet.rows.map((row, rIdx) => {
          const rawId = idxId !== -1 ? String(row[idxId]).trim() : '';
          const name = idxName !== -1 && row[idxName] ? String(row[idxName]).trim() : `Công trình ${rIdx + 1}`;
          const id = rawId || name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

          const budget = idxBudget !== -1 ? parseNum(row[idxBudget]) : 15000000000;
          const spent = idxSpent !== -1 ? parseNum(row[idxSpent]) : 0;
          const progressPlanned = idxProgressPlanned !== -1 ? parseNum(row[idxProgressPlanned]) : 10;
          const progressActual = idxProgressActual !== -1 ? parseNum(row[idxProgressActual]) : 0;
          
          const rawStart = idxStartDate !== -1 ? String(row[idxStartDate]).trim() : '';
          const rawEnd = idxEndDate !== -1 ? String(row[idxEndDate]).trim() : '';
          
          const startDate = rawStart ? formatDateString(rawStart) : '2026-01-01';
          const endDate = rawEnd ? formatDateString(rawEnd) : '2026-12-31';

          const rawStatus = idxStatus !== -1 ? String(row[idxStatus]).trim() : 'On Track';
          let status: 'On Track' | 'At Risk' | 'Delayed' | 'Completed' = 'On Track';
          if (rawStatus.toLowerCase().includes('risk') || rawStatus.toLowerCase().includes('rủi ro')) status = 'At Risk';
          else if (rawStatus.toLowerCase().includes('delay') || rawStatus.toLowerCase().includes('chậm') || rawStatus.toLowerCase().includes('trễ')) status = 'Delayed';
          else if (rawStatus.toLowerCase().includes('complete') || rawStatus.toLowerCase().includes('hoàn thành')) status = 'Completed';

          const ipcPlanned = idxIpcPlanned !== -1 ? parseNum(row[idxIpcPlanned]) : budget;
          const ipcActual = idxIpcActual !== -1 ? parseNum(row[idxIpcActual]) : spent;
          const revenue = idxRevenue !== -1 ? parseNum(row[idxRevenue]) : Math.round(budget * 1.15);
          const costPlan = idxCostPlan !== -1 ? parseNum(row[idxCostPlan]) : budget;
          const costActual = idxCostActual !== -1 ? parseNum(row[idxCostActual]) : spent;
          const outstandingBudget = idxOutstanding !== -1 ? parseNum(row[idxOutstanding]) : Math.max(0, budget - spent);
          const variance = idxVariance !== -1 ? parseNum(row[idxVariance]) : 0;

          return {
            id,
            name,
            fullName: idxFullName !== -1 && row[idxFullName] ? String(row[idxFullName]).trim() : `Dự án ${name}`,
            manager: idxManager !== -1 && row[idxManager] ? String(row[idxManager]).trim() : 'PMO',
            budget,
            spent,
            ipcPlanned,
            ipcActual,
            progressPlanned,
            progressActual,
            startDate,
            endDate,
            status,
            revenue,
            costPlan,
            costActual,
            outstandingBudget,
            variance
          };
        });

        if (mode === 'overwrite') {
          setProjects(parsed);
        } else {
          setProjects(prev => {
            const merged = [...prev];
            parsed.forEach(p => {
              const exIdx = merged.findIndex(x => x.id === p.id);
              if (exIdx !== -1) merged[exIdx] = p;
              else merged.push(p);
            });
            return merged;
          });
        }
        setSyncLogs(prev => [...prev, `[${logTime}] ✅ Đồng bộ thành công ${parsed.length} danh mục công trình vào hệ thống.`]);
        triggerToast(`Đã đồng bộ ${parsed.length} công trình thành công!`, 'success');

      } else if (targetModule === 'employees') {
        const headers = sheet.headers.map(h => h.toLowerCase().trim());
        const idxId = headers.findIndex(h => h === 'mã nhân sự' || h === 'id' || h === 'mã' || h === 'stt');
        const idxName = headers.findIndex(h => h === 'họ tên nhân viên' || h === 'name' || h === 'họ tên' || h.includes('họ tên') || h === 'tên');
        const idxDept = headers.findIndex(h => h === 'bộ phận' || h === 'department' || h.includes('bộ phận'));
        const idxTitle = headers.findIndex(h => h === 'vị trí công tác' || h === 'title' || h.includes('vị trí'));
        const idxDesc = headers.findIndex(h => h === 'mô tả công việc' || h === 'description' || h.includes('mô tả'));
        const idxKpi = headers.findIndex(h => h === 'kpi');
        const idxSalary = headers.findIndex(h => h === 'lương' || h === 'salary' || h.includes('lương'));
        const idxInsurance = headers.findIndex(h => h === 'bảo hiểm' || h === 'insurance' || h.includes('bảo hiểm'));
        const idxAllowance = headers.findIndex(h => h === 'phụ cấp' || h === 'allowance' || h.includes('phụ cấp'));
        const idxCost = headers.findIndex(h => h === 'chi phí nhân sự' || h === 'cost' || h.includes('chi phí'));
        const idxLevel = headers.findIndex(h => h === 'cấp bậc' || h === 'level' || h.includes('cấp bậc'));
        const idxSegment = headers.findIndex(h => h === 'phân khúc' || h === 'segment' || h.includes('phân khúc'));
        const idxBranch = headers.findIndex(h => h === 'chi nhánh' || h === 'branch' || h.includes('chi nhánh'));
        const idxQual = headers.findIndex(h => h === 'trình độ' || h === 'qualification' || h.includes('trình độ'));
        const idxCert = headers.findIndex(h => h === 'chứng chỉ' || h === 'certifications' || h.includes('chứng chỉ'));
        const idxGrade = headers.findIndex(h => h === 'xếp loại' || h === 'grade' || h.includes('xếp loại'));
        const idxStatus = headers.findIndex(h => h === 'trạng thái hoạt động' || h === 'status' || h.includes('trạng thái'));

        const parsed: Employee[] = sheet.rows.map((row, rIdx) => {
          const rawId = idxId !== -1 ? parseInt(String(row[idxId]).replace(/[^0-9]/g, ''), 10) : NaN;
          const id = !isNaN(rawId) ? rawId : rIdx + 2001;
          const name = idxName !== -1 && row[idxName] ? String(row[idxName]).trim() : `Nhân viên ${rIdx + 1}`;
          
          const rawStatus = idxStatus !== -1 ? String(row[idxStatus]).trim().toLowerCase() : 'active';
          let status: 'Active' | 'On Leave' | 'Standby' = 'Active';
          if (rawStatus.includes('leave') || rawStatus.includes('phép')) status = 'On Leave';
          else if (rawStatus.includes('standby') || rawStatus.includes('chờ')) status = 'Standby';

          return {
            id,
            department: idxDept !== -1 && row[idxDept] ? String(row[idxDept]).trim() : 'PMO',
            name,
            title: idxTitle !== -1 && row[idxTitle] ? String(row[idxTitle]).trim() : 'Kỹ sư kỹ thuật',
            description: idxDesc !== -1 && row[idxDesc] ? String(row[idxDesc]).trim() : 'Nhân sự điều phối dự án',
            kpi: idxKpi !== -1 && row[idxKpi] ? String(row[idxKpi]).trim() : '85%',
            salary: idxSalary !== -1 && row[idxSalary] ? String(row[idxSalary]).trim() : '20,000,000 đ',
            insurance: idxInsurance !== -1 && row[idxInsurance] ? String(row[idxInsurance]).trim() : 'Bảo hiểm đầy đủ',
            allowance: idxAllowance !== -1 && row[idxAllowance] ? String(row[idxAllowance]).trim() : '0 đ',
            cost: idxCost !== -1 && row[idxCost] ? String(row[idxCost]).trim() : (idxSalary !== -1 && row[idxSalary] ? String(row[idxSalary]).trim() : '20,000,000 đ'),
            level: idxLevel !== -1 && row[idxLevel] ? String(row[idxLevel]).trim() : 'Senior',
            segment: idxSegment !== -1 && row[idxSegment] ? String(row[idxSegment]).trim() : 'Khối công trường',
            branch: idxBranch !== -1 && row[idxBranch] ? String(row[idxBranch]).trim() : 'Ban Chỉ Huy',
            qualification: idxQual !== -1 && row[idxQual] ? String(row[idxQual]).trim() : 'Đại học',
            certifications: idxCert !== -1 && row[idxCert] ? String(row[idxCert]).trim() : 'Không có',
            grade: idxGrade !== -1 && row[idxGrade] ? String(row[idxGrade]).trim() : 'Hạng 2',
            status
          };
        });

        if (mode === 'overwrite') {
          setEmployees(parsed);
        } else {
          setEmployees(prev => {
            const merged = [...prev];
            parsed.forEach(e => {
              const exIdx = merged.findIndex(x => x.id === e.id);
              if (exIdx !== -1) merged[exIdx] = e;
              else merged.push(e);
            });
            return merged;
          });
        }
        setSyncLogs(prev => [...prev, `[${logTime}] 👥 ✅ Đồng bộ thành công ${parsed.length} cán bộ nhân sự vào hệ thống.`]);
        triggerToast(`Đã đồng bộ ${parsed.length} cán bộ thành công!`, 'success');

      } else if (targetModule === 'contracts') {
        const headers = sheet.headers.map(h => h.toLowerCase().trim());
        const idxId = headers.findIndex(h => h === 'số hợp đồng' || h === 'id' || h.includes('số hợp đồng') || h.includes('hợp đồng'));
        const idxProjId = headers.findIndex(h => h === 'dự án' || h === 'project' || h.includes('dự án'));
        const idxName = headers.findIndex(h => h === 'tên hợp đồng' || h === 'name' || h.includes('tên hợp đồng'));
        const idxSign = headers.findIndex(h => h === 'ngày ký' || h === 'sign date' || h.includes('ngày ký'));
        const idxAmount = headers.findIndex(h => h === 'số tiền' || h === 'amount' || h.includes('số tiền'));
        const idxIpc = headers.findIndex(h => h === 'ipc' || h === 'ipc amount' || h.includes('ipc'));
        const idxBudget = headers.findIndex(h => h === 'ngân sách' || h === 'budget' || h.includes('ngân sách'));
        const idxStart = headers.findIndex(h => h === 'ngày bắt đầu' || h === 'start date' || h.includes('ngày bắt đầu'));
        const idxEnd = headers.findIndex(h => h === 'ngày kết thúc' || h === 'end date' || h.includes('ngày kết thúc'));
        const idxContent = headers.findIndex(h => h === 'nội dung' || h === 'content' || h.includes('nội dung'));
        const idxStatus = headers.findIndex(h => h === 'tình trạng' || h === 'status' || h.includes('tình trạng'));

        const parseNum = (val: any): number => {
          if (val === undefined || val === null || val === '') return 0;
          if (typeof val === 'number') return val;
          const clean = String(val).replace(/[^0-9.-]/g, '');
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };

        const parsed: Contract[] = sheet.rows.map((row, rIdx) => {
          const rawId = idxId !== -1 ? String(row[idxId]).trim() : '';
          const id = rawId || `HD-${rIdx + 4001}`;
          
          const rawProjId = idxProjId !== -1 ? String(row[idxProjId]).trim() : '';
          const projectId = ensureProjectExists(rawProjId);

          const name = idxName !== -1 && row[idxName] ? String(row[idxName]).trim() : 'Gói thầu thiết bị phụ trợ';
          
          const amount = idxAmount !== -1 ? parseNum(row[idxAmount]) : 0;
          const ipcAmount = idxIpc !== -1 ? parseNum(row[idxIpc]) : 0;
          const budgetVal = idxBudget !== -1 ? parseNum(row[idxBudget]) : amount;

          const rawSign = idxSign !== -1 ? String(row[idxSign]).trim() : '';
          const signDate = rawSign ? formatDateString(rawSign) : '2026-04-01';

          const rawStart = idxStart !== -1 ? String(row[idxStart]).trim() : '';
          const startDate = rawStart ? formatDateString(rawStart) : signDate;

          const rawEnd = idxEnd !== -1 ? String(row[idxEnd]).trim() : '';
          const endDate = rawEnd ? formatDateString(rawEnd) : '2026-12-31';

          const content = idxContent !== -1 && row[idxContent] ? String(row[idxContent]).trim() : name;

          const rawStatus = idxStatus !== -1 ? String(row[idxStatus]).trim().toLowerCase() : 'active';
          let status: 'Pending' | 'Active' | 'Completed' = 'Active';
          if (rawStatus.includes('pending') || rawStatus.includes('chờ')) status = 'Pending';
          else if (rawStatus.includes('complete') || rawStatus.includes('xong')) status = 'Completed';

          return {
            id,
            projectId,
            name,
            signDate,
            amount,
            ipcAmount,
            budget: budgetVal,
            startDate,
            endDate,
            content,
            status
          };
        });

        if (mode === 'overwrite') {
          setContracts(parsed);
        } else {
          setContracts(prev => {
            const merged = [...prev];
            parsed.forEach(c => {
              const exIdx = merged.findIndex(x => x.id === c.id);
              if (exIdx !== -1) merged[exIdx] = c;
              else merged.push(c);
            });
            return merged;
          });
        }
        setSyncLogs(prev => [...prev, `[${logTime}] 💼 ✅ Đồng bộ thành công ${parsed.length} hợp đồng & tài chính.`]);
        triggerToast(`Đã đồng bộ ${parsed.length} hợp đồng vào hệ thống!`, 'success');

      } else if (targetModule === 'milestones') {
        const headers = sheet.headers.map(h => h.toLowerCase().trim());
        const idxId = headers.findIndex(h => h === 'mã mốc' || h === 'id' || h.includes('mã mốc') || h.includes('mã'));
        const idxProjId = headers.findIndex(h => h === 'dự án' || h === 'project' || h.includes('dự án'));
        const idxName = headers.findIndex(h => h === 'tên mốc' || h === 'name' || h.includes('tên mốc') || h.includes('mốc'));
        const idxDue = headers.findIndex(h => h === 'hạn hoàn thành' || h === 'due date' || h.includes('hạn'));
        const idxStatus = headers.findIndex(h => h === 'trạng thái' || h === 'status' || h.includes('trạng thái'));

        const parsed: Milestone[] = sheet.rows.map((row, rIdx) => {
          const rawId = idxId !== -1 ? String(row[idxId]).trim() : '';
          const id = rawId || `MS-${rIdx + 6001}`;
          
          const rawProjId = idxProjId !== -1 ? String(row[idxProjId]).trim() : '';
          const projectId = ensureProjectExists(rawProjId);

          const name = idxName !== -1 && row[idxName] ? String(row[idxName]).trim() : `Mốc công việc hoàn thành ${rIdx + 1}`;
          const rawDue = idxDue !== -1 ? String(row[idxDue]).trim() : '';
          const dueDate = rawDue ? formatDateString(rawDue) : '2026-11-30';

          const rawStatus = idxStatus !== -1 ? String(row[idxStatus]).trim().toLowerCase() : 'pending';
          let status: 'Completed' | 'Pending' | 'Overdue' = 'Pending';
          if (rawStatus.includes('complete') || rawStatus.includes('xong')) status = 'Completed';
          else if (rawStatus.includes('overdue') || rawStatus.includes('trễ')) status = 'Overdue';

          return {
            id,
            projectId,
            name,
            dueDate,
            status
          };
        });

        if (mode === 'overwrite') {
          setMilestones(parsed);
        } else {
          setMilestones(prev => {
            const merged = [...prev];
            parsed.forEach(m => {
              const exIdx = merged.findIndex(x => x.id === m.id);
              if (exIdx !== -1) merged[exIdx] = m;
              else merged.push(m);
            });
            return merged;
          });
        }
        setSyncLogs(prev => [...prev, `[${logTime}] 📅 ✅ Đồng bộ thành công ${parsed.length} mốc tiến độ.`]);
        triggerToast(`Đã đồng bộ ${parsed.length} mốc tiến độ!`, 'success');

      } else if (targetModule === 'issues') {
        const headers = sheet.headers.map(h => h.toLowerCase().trim());
        const idxId = headers.findIndex(h => h === 'mã sự cố' || h === 'id' || h.includes('mã sự cố') || h.includes('sự cố'));
        const idxProjId = headers.findIndex(h => h === 'dự án' || h === 'project' || h.includes('dự án'));
        const idxProjName = headers.findIndex(h => h === 'tên dự án' || h === 'project name' || h.includes('tên dự án'));
        const idxLogged = headers.findIndex(h => h === 'ngày ghi nhận' || h === 'logged date' || h.includes('ngày ghi nhận'));
        const idxAssignee = headers.findIndex(h => h === 'người phụ trách' || h === 'assignee' || h.includes('phụ trách'));
        const idxIssue = headers.findIndex(h => h === 'vấn đề phát sinh' || h === 'issue' || h.includes('vấn đề') || h.includes('vướng mắc'));
        const idxAction = headers.findIndex(h => h === 'giải pháp hành động' || h === 'action' || h.includes('giải pháp') || h.includes('hành động'));
        const idxResult = headers.findIndex(h => h === 'kết quả' || h === 'result' || h.includes('kết quả'));
        const idxVo = headers.findIndex(h => h === 'trị giá phát sinh vo' || h === 'vo amount' || h.includes('trị giá phát sinh') || h.includes('vo'));
        const idxBudget = headers.findIndex(h => h === 'ngân sách phòng ngừa' || h === 'budget' || h.includes('ngân sách'));
        const idxTarget = headers.findIndex(h => h === 'dự kiến hoàn thành' || h === 'target complete' || h.includes('dự kiến'));
        const idxActual = headers.findIndex(h => h === 'thực tế hoàn thành' || h === 'actual complete' || h.includes('thực tế hoàn thành') || h.includes('thực tế'));
        const idxStatus = headers.findIndex(h => h === 'tình trạng' || h === 'status' || h.includes('tình trạng') || h.includes('trạng thái'));

        const parseNum = (val: any): number => {
          if (val === undefined || val === null || val === '') return 0;
          if (typeof val === 'number') return val;
          const clean = String(val).replace(/[^0-9.-]/g, '');
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };

        const parsed: Issue[] = sheet.rows.map((row, rIdx) => {
          const rawId = idxId !== -1 ? String(row[idxId]).trim() : '';
          const id = rawId || `ISS-${rIdx + 8001}`;
          
          const rawProjId = idxProjId !== -1 ? String(row[idxProjId]).trim() : '';
          const projectId = ensureProjectExists(rawProjId);
          const matchedProj = projects.find(p => p.id === projectId);
          const projectName = idxProjName !== -1 && row[idxProjName] ? String(row[idxProjName]).trim() : (matchedProj?.name || projectId.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '));

          const rawLogged = idxLogged !== -1 ? String(row[idxLogged]).trim() : '';
          const loggedDate = rawLogged ? formatDateString(rawLogged) : '2026-05-15';
          
          const assignee = idxAssignee !== -1 && row[idxAssignee] ? String(row[idxAssignee]).trim() : 'Nguyễn Duy Tân';
          const issueText = idxIssue !== -1 && row[idxIssue] ? String(row[idxIssue]).trim() : 'Vướng mắc thi công phát sinh.';
          const actionText = idxAction !== -1 && row[idxAction] ? String(row[idxAction]).trim() : 'Đang xử lý hồ sơ.';
          const resultText = idxResult !== -1 && row[idxResult] ? String(row[idxResult]).trim() : '';
          
          const voAmount = idxVo !== -1 ? parseNum(row[idxVo]) : 0;
          const budgetVal = idxBudget !== -1 ? parseNum(row[idxBudget]) : 0;

          const rawTarget = idxTarget !== -1 ? String(row[idxTarget]).trim() : '';
          const targetComplete = rawTarget ? formatDateString(rawTarget) : '2026-07-31';

          const rawActual = idxActual !== -1 ? String(row[idxActual]).trim() : '';
          const actualComplete = rawActual ? formatDateString(rawActual) : '';

          const rawStatus = idxStatus !== -1 ? String(row[idxStatus]).trim().toLowerCase() : 'opened';
          let status: 'Opened' | 'In Progress' | 'Closed' = 'Opened';
          if (rawStatus.includes('progress') || rawStatus.includes('tiến trình') || rawStatus.includes('đang')) status = 'In Progress';
          else if (rawStatus.includes('closed') || rawStatus.includes('đóng') || rawStatus.includes('xong')) status = 'Closed';

          return {
            id,
            projectId,
            projectName,
            loggedDate,
            assignee,
            issueText,
            actionText,
            resultText,
            voAmount,
            budget: budgetVal,
            targetComplete,
            actualComplete,
            status
          };
        });

        if (mode === 'overwrite') {
          setIssues(parsed);
        } else {
          setIssues(prev => {
            const merged = [...prev];
            parsed.forEach(i => {
              const exIdx = merged.findIndex(x => x.id === i.id);
              if (exIdx !== -1) merged[exIdx] = i;
              else merged.push(i);
            });
            return merged;
          });
        }
        setSyncLogs(prev => [...prev, `[${logTime}] ⚠️ ✅ Đồng bộ thành công ${parsed.length} lỗi vướng mắc và sự cố.`]);
        triggerToast(`Đã đồng bộ ${parsed.length} nhật ký vướng mắc!`, 'success');
      }

    } catch (err: any) {
      console.error(err);
      setSyncLogs(prev => [...prev, `[${logTime}] ❌ Thất bại khi đồng bộ mô-đun ${targetModule.toUpperCase()}: ${err.message || err}`]);
      alert(`Có lỗi xảy ra khi trích xuất hoặc đồng bộ dữ liệu: ${err.message || err}`);
    }
  };

  // Synchronize all modules in 1 click
  const syncAllModules = () => {
    let syncedCount = 0;
    const modules: ('projects' | 'employees' | 'contracts' | 'milestones' | 'issues')[] = [
      'projects', 'employees', 'contracts', 'milestones', 'issues'
    ];

    modules.forEach(mod => {
      if (targetSheets[mod]) {
        executeSync(mod);
        syncedCount++;
      }
    });

    if (syncedCount > 0) {
      triggerToast('Đã kích hoạt đồng bộ hóa toàn bộ các bảng dữ liệu khớp!', 'success');
    } else {
      alert('Không tìm thấy bảng tính nào phù hợp với bộ lọc tự động để đồng bộ.');
    }
  };

  // Filtered rows for Excel preview grid
  const getFilteredRows = (sheet: SheetData) => {
    if (!searchTerm.trim()) return sheet.rows;
    const term = searchTerm.toLowerCase();
    return sheet.rows.filter(row => 
      row.some(cell => 
        cell !== null && cell !== undefined && String(cell).toLowerCase().includes(term)
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Lịch sử & duyệt upload (admin + GĐĐH mới áp dụng file) */}
      <UploadHistory authUser={authUser} refreshKey={uploadRefreshKey} triggerToast={triggerToast} />

      {!libLoaded && !loadError && (
        <div className="bg-blue-50 border border-blue-200/50 rounded-xl p-4 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <span className="text-xs font-semibold text-blue-800 font-sans">
            Đang tải trình biên dịch cấu trúc Excel (SheetJS API) bảo mật...
          </span>
        </div>
      )}

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs font-sans">
            <p className="font-bold">Lỗi khởi tạo tính năng:</p>
            <p className="mt-0.5 text-rose-700 font-medium">{loadError}</p>
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      {workbookData.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-50/30 shadow-inner' 
              : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50/30 shadow-2xs'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 ${
            isDragging ? 'bg-emerald-100 text-emerald-600 scale-110' : 'bg-[#800000]/10 text-[#800000]'
          }`}>
            {loading ? (
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="font-extrabold text-slate-800 text-sm">
              {loading ? 'Đang trích xuất cấu trúc dữ liệu...' : 'Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Khi tải file lên, hệ thống sẽ tự động bóc tách các Sheet để ánh xạ, cho phép bạn lựa chọn đè hoặc gộp trực tiếp vào website.
            </p>

            <div className="pt-3">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#800000] hover:bg-[#990000] text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                Chọn file từ thiết bị của bạn
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Sync Control Center & Spreadsheet Preview */}
      {workbookData.length > 0 && (
        <div className="space-y-6">
          {/* 1. MAPPING MANAGEMENT GRID */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Header banner style maroon */}
            <div className="bg-[#800000] text-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Trung Tâm Điều Phối & Ánh Xạ Đồng Bộ Dữ Liệu</span>
                </h3>
                <p className="text-[10px] text-slate-200 font-sans mt-0.5">
                  Chọn sheet từ file vừa tải lên để đè hoặc ghép trực tiếp vào các mô-đun dữ liệu chính của website.
                </p>
              </div>

              <button
                onClick={syncAllModules}
                className="px-3.5 py-1.5 bg-white text-[#800000] hover:bg-slate-100 font-black text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>ĐỒNG BỘ TOÀN BỘ CÁC BẢNG KHỚP</span>
              </button>
            </div>

            {/* Sync control modules card-deck */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50">
              {/* TARGET 1: PROJECTS */}
              <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-3xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                      <Layers className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                      CÔNG TRÌNH
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs mt-2">1. Danh mục Dự án</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                    Dữ liệu cho Dashboard tổng quan, tiến độ trung bình, ngân sách vĩ mô.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500">Sheet nguồn:</label>
                  <select
                    value={targetSheets.projects}
                    onChange={(e) => setTargetSheets(prev => ({ ...prev, projects: e.target.value }))}
                    className="w-full text-xs font-semibold p-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Bỏ qua --</option>
                    {workbookData.map(s => (
                      <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, projects: 'overwrite' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.projects === 'overwrite' 
                          ? 'bg-rose-50 border-rose-300 text-rose-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                      title="Xoá dữ liệu cũ trên website và ghi đè bằng bảng mới"
                    >
                      Đè
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, projects: 'merge' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.projects === 'merge' 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                      title="Ghép thêm vào danh sách hiện tại dựa theo mã khóa"
                    >
                      Gộp
                    </button>
                  </div>

                  <button
                    onClick={() => executeSync('projects')}
                    disabled={!targetSheets.projects}
                    className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Đồng bộ</span>
                  </button>
                </div>
              </div>

              {/* TARGET 2: EMPLOYEES */}
              <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-3xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                      <Users className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                      NHÂN SỰ
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs mt-2">2. Hồ sơ Nhân lực</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                    Sơ đồ cán bộ, kỹ sư hiện trường, bảng phân vùng và thang lương.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500">Sheet nguồn:</label>
                  <select
                    value={targetSheets.employees}
                    onChange={(e) => setTargetSheets(prev => ({ ...prev, employees: e.target.value }))}
                    className="w-full text-xs font-semibold p-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Bỏ qua --</option>
                    {workbookData.map(s => (
                      <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, employees: 'overwrite' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.employees === 'overwrite' 
                          ? 'bg-rose-50 border-rose-300 text-rose-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Đè
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, employees: 'merge' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.employees === 'merge' 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Gộp
                    </button>
                  </div>

                  <button
                    onClick={() => executeSync('employees')}
                    disabled={!targetSheets.employees}
                    className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Đồng bộ</span>
                  </button>
                </div>
              </div>

              {/* TARGET 3: CONTRACTS */}
              <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-3xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                      <DollarSign className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                      TÀI CHÍNH
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs mt-2">3. Hợp đồng & Chi phí</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                    Hợp đồng chính, thầu phụ, giá trị phụ lục, tiến trình giải ngân IPC.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500">Sheet nguồn:</label>
                  <select
                    value={targetSheets.contracts}
                    onChange={(e) => setTargetSheets(prev => ({ ...prev, contracts: e.target.value }))}
                    className="w-full text-xs font-semibold p-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">-- Bỏ qua --</option>
                    {workbookData.map(s => (
                      <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, contracts: 'overwrite' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.contracts === 'overwrite' 
                          ? 'bg-rose-50 border-rose-300 text-rose-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Đè
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, contracts: 'merge' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.contracts === 'merge' 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Gộp
                    </button>
                  </div>

                  <button
                    onClick={() => executeSync('contracts')}
                    disabled={!targetSheets.contracts}
                    className="w-full py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Đồng bộ</span>
                  </button>
                </div>
              </div>

              {/* TARGET 4: MILESTONES */}
              <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-3xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                      LỊCH TRÌNH
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs mt-2">4. Tiến độ Mốc chỉ số</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                    Theo dõi các mốc nghiệm thu, bàn giao, đóng móng tháp, kéo dây.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500">Sheet nguồn:</label>
                  <select
                    value={targetSheets.milestones}
                    onChange={(e) => setTargetSheets(prev => ({ ...prev, milestones: e.target.value }))}
                    className="w-full text-xs font-semibold p-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Bỏ qua --</option>
                    {workbookData.map(s => (
                      <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, milestones: 'overwrite' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.milestones === 'overwrite' 
                          ? 'bg-rose-50 border-rose-300 text-rose-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Đè
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, milestones: 'merge' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.milestones === 'merge' 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Gộp
                    </button>
                  </div>

                  <button
                    onClick={() => executeSync('milestones')}
                    disabled={!targetSheets.milestones}
                    className="w-full py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Đồng bộ</span>
                  </button>
                </div>
              </div>

              {/* TARGET 5: ISSUES */}
              <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-3xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-100">
                      SỰ CỐ
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs mt-2">5. Sự cố & Vướng mắc</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                    Sự vụ phát sinh, nhật ký sửa chữa bảo hành, giá trị chờ duyệt VO.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500">Sheet nguồn:</label>
                  <select
                    value={targetSheets.issues}
                    onChange={(e) => setTargetSheets(prev => ({ ...prev, issues: e.target.value }))}
                    className="w-full text-xs font-semibold p-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="">-- Bỏ qua --</option>
                    {workbookData.map(s => (
                      <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, issues: 'overwrite' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.issues === 'overwrite' 
                          ? 'bg-rose-50 border-rose-300 text-rose-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Đè
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncModes(prev => ({ ...prev, issues: 'merge' }))}
                      className={`flex-1 py-0.5 text-[9px] font-bold rounded text-center border transition-all ${
                        syncModes.issues === 'merge' 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Gộp
                    </button>
                  </div>

                  <button
                    onClick={() => executeSync('issues')}
                    disabled={!targetSheets.issues}
                    className="w-full py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded flex items-center justify-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Đồng bộ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sync logs output console */}
            {syncLogs.length > 0 && (
              <div className="bg-slate-900 text-slate-200 p-3.5 border-t border-slate-200 font-mono text-[10px] space-y-1">
                <p className="text-slate-400 font-bold uppercase tracking-wider mb-1.5 border-b border-slate-800 pb-1">
                  Nhật ký đồng bộ thời gian thực:
                </p>
                {syncLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">{log}</div>
                ))}
              </div>
            )}
          </div>

          {/* 2. LIVE SPREADSHEET VIEWER */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
            
            {/* File Meta Header bar */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-xs md:max-w-md" title={fileName || ''}>
                    {fileName}
                  </h4>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono font-bold">
                    Dung lượng: {fileSize} • Tổng cộng {workbookData.length} sheet
                  </span>
                </div>
              </div>

              {/* Viewer control actions */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {/* Search filter input */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Lọc dòng nhanh..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-semibold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  onClick={handleClear}
                  className="p-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                  title="Đóng tệp hiện tại"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab selection for Sheet view */}
            {workbookData.length > 1 && (
              <div className="bg-slate-100/60 p-2 border-b border-slate-200 flex items-center gap-1 overflow-x-auto select-none scrollbar-thin">
                <span className="text-[9px] uppercase font-bold text-slate-400 px-2 shrink-0">
                  Xem chi tiết các Sheet:
                </span>
                {workbookData.map((sheet, idx) => {
                  // check if sheet has target
                  const isMapped = Object.values(targetSheets).includes(sheet.sheetName);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveSheetIdx(idx);
                        setSearchTerm('');
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        activeSheetIdx === idx
                          ? 'bg-white text-emerald-700 border border-slate-200 shadow-3xs'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      <span>{sheet.sheetName}</span>
                      {isMapped && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Table Spreadsheet grid rendering */}
            {(() => {
              const currentSheet = workbookData[activeSheetIdx];
              if (!currentSheet) return null;

              const filteredRows = getFilteredRows(currentSheet);

              return (
                <div className="flex flex-col flex-1">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="sticky top-0 bg-[#0f766e] text-white z-10 select-none shadow-xs">
                        <tr>
                          <th className="py-2.5 px-3 border-r border-[#115e59] text-[11px] font-bold text-center w-12 bg-[#115e59]">
                            #
                          </th>
                          {currentSheet.headers.map((hdr, hIdx) => (
                            <th 
                              key={hIdx} 
                              className="py-2.5 px-3 border-r border-[#115e59] text-[11px] uppercase font-bold tracking-wider"
                            >
                              {hdr || `Cột ${hIdx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-[12px] divide-y divide-slate-200 text-slate-700 font-semibold font-sans">
                        {filteredRows.map((row, rIdx) => (
                          <tr 
                            key={rIdx} 
                            className={`hover:bg-slate-50 transition-colors ${
                              rIdx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-400 font-mono font-bold bg-slate-50/50 w-12 select-none">
                              {rIdx + 1}
                            </td>
                            {currentSheet.headers.map((_, hIdx) => {
                              const cellVal = row[hIdx];
                              const cellStr = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                              return (
                                <td 
                                  key={hIdx} 
                                  className="py-2.5 px-3 border-r border-slate-200 font-medium truncate max-w-[220px]"
                                  title={cellStr}
                                >
                                  {cellStr}
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                        {filteredRows.length === 0 && (
                          <tr>
                            <td 
                              colSpan={currentSheet.headers.length + 1} 
                              className="py-12 text-center text-slate-400 italic"
                            >
                              Không tìm thấy dữ liệu khớp với bộ lọc.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] font-bold text-slate-500 font-sans gap-2 select-none">
                    <div className="flex items-center gap-2">
                      <Table className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Hiển thị {filteredRows.length} trên {currentSheet.rows.length} dòng
                      </span>
                      <span>•</span>
                      <span>
                        {currentSheet.headers.length} trường cột thông tin
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded px-2 py-0.5">
                      <Info className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Khi gán thành công, toàn bộ các bảng Dashboard, Tài chính, Nhân sự và Lịch trình sẽ tự động đồng bộ hóa tức thì!</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
