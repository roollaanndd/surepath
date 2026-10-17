import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import { createFinancingApplication, createFinancingApprovalWorkflow, decideFinancingApprovalStep, getFinancingOverview, getFinancingTransactionReport, listFinancingApprovalWorkflows, listFinancingApplicationDocuments, listFinancingApplications, listFinancingRepaymentSchedules, listFinancingRepayments, listFinancingLedgerJournals, getFinancingTrialBalance, recordFinancingRepayment, allocateFinancingRepayment, listFinancingReconciliationBatches, listFinancingReconciliationLines, importFinancingReconciliationBatch, reconcileFinancingStatementLine, uploadFinancingApplicationDocument, type FinancingApplicationRecord, type FinancingOverview, type FinancingProductCode, type FinancingRepaymentSchedule, type FinancingRepaymentRecord, type FinancingLedgerJournal, type FinancingTrialBalanceRow, type FinancingReconciliationBatch, type FinancingStatementLine, type FinancingApprovalStep, type FinancingApplicationDocument, type FinancingFinanceReportRow } from '../services/financingApi';
import { SitePageProps } from './site/siteKit';
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, Banknote,
  Bell, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, ChevronDown,
  ChevronRight, CircleDollarSign, ClipboardCheck, Clock3, CreditCard,
  FileCheck2, FileClock, FileText, FileSpreadsheet, FileUp, Download, Filter, Gauge, HandCoins, LayoutDashboard,
  ListChecks, Menu, Plus, Search, Settings2, ShieldCheck,
  Users, Wallet, X,
} from 'lucide-react';

type ModuleKey = 'overview' | 'applications' | 'customers' | 'credit' | 'approvals' | 'contracts' | 'disbursements' | 'repayments' | 'reconciliation' | 'collections' | 'products' | 'reports' | 'settings';

type Application = {
  id: string;
  databaseId?: string;
  customer: string;
  product: string;
  amount: number;
  submitted: string;
  status: string;
  owner: string;
  score: number;
};

const initialApplications: Application[] = [
  { id: 'SPF-260184', customer: 'PT Nusantara Logistik', product: 'Working Capital', amount: 750000000, submitted: '17 Oct 2026', status: 'Credit review', owner: 'D. Pratama', score: 78 },
  { id: 'SPF-260183', customer: 'CV Sinar Mobilindo', product: 'Motor Vehicle', amount: 285000000, submitted: '17 Oct 2026', status: 'Documents verified', owner: 'A. Putri', score: 84 },
  { id: 'SPF-260182', customer: 'PT Cipta Karya Mandiri', product: 'Heavy Equipment', amount: 1200000000, submitted: '16 Oct 2026', status: 'Offer prepared', owner: 'R. Saputra', score: 89 },
  { id: 'SPF-260181', customer: 'UD Berkah Niaga', product: 'Multipurpose', amount: 125000000, submitted: '16 Oct 2026', status: 'New application', owner: 'M. Yusuf', score: 0 },
  { id: 'SPF-260180', customer: 'PT Aruna Distribusi', product: 'Working Capital', amount: 480000000, submitted: '15 Oct 2026', status: 'Awaiting documents', owner: 'D. Pratama', score: 0 },
  { id: 'SPF-260179', customer: 'CV Mitra Perkasa', product: 'Motor Vehicle', amount: 198000000, submitted: '15 Oct 2026', status: 'Approved', owner: 'A. Putri', score: 91 },
];

const products = [
  { name: 'Motor Vehicle', sub: 'New & used vehicle financing', count: 42, color: '#60a5fa', rate: 'Partner-configured' },
  { name: 'Multipurpose', sub: 'Secured or unsecured personal', count: 28, color: '#a78bfa', rate: 'Partner-configured' },
  { name: 'Heavy Equipment', sub: 'Asset-backed business financing', count: 16, color: '#fbbf24', rate: 'Partner-configured' },
  { name: 'Working Capital', sub: 'SME cash-flow financing', count: 31, color: '#34d399', rate: 'Partner-configured' },
];

const rupiah = (amount: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(amount);

const mapApiApplications = (records: FinancingApplicationRecord[]): Application[] => records.map((record) => ({
  id: record.application_number,
  databaseId: record.id,
  customer: record.customer?.display_name ?? 'Customer',
  product: record.product?.name ?? record.product?.code ?? 'Financing',
  amount: Number(record.requested_amount),
  submitted: new Date(record.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  status: ({ NEW: 'New application', SUBMITTED: 'Submitted', DOCUMENTS_PENDING: 'Awaiting documents', VERIFICATION: 'Verification', CREDIT_REVIEW: 'Credit review', REFERRED: 'Referred', APPROVED: 'Approved', DECLINED: 'Rejected', OFFERED: 'Offer prepared', CONTRACTED: 'Contracted', BOOKED: 'Booked', CANCELLED: 'Cancelled' } as Record<string, string>)[record.status] ?? record.status,
  owner: 'Financing workspace',
  score: 0,
}));


const navGroups: { label: string; items: { key: ModuleKey; label: string; icon: React.ElementType; count?: string }[] }[] = [
  { label: 'WORKSPACE', items: [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'applications', label: 'Applications', icon: FileText, count: '128' },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'credit', label: 'Credit assessment', icon: Gauge, count: '24' },
    { key: 'approvals', label: 'Approval layering', icon: ListChecks },
  ]},
  { label: 'OPERATIONS', items: [
    { key: 'contracts', label: 'Contracts', icon: FileCheck2 },
    { key: 'disbursements', label: 'Disbursements', icon: Banknote },
    { key: 'repayments', label: 'Repayment ledger', icon: CreditCard },
    { key: 'reconciliation', label: 'Bank reconciliation', icon: ShieldCheck },
    { key: 'collections', label: 'Collections', icon: HandCoins, count: '8' },
  ]},
  { label: 'CONFIGURATION', items: [
    { key: 'products', label: 'Financing products', icon: BriefcaseBusiness },
    { key: 'reports', label: 'Reports & analytics', icon: Activity },
    { key: 'settings', label: 'Workspace settings', icon: Settings2 },
  ]},
];

const statusTone: Record<string, string> = {
  'Credit review': 'bg-violet-50 text-violet-700 ring-violet-200',
  'Documents verified': 'bg-sky-50 text-sky-700 ring-sky-200',
  'Offer prepared': 'bg-amber-50 text-amber-700 ring-amber-200',
  'New application': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Awaiting documents': 'bg-orange-50 text-orange-700 ring-orange-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  'In progress': 'bg-sky-50 text-sky-700 ring-sky-200',
};

const FinancingPage: React.FC<SitePageProps> = (props) => {
  // This is an isolated, fictional demo workspace. It is intentionally not a production auth session.
  // This prototype is intentionally a one-click sandbox, not a real auth session.
  // Open the dashboard immediately from its direct URL; no production identity is granted.
  const [demoEntered, setDemoEntered] = useState(() => {
    try { sessionStorage.setItem('sp_financing_demo_session', 'active'); } catch {}
    return true;
  });
  
  const [module, setModule] = useState<ModuleKey>('overview');
  const [backendMode, setBackendMode] = useState<'checking' | 'live' | 'demo' | 'forbidden'>('checking');
  const [liveOverview, setLiveOverview] = useState<FinancingOverview | null>(null);
  const [applications, setApplications] = useState(initialApplications);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [showNewApplication, setShowNewApplication] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newProduct, setNewProduct] = useState('Motor Vehicle');
  const [newCustomerType, setNewCustomerType] = useState<'INDIVIDUAL' | 'BUSINESS'>('BUSINESS');
  const [newTenor, setNewTenor] = useState('12');
  const [newAmount, setNewAmount] = useState('250000000');
  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [newDocumentType, setNewDocumentType] = useState('IDENTITY');
  const [approvalState, setApprovalState] = useState<'idle' | 'loading' | 'live' | 'forbidden' | 'error'>('idle');
  const [approvalSteps, setApprovalSteps] = useState<FinancingApprovalStep[]>([]);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [financeReportState, setFinanceReportState] = useState<'idle' | 'loading' | 'live' | 'forbidden' | 'error'>('idle');
  const [financeReportRows, setFinanceReportRows] = useState<FinancingFinanceReportRow[]>([]);
  const [financeReportTotals, setFinanceReportTotals] = useState<{ transaction_count: number; debit: number; credit: number; truncated: boolean } | null>(null);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'monthly' | 'custom'>('monthly');
  const [reportStartDate, setReportStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<FinancingApplicationDocument[]>([]);
  const [selectedDocumentsState, setSelectedDocumentsState] = useState<'idle' | 'loading' | 'live' | 'error'>('idle');
  const [selectedDocumentFiles, setSelectedDocumentFiles] = useState<File[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState('OTHER');
  const [selectedDocumentSaving, setSelectedDocumentSaving] = useState(false);
  const [servicingState, setServicingState] = useState<'idle' | 'loading' | 'live' | 'forbidden' | 'error'>('idle');
  const [liveSchedules, setLiveSchedules] = useState<FinancingRepaymentSchedule[]>([]);
  const [liveJournals, setLiveJournals] = useState<FinancingLedgerJournal[]>([]);
  const [trialBalance, setTrialBalance] = useState<FinancingTrialBalanceRow[]>([]);
  const [livePayments, setLivePayments] = useState<FinancingRepaymentRecord[]>([]);
  const [showRecordRepayment, setShowRecordRepayment] = useState(false);
  const [servicingSaving, setServicingSaving] = useState(false);
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState(() => crypto.randomUUID());
  const [allocationIdempotencyKey, setAllocationIdempotencyKey] = useState(() => crypto.randomUUID());
  const [showAllocateRepayment, setShowAllocateRepayment] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('1000000');
  const [paymentChannel, setPaymentChannel] = useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [allocationPaymentId, setAllocationPaymentId] = useState('');
  const [allocationScheduleId, setAllocationScheduleId] = useState('');
  const [allocationPrincipal, setAllocationPrincipal] = useState('0');
  const [allocationInterest, setAllocationInterest] = useState('0');
  const [allocationFees, setAllocationFees] = useState('0');
  const [reconciliationState, setReconciliationState] = useState<'idle' | 'loading' | 'live' | 'forbidden' | 'error'>('idle');
  const [reconciliationBatches, setReconciliationBatches] = useState<FinancingReconciliationBatch[]>([]);
  const [reconciliationLines, setReconciliationLines] = useState<FinancingStatementLine[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [lineTargetIds, setLineTargetIds] = useState<Record<string, string>>({});
  const [lineTargetTypes, setLineTargetTypes] = useState<Record<string, 'REPAYMENT' | 'DISBURSEMENT'>>({});
  const [showImportReconciliation, setShowImportReconciliation] = useState(false);
  const [statementReference, setStatementReference] = useState('');
  const [maskedBankAccount, setMaskedBankAccount] = useState('****1234');
  const [statementPeriodStart, setStatementPeriodStart] = useState(() => new Date().toISOString().slice(0,10));
  const [statementPeriodEnd, setStatementPeriodEnd] = useState(() => new Date().toISOString().slice(0,10));
  const [statementLinesJson, setStatementLinesJson] = useState('[]');
  const [reconciliationSaving, setReconciliationSaving] = useState(false);




  useEffect(() => {
    let active = true;
    Promise.all([listFinancingApplications(100), getFinancingOverview()])
      .then(([result, overview]) => {
        if (!active) return;
        setApplications(mapApiApplications(result.data));
        setLiveOverview(overview);
        setBackendMode('live');
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : '';
        setBackendMode(/FORBIDDEN|financing role|UNAUTHENTICATED|401|403/i.test(message) ? 'forbidden' : 'demo');
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (module !== 'repayments' || backendMode !== 'live') return;
    let active = true;
    setServicingState('loading');
    Promise.all([
      listFinancingRepaymentSchedules(100),
      listFinancingRepayments(50),
      listFinancingLedgerJournals(50),
      getFinancingTrialBalance(),
    ]).then(([schedules, payments, journals, balance]) => {
      if (!active) return;
      setLiveSchedules(schedules.data ?? []);
      setLivePayments(payments.data ?? []);
      setLiveJournals(journals.data ?? []);
      setTrialBalance(balance.data ?? []);
      setServicingState('live');
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : '';
      setServicingState(/FORBIDDEN|403|UNAUTHENTICATED/i.test(message) ? 'forbidden' : 'error');
    });
    return () => { active = false; };
  }, [module, backendMode]);

  useEffect(() => {
    if (module !== 'reconciliation' || backendMode !== 'live') return;
    let active = true;
    setReconciliationState('loading');
    listFinancingReconciliationBatches(50).then(async result => {
      if (!active) return;
      const items = result.data ?? [];
      setReconciliationBatches(items);
      const firstBatch = items[0];
      setSelectedBatchId(firstBatch?.id ?? '');
      if (firstBatch) {
        const lineResult = await listFinancingReconciliationLines(firstBatch.id);
        if (!active) return;
        setReconciliationLines(lineResult.data ?? []);
      } else {
        setReconciliationLines([]);
      }
      setReconciliationState('live');
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : '';
      setReconciliationState(/FORBIDDEN|403|UNAUTHENTICATED/i.test(message) ? 'forbidden' : 'error');
    });
    return () => { active = false; };
  }, [module, backendMode]);

  useEffect(() => {
    const applicationId = selectedApplication?.databaseId;
    if (!applicationId || backendMode !== 'live') {
      setSelectedDocuments([]);
      setSelectedDocumentsState('idle');
      return;
    }
    let active = true;
    setSelectedDocumentsState('loading');
    listFinancingApplicationDocuments(applicationId).then(result => {
      if (!active) return;
      setSelectedDocuments(result.data ?? []);
      setSelectedDocumentsState('live');
    }).catch(() => { if (active) setSelectedDocumentsState('error'); });
    return () => { active = false; };
  }, [selectedApplication?.databaseId, backendMode]);

  const uploadSelectedApplicationDocuments = async () => {
    const applicationId = selectedApplication?.databaseId;
    if (!applicationId || !selectedDocumentFiles.length || selectedDocumentSaving) return;
    setSelectedDocumentSaving(true);
    try {
      for (const file of selectedDocumentFiles) await uploadFinancingApplicationDocument(applicationId, file, selectedDocumentType);
      const result = await listFinancingApplicationDocuments(applicationId);
      setSelectedDocuments(result.data ?? []);
      setSelectedDocumentsState('live');
      setSelectedDocumentFiles([]);
      notify('Application documents uploaded to private storage.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Document upload failed.');
    } finally {
      setSelectedDocumentSaving(false);
    }
  };

  useEffect(() => {
    if (module !== 'approvals' || backendMode !== 'live') return;
    let active = true;
    setApprovalState('loading');
    listFinancingApprovalWorkflows(200).then(result => {
      if (!active) return;
      setApprovalSteps(result.data ?? []);
      setApprovalState('live');
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : '';
      setApprovalState(/FORBIDDEN|403|UNAUTHENTICATED/i.test(message) ? 'forbidden' : 'error');
    });
    return () => { active = false; };
  }, [module, backendMode]);

  useEffect(() => {
    if (module !== 'reports' || backendMode !== 'live') return;
    let active = true;
    setFinanceReportState('loading');
    getFinancingTransactionReport(reportStartDate, reportEndDate).then(result => {
      if (!active) return;
      setFinanceReportRows(result.data ?? []);
      setFinanceReportTotals(result.totals ?? null);
      setFinanceReportState('live');
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : '';
      setFinanceReportState(/FORBIDDEN|403|UNAUTHENTICATED/i.test(message) ? 'forbidden' : 'error');
    });
    return () => { active = false; };
  }, [module, backendMode, reportStartDate, reportEndDate]);

  const titleByModule: Record<ModuleKey, string> = {
    overview: 'Overview', applications: 'Applications', customers: 'Customers',
    credit: 'Credit assessment', approvals: 'Approval layering', contracts: 'Contracts', disbursements: 'Disbursements',
    repayments: 'Repayment ledger', reconciliation: 'Bank reconciliation', collections: 'Collections', products: 'Financing products',
    reports: 'Reports & analytics', settings: 'Workspace settings',
  };
  const filteredApplications = useMemo(() => applications.filter((app) => {
    const matchesSearch = (app.id + ' ' + app.customer + ' ' + app.product + ' ' + app.owner).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All statuses' || app.status === statusFilter;
    const matchesModule = module !== 'credit' || ['Credit review', 'Documents verified', 'Offer prepared'].includes(app.status);
    return matchesSearch && matchesStatus && matchesModule;
  }), [applications, search, statusFilter, module]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };
  const refreshServicingData = async () => {
    const [schedules, payments, journals, balance] = await Promise.all([
      listFinancingRepaymentSchedules(100), listFinancingRepayments(50),
      listFinancingLedgerJournals(50), getFinancingTrialBalance(),
    ]);
    setLiveSchedules(schedules.data ?? []);
    setLivePayments(payments.data ?? []);
    setLiveJournals(journals.data ?? []);
    setTrialBalance(balance.data ?? []);
    setServicingState('live');
  };

  const refreshReconciliation = async (preferredBatchId?: string) => {
    const result = await listFinancingReconciliationBatches(50);
    const items = result.data ?? [];
    setReconciliationBatches(items);
    const nextId = preferredBatchId && items.some(item => item.id === preferredBatchId)
      ? preferredBatchId
      : selectedBatchId && items.some(item => item.id === selectedBatchId)
        ? selectedBatchId : items[0]?.id ?? '';
    setSelectedBatchId(nextId);
    if (nextId) {
      const lineResult = await listFinancingReconciliationLines(nextId);
      setReconciliationLines(lineResult.data ?? []);
    } else {
      setReconciliationLines([]);
    }
    setReconciliationState('live');
  };

  const importReconciliation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reconciliationSaving) return;
    setReconciliationSaving(true);
    try {
      const parsed: unknown = JSON.parse(statementLinesJson);
      if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 500) {
        throw new Error('Statement lines must be a JSON array containing 1–500 normalized lines.');
      }
      const result = await importFinancingReconciliationBatch({
        statementReference: statementReference.trim(),
        maskedBankAccount: maskedBankAccount.trim(),
        periodStart: statementPeriodStart,
        periodEnd: statementPeriodEnd,
        lines: parsed as Array<{ transaction_date: string; direction: 'IN' | 'OUT'; amount: number; external_reference: string; description_hash?: string }>,
      });
      const newBatchId = typeof result.id === 'string' ? result.id : undefined;
      await refreshReconciliation(newBatchId);
      setShowImportReconciliation(false);
      setStatementReference('');
      setStatementLinesJson('[]');
      notify('Statement batch imported. Lines still require exact-reference reconciliation.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not import statement batch.');
    } finally {
      setReconciliationSaving(false);
    }
  };

  const reconcileStatementLine = async (line: FinancingStatementLine) => {
    const entityId = (lineTargetIds[line.id] ?? '').trim();
    const entityType = lineTargetTypes[line.id] ?? (line.direction === 'IN' ? 'REPAYMENT' : 'DISBURSEMENT');
    if (!entityId) {
      notify('Enter the repayment or disbursement UUID to match this statement line.');
      return;
    }
    if (reconciliationSaving) return;
    setReconciliationSaving(true);
    try {
      const result = await reconcileFinancingStatementLine({ statementLineId: line.id, entityType, entityId });
      await refreshReconciliation(selectedBatchId);
      if (result.matched === true) notify('Statement line matched and reconciliation journal posted.');
      else notify('Statement line flagged as exception: ' + String(result.reason ?? 'Review required.'));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not reconcile statement line.');
    } finally {
      setReconciliationSaving(false);
    }
  };

  const saveRepaymentReceipt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (servicingSaving) return;
    setServicingSaving(true);
    try {
      await recordFinancingRepayment({
        loanAccountId: paymentAccountId.trim(), amount: Number(paymentAmount), channel: paymentChannel.trim(),
        externalReference: paymentReference.trim(), paymentDate: new Date(paymentDate + 'T12:00:00').toISOString(),
        idempotencyKey: paymentIdempotencyKey,
      });
      await refreshServicingData();
      setShowRecordRepayment(false);
      setPaymentReference('');
      setPaymentIdempotencyKey(crypto.randomUUID());
      notify('Repayment receipt recorded. Bank reconciliation is still pending.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not record repayment receipt.');
    } finally {
      setServicingSaving(false);
    }
  };

  const saveRepaymentAllocation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (servicingSaving) return;
    setServicingSaving(true);
    try {
      await allocateFinancingRepayment({
        repaymentId: allocationPaymentId.trim(), scheduleId: allocationScheduleId.trim(),
        principalAmount: Number(allocationPrincipal), interestAmount: Number(allocationInterest), feesAmount: Number(allocationFees),
        idempotencyKey: allocationIdempotencyKey,
      });
      await refreshServicingData();
      setShowAllocateRepayment(false);
      setAllocationIdempotencyKey(crypto.randomUUID());
      notify('Repayment allocation posted to the ledger.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not allocate repayment.');
    } finally {
      setServicingSaving(false);
    }
  };

  const addDemoApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCustomer.trim() || Number(newAmount) <= 0) return;
    if (backendMode === 'live') {
      const codeByProduct: Record<string, FinancingProductCode> = {
        'Motor Vehicle': 'MOTOR_VEHICLE', 'Multipurpose': 'MULTIPURPOSE',
        'Heavy Equipment': 'HEAVY_EQUIPMENT', 'Working Capital': 'WORKING_CAPITAL',
      };
      try {
        const created = await createFinancingApplication({
          customerName: newCustomer.trim(), customerType: newCustomerType,
          productCode: codeByProduct[newProduct] ?? 'MOTOR_VEHICLE',
          amount: Number(newAmount), tenorMonths: Number(newTenor),
        });
        const applicationId = typeof created.id === 'string' ? created.id : '';
        let followUpWarning = '';
        if (applicationId) {
          try { await createFinancingApprovalWorkflow(applicationId); }
          catch (error) { followUpWarning = 'Application saved, but approval workflow could not be initialized: ' + (error instanceof Error ? error.message : 'unknown error'); }
          for (const file of newDocuments) {
            try { await uploadFinancingApplicationDocument(applicationId, file, newDocumentType); }
            catch (error) {
              followUpWarning = 'Application saved, but one or more documents did not upload. Open the application again and retry. ' + (error instanceof Error ? error.message : '');
              break;
            }
          }
        } else if (newDocuments.length) {
          followUpWarning = 'Application saved, but document upload could not be linked because the server did not return an application ID.';
        }
        const [result, overview] = await Promise.all([listFinancingApplications(100), getFinancingOverview()]);
        setApplications(mapApiApplications(result.data));
        setLiveOverview(overview);
        setShowNewApplication(false);
        setNewCustomer('');
        setNewDocuments([]);
        setNewDocumentType('IDENTITY');
        setNewCustomerType('BUSINESS');
        setNewAmount('250000000');
        setNewTenor('12');
        setModule('applications');
        notify(followUpWarning || 'Application saved with approval workflow initialized.');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not save application. No local fallback was created.');
      }
      return;
    }
    const next: Application = {
      id: 'SPF-DEMO-' + String(applications.length + 201).padStart(3, '0'),
      customer: newCustomer.trim(), product: newProduct, amount: Number(newAmount),
      submitted: '17 Oct 2026', status: 'New application', owner: 'Demo operator', score: 0,
    };
    setApplications((current) => [next, ...current]);
    setShowNewApplication(false);
    setNewCustomer('');
    setNewCustomerType('BUSINESS');
    setNewAmount('250000000');
    setNewTenor('12');
    setModule('applications');
    notify('Demo application created locally. No real customer record was saved.');
  };

  const panel = 'rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.035)] backdrop-blur-xl';
  const muted = 'text-slate-500';
  const pageTitle = titleByModule[module];

  const renderApplicationsTable = (title: string, subtitle: string) => (
    <div className={panel + ' overflow-hidden'}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h2 className="font-bold text-slate-900">{title}</h2><p className={'mt-1 text-xs ' + muted}>{subtitle}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applications" className="w-48 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="relative">
            <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-400">
              {['All statuses', 'New application', 'Awaiting documents', 'Documents verified', 'Credit review', 'Offer prepared', 'Approved', 'Rejected'].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <button onClick={() => setShowNewApplication(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><Plus size={15} /> New application</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50/90 text-[10px] font-bold uppercase tracking-[.13em] text-slate-500"><tr>
            <th className="px-5 py-3">Application / customer</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Requested amount</th><th className="px-5 py-3">Credit score</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Owner</th><th className="px-5 py-3"></th>
          </tr></thead>
          <tbody>{filteredApplications.map((app) => <tr key={app.id} className="border-t border-slate-100 transition hover:bg-emerald-50/35">
            <td className="px-5 py-4"><button onClick={() => setSelectedApplication(app)} className="text-left"><span className="block font-semibold text-slate-900 hover:text-emerald-700">{app.customer}</span><span className="mt-1 block text-xs text-slate-400">{app.id} · {app.submitted}</span></button></td>
            <td className="px-5 py-4 text-slate-600">{app.product}</td>
            <td className="px-5 py-4 font-semibold tabular-nums text-slate-800">{rupiah(app.amount)}</td>
            <td className="px-5 py-4">{app.score ? <span className="font-bold text-slate-700">{app.score}<span className="font-normal text-slate-400">/100</span></span> : <span className="text-slate-400">Not assessed</span>}</td>
            <td className="px-5 py-4"><span className={'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ' + (statusTone[app.status] || statusTone['In progress'])}>{app.status}</span></td>
            <td className="px-5 py-4 text-slate-600">{app.owner}</td>
            <td className="px-5 py-4"><button onClick={() => setSelectedApplication(app)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-700" aria-label="Open application"><ArrowRight size={16} /></button></td>
          </tr>)}
          {filteredApplications.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">No matching demo applications. Adjust the filters or search.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400"><span>Showing {filteredApplications.length} demo records</span><span>Sample workspace · Read only outside local demo interactions</span></div>
    </div>
  );

  const renderOverview = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {[
          { label: 'Applications received', value: backendMode === 'checking' ? '…' : liveOverview ? String(liveOverview.totalApplications) : '128', delta: liveOverview ? 'Live' : '+12.8%', note: liveOverview ? 'persisted applications' : 'vs previous month', icon: FileText, iconBg: 'bg-emerald-50 text-emerald-700', up: true },
          { label: 'Financing requested', value: backendMode === 'checking' ? '…' : liveOverview ? rupiah(liveOverview.amountRequestedIdr) : 'Rp 8.45B', delta: liveOverview ? 'Live' : '+8.2%', note: liveOverview ? (liveOverview.partial ? 'partial portfolio window' : 'persisted requests') : 'sample portfolio', icon: CircleDollarSign, iconBg: 'bg-sky-50 text-sky-700', up: true },
          { label: 'Pending credit review', value: backendMode === 'checking' ? '…' : liveOverview ? String(liveOverview.byStatus.CREDIT_REVIEW ?? 0) : '24', delta: liveOverview ? 'Live' : '7 urgent', note: liveOverview ? 'credit review status' : 'need attention', icon: ClipboardCheck, iconBg: 'bg-violet-50 text-violet-700', up: false },
          { label: 'Repayment collected', value: backendMode === 'checking' ? '…' : liveOverview ? '—' : 'Rp 2.16B', delta: liveOverview ? 'Role-gated' : 'Demo only', note: liveOverview ? 'requires servicing permissions' : 'illustrative collection rate', icon: Wallet, iconBg: 'bg-amber-50 text-amber-700', up: true },
        ].map((kpi) => <div key={kpi.label} className={panel + ' p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg'}>
          <div className="flex items-start justify-between"><span className="max-w-[150px] text-sm font-medium text-slate-500">{kpi.label}</span><span className={'flex h-10 w-10 items-center justify-center rounded-xl ' + kpi.iconBg}><kpi.icon size={19} /></span></div>
          <p className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-[28px]">{kpi.value}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs"><span className={'inline-flex items-center gap-0.5 font-bold ' + (kpi.up ? 'text-emerald-700' : 'text-amber-700')}>{kpi.up ? <ArrowUpRight size={13} /> : <Clock3 size={13} />}{kpi.delta}</span><span className="text-slate-400">{kpi.note}</span></div>
        </div>)}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <section className={panel + ' p-5 sm:p-6'}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Application pipeline</h2><p className={'mt-1 text-xs ' + muted}>Distribution by current workflow stage</p></div><button onClick={() => setModule('applications')} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900">View applications <ArrowRight size={14} /></button></div>
          <div className="mt-6 space-y-4">
            {(liveOverview ? [['New application', liveOverview.byStatus.NEW ?? 0, Math.max(liveOverview.totalApplications, 1), '#64748b'], ['Document verification', (liveOverview.byStatus.SUBMITTED ?? 0) + (liveOverview.byStatus.DOCUMENTS_PENDING ?? 0) + (liveOverview.byStatus.VERIFICATION ?? 0), Math.max(liveOverview.totalApplications, 1), '#0ea5e9'], ['Credit assessment', (liveOverview.byStatus.CREDIT_REVIEW ?? 0) + (liveOverview.byStatus.REFERRED ?? 0), Math.max(liveOverview.totalApplications, 1), '#8b5cf6'], ['Offer & contract', (liveOverview.byStatus.OFFERED ?? 0) + (liveOverview.byStatus.CONTRACTED ?? 0), Math.max(liveOverview.totalApplications, 1), '#f59e0b'], ['Approved / booked', (liveOverview.byStatus.APPROVED ?? 0) + (liveOverview.byStatus.BOOKED ?? 0), Math.max(liveOverview.totalApplications, 1), '#10b981']] : [['New application', 18, 128, '#64748b'], ['Document verification', 26, 128, '#0ea5e9'], ['Credit assessment', 24, 128, '#8b5cf6'], ['Offer & contract', 19, 128, '#f59e0b'], ['Approved / disbursement', 41, 128, '#10b981']]).map(([label, value, total, color]) => <div key={String(label)}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-slate-600">{label}</span><span className="font-bold tabular-nums text-slate-800">{value} <span className="font-normal text-slate-400">cases</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: (Number(value) / Number(total) * 100 * 2.5) + '%', background: String(color) }} /></div></div>)}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
            <div><p className="text-xs text-slate-400">Approval rate</p><p className="mt-1 text-lg font-black text-slate-900">{liveOverview ? "—" : "64.2%"}</p></div>
            <div><p className="text-xs text-slate-400">Avg. processing</p><p className="mt-1 text-lg font-black text-slate-900">{liveOverview ? "—" : "2.4 days"}</p></div>
            <div><p className="text-xs text-slate-400">Pending documents</p><p className="mt-1 text-lg font-black text-slate-900">{liveOverview ? String(liveOverview.byStatus.DOCUMENTS_PENDING ?? 0) : "18"}</p></div>
          </div>
        </section>
        <section className={panel + ' p-5 sm:p-6'}>
          <div className="flex items-start justify-between"><div><h2 className="font-bold text-slate-900">Operations queue</h2><p className={'mt-1 text-xs ' + muted}>Items requiring team action</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Bell size={17} /></span></div>
          <div className="mt-4 space-y-1">
            {[
              { title: 'Credit reviews waiting', desc: liveOverview ? String(liveOverview.byStatus.CREDIT_REVIEW ?? 0) + ' applications in queue' : '24 applications in queue', num: liveOverview ? String(liveOverview.byStatus.CREDIT_REVIEW ?? 0) : '24', color: 'bg-violet-50 text-violet-700', key: 'credit' as ModuleKey },
              { title: 'Incomplete documents', desc: liveOverview ? String(liveOverview.byStatus.DOCUMENTS_PENDING ?? 0) + ' applications need follow-up' : '18 applications need follow-up', num: liveOverview ? String(liveOverview.byStatus.DOCUMENTS_PENDING ?? 0) : '18', color: 'bg-amber-50 text-amber-700', key: 'applications' as ModuleKey },
              { title: 'Upcoming due dates', desc: liveOverview ? 'Loan servicing is not enabled in Phase 1' : '8 accounts need collection review', num: liveOverview ? '—' : '08', color: 'bg-rose-50 text-rose-700', key: 'collections' as ModuleKey },
            ].map((item) => <button key={item.title} onClick={() => setModule(item.key)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50"><span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ' + item.color}>{item.num}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="mt-1 block text-xs text-slate-400">{item.desc}</span></span><ChevronRight size={16} className="text-slate-400" /></button>)}
          </div>
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck size={16} /> Control checklist</div><p className="mt-1.5 text-xs leading-relaxed text-emerald-800/80">Consent, maker-checker approval and audit trail must be enforced before production integrations are enabled.</p></div>
        </section>
      </div>
      <div className="mt-5">{renderApplicationsTable('Recent applications', liveOverview ? 'Latest persisted applications from the financing API' : 'Latest activity across the demo portfolio')}</div>
    </>
  );

  const refreshApprovalSteps = async () => {
    const result = await listFinancingApprovalWorkflows(200);
    setApprovalSteps(result.data ?? []);
    setApprovalState('live');
  };

  const submitApprovalDecision = async (step: FinancingApprovalStep, decision: 'APPROVE' | 'REJECT') => {
    const note = (approvalNotes[step.id] ?? '').trim();
    if (note.length < 3) {
      notify('Please add a reason of at least 3 characters before deciding.');
      return;
    }
    try {
      await decideFinancingApprovalStep({ stepId: step.id, decision, note });
      await refreshApprovalSteps();
      setApprovalNotes((current) => ({ ...current, [step.id]: '' }));
      notify(decision === 'APPROVE' ? 'Approval layer approved and audited.' : 'Approval layer rejected; later layers were skipped.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Approval decision failed.');
    }
  };

  const exportFinanceCsv = () => {
    if (!financeReportRows.length) { notify('Generate a report with transactions before exporting.'); return; }
    const rows = [
      ['Journal number','Date (UTC)','Source type','Source ID','Memo','Status','Debit (IDR)','Credit (IDR)'],
      ...financeReportRows.map((row) => [row.journal_number, row.created_at, row.source_type, row.source_id, row.memo ?? '', row.status, row.debit, row.credit]),
    ];
    const csv = '\\ufeff' + rows.map((row) => row.map((cell) => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(',')).join('\\r\\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'surepath-finance-' + reportStartDate + '-to-' + reportEndDate + '.csv';
    link.click(); URL.revokeObjectURL(url);
  };

  const exportFinancePdf = () => {
    if (!financeReportRows.length) { notify('Generate a report with transactions before exporting.'); return; }
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    pdf.setFontSize(16); pdf.text('SurePath Finance Transaction Report', 40, 38);
    pdf.setFontSize(9); pdf.text('Period: ' + reportStartDate + ' to ' + reportEndDate + ' | Generated: ' + new Date().toISOString(), 40, 56);
    const columns = ['Journal','Date','Source','Memo','Status','Debit (IDR)','Credit (IDR)'];
    const widths = [82, 90, 95, 180, 60, 90, 90];
    let y = 82;
    const drawHeader = () => {
      let x = 40; pdf.setFont('helvetica','bold');
      columns.forEach((column, index) => { pdf.text(column, x, y); x += widths[index]; });
      y += 8; pdf.line(40, y, 800, y); y += 14; pdf.setFont('helvetica','normal');
    };
    drawHeader();
    financeReportRows.forEach((row) => {
      if (y > 550) { pdf.addPage(); y = 40; drawHeader(); }
      const cells = [row.journal_number, new Date(row.created_at).toISOString().slice(0,10), row.source_type, String(row.memo ?? '').slice(0,36), row.status, Number(row.debit).toLocaleString('id-ID'), Number(row.credit).toLocaleString('id-ID')];
      let x = 40;
      cells.forEach((cell, index) => { pdf.text(String(cell), x, y, { maxWidth: widths[index] - 6 }); x += widths[index]; });
      y += 14;
    });
    y += 12; pdf.setFont('helvetica','bold');
    pdf.text('Transactions: ' + (financeReportTotals?.transaction_count ?? financeReportRows.length) + ' | Total debit: IDR ' + Number(financeReportTotals?.debit ?? 0).toLocaleString('id-ID') + ' | Total credit: IDR ' + Number(financeReportTotals?.credit ?? 0).toLocaleString('id-ID'), 40, Math.min(y, 570), { maxWidth: 760 });
    pdf.save('surepath-finance-' + reportStartDate + '-to-' + reportEndDate + '.pdf');
  };

  const renderModuleContent = () => {
    if (module === 'overview') return renderOverview();
    if (module === 'applications' || module === 'credit') return renderApplicationsTable(module === 'credit' ? 'Credit review queue' : 'All applications', module === 'credit' ? 'Simulated cases awaiting assessment and decision' : 'Search, filter and inspect the application pipeline');
    if (module === 'products') return <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{products.map((product) => <div key={product.name} className={panel + ' p-5 transition hover:-translate-y-0.5 hover:shadow-lg'}><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: product.color + '22', color: product.color }}><BriefcaseBusiness size={21} /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Demo setup</span></div><h3 className="mt-4 text-lg font-bold text-slate-900">{product.name}</h3><p className="mt-1 text-sm text-slate-500">{product.sub}</p><div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4"><div><p className="text-xs text-slate-400">Sample applications</p><p className="mt-1 text-xl font-black text-slate-900">{product.count}</p></div><div className="text-right"><p className="text-xs text-slate-400">Pricing / policy</p><p className="mt-1 text-xs font-semibold text-slate-600">{product.rate}</p></div></div><button onClick={() => notify(product.name + ' settings are illustrative; live product configuration is not connected.')} className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50">View product setup</button></div>)}</div>;
    if (module === 'customers') return <div className={panel + ' overflow-hidden'}><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Customer directory</h2><p className={'mt-1 text-xs ' + muted}>Fictional business and individual customer profiles</p></div><div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{['PT Nusantara Logistik','CV Sinar Mobilindo','PT Cipta Karya Mandiri','UD Berkah Niaga','PT Aruna Distribusi','CV Mitra Perkasa'].map((name, i) => <div key={name} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600">{name.replace(/[^A-Z]/g, '').slice(0, 2) || 'SP'}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{name}</p><p className="mt-1 text-xs text-slate-400">{i % 2 ? 'Individual / SME' : 'Business customer'} · Demo</p></div></div><div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-400">Applications</span><span className="font-bold text-slate-700">{(i % 3) + 1}</span></div></div>)}</div></div>;
    if (module === 'contracts') return <div className={panel + ' overflow-hidden'}><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Contract management</h2><p className={'mt-1 text-xs ' + muted}>Illustrative offer, approval and signing lifecycle</p></div><div className="grid gap-4 p-5 md:grid-cols-3">{[{title:'Offers prepared',value:'19',icon:FileText},{title:'Awaiting signature',value:'12',icon:FileClock},{title:'Executed contracts',value:'46',icon:FileCheck2}].map((item)=><div key={item.title} className="rounded-xl border border-slate-100 p-5"><item.icon className="text-emerald-700" size={21}/><p className="mt-4 text-2xl font-black text-slate-900">{item.value}</p><p className="mt-1 text-sm text-slate-500">{item.title}</p></div>)}</div><div className="mx-5 mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">E-signature and contract storage integrations are not connected in this demo.</div></div>;
    if (module === 'disbursements') return <div className="grid gap-4 md:grid-cols-3">{[{title:'Awaiting approval',value:'7',amount:'Rp 1.28B'},{title:'Scheduled',value:'4',amount:'Rp 640M'},{title:'Disbursed this month',value:'32',amount:'Rp 4.82B'}].map((item)=><div key={item.title} className={panel+' p-5'}><Banknote className="text-emerald-700" size={21}/><p className="mt-4 text-2xl font-black text-slate-900">{item.value}</p><p className="mt-1 text-sm text-slate-500">{item.title}</p><p className="mt-4 border-t border-slate-100 pt-3 text-sm font-bold text-slate-700">{item.amount}</p></div>)}<div className={panel+' p-5 md:col-span-3'}><h2 className="font-bold text-slate-900">Disbursement controls</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Maker-checker approval, verified beneficiary details, signed contract, and a confirmed funding instruction should be required before a real disbursement. This screen is simulation only.</p></div></div>;
    if (module === 'reconciliation') {
      const money = (value: number | string) => rupiah(Number(value ?? 0));
      return <div className="space-y-5">
        {backendMode !== 'live' ? <div className={panel+' p-5'}><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-amber-600" size={19}/><div><h2 className="font-bold text-slate-900">Bank reconciliation · live access required</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">This workspace cannot access the authenticated reconciliation API. No fictional bank statement data is shown.</p></div></div></div> : <>
          <div className={panel+' p-5'}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Statement batches</h2><p className="mt-1 text-xs text-slate-500">Import normalized statement lines from an independently verified bank statement.</p></div><div className="flex gap-2"><button onClick={()=>{setReconciliationState('loading');refreshReconciliation().catch((e:unknown)=>setReconciliationState(e instanceof Error&&/FORBIDDEN|403/i.test(e.message)?'forbidden':'error'));}} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Activity size={14} className="mr-1 inline"/> Refresh</button><button onClick={()=>setShowImportReconciliation(true)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Import statement</button></div></div>
            {reconciliationState==='loading'&&<p className="py-8 text-sm text-slate-500">Loading reconciliation batches…</p>}
            {reconciliationState==='forbidden'&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Access restricted.</strong> Ask an administrator to assign an approved SERVICING_FINANCE, FINANCING_ADMIN or AUDITOR role.</div>}
            {reconciliationState==='error'&&<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Reconciliation API unavailable. No sample data is substituted.</div>}
            {reconciliationState==='live'&&<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Statement</th><th className="px-3 py-3">Period</th><th className="px-3 py-3">Lines</th><th className="px-3 py-3">Matched</th><th className="px-3 py-3">Exceptions</th><th className="px-3 py-3">Status</th><th className="px-3 py-3"></th></tr></thead><tbody>{reconciliationBatches.map(batch=><tr key={batch.id} className={'border-t border-slate-100 '+(batch.id===selectedBatchId?'bg-emerald-50/50':'')}><td className="px-3 py-3"><p className="font-semibold text-slate-800">{batch.statement_reference}</p><p className="mt-1 text-xs text-slate-500">{batch.masked_bank_account}</p></td><td className="px-3 py-3 text-xs text-slate-600">{batch.period_start} – {batch.period_end}</td><td className="px-3 py-3 text-slate-600">{batch.line_count}</td><td className="px-3 py-3 text-emerald-700">{batch.matched_count}</td><td className="px-3 py-3 text-rose-700">{batch.exception_count}</td><td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{batch.status}</span></td><td className="px-3 py-3"><button onClick={()=>{setSelectedBatchId(batch.id);setReconciliationState('loading');listFinancingReconciliationLines(batch.id).then(r=>{setReconciliationLines(r.data??[]);setReconciliationState('live');}).catch((e:unknown)=>setReconciliationState(e instanceof Error&&/FORBIDDEN|403/i.test(e.message)?'forbidden':'error'));}} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white">View lines</button></td></tr>)}</tbody></table>{reconciliationBatches.length===0&&<p className="py-8 text-center text-sm text-slate-500">No bank statements imported yet.</p>}</div>}
          </div>
          <div className={panel+' overflow-hidden'}>
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Statement lines</h2><p className="mt-1 text-xs text-slate-500">Match requires exact direction, amount, external reference and eligible transaction status. Exceptions do not post journals.</p></div>
            {reconciliationState==='live'&&selectedBatchId&&<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Date / line</th><th className="px-3 py-3">Direction</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">External reference</th><th className="px-3 py-3">Match target UUID</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3"></th></tr></thead><tbody>{reconciliationLines.map(line=><tr key={line.id} className="border-t border-slate-100"><td className="px-3 py-3 text-xs text-slate-600">{line.transaction_date}<p className="mt-1 text-[10px] text-slate-400">Line {line.line_number}</p></td><td className="px-3 py-3"><span className={'rounded-full px-2 py-1 text-xs font-bold '+(line.direction==='IN'?'bg-emerald-50 text-emerald-700':'bg-sky-50 text-sky-700')}>{line.direction}</span></td><td className="px-3 py-3 font-semibold text-slate-800">{money(line.amount)}</td><td className="px-3 py-3 font-mono text-xs text-slate-600">{line.external_reference}</td><td className="px-3 py-3"><input disabled={line.status!=='UNMATCHED'} value={lineTargetIds[line.id]??''} onChange={e=>setLineTargetIds(current=>({...current,[line.id]:e.target.value}))} placeholder={line.direction==='IN'?'Repayment UUID':'Disbursement UUID'} className="w-64 rounded-lg border border-slate-200 px-2.5 py-2 font-mono text-[10px] outline-none focus:border-emerald-500 disabled:bg-slate-50"/></td><td className="px-3 py-3"><select disabled={line.status!=='UNMATCHED'} value={lineTargetTypes[line.id]??(line.direction==='IN'?'REPAYMENT':'DISBURSEMENT')} onChange={e=>setLineTargetTypes(current=>({...current,[line.id]:e.target.value as 'REPAYMENT'|'DISBURSEMENT'}))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs disabled:bg-slate-50"><option value="REPAYMENT">Repayment</option><option value="DISBURSEMENT">Disbursement</option></select></td><td className="px-3 py-3"><span className={'rounded-full px-2 py-1 text-xs font-semibold '+(line.status==='MATCHED'?'bg-emerald-50 text-emerald-700':line.status==='EXCEPTION'?'bg-rose-50 text-rose-700':'bg-amber-50 text-amber-800')}>{line.status}</span>{line.exception_code&&<p className="mt-1 text-[10px] text-rose-700">{line.exception_code}</p>}</td><td className="px-3 py-3">{line.status==='UNMATCHED'&&<button disabled={reconciliationSaving} onClick={()=>reconcileStatementLine(line)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Match</button>}{line.status==='MATCHED'&&<span className="text-xs text-emerald-700">Posted</span>}</td></tr>)}</tbody></table>{reconciliationLines.length===0&&<p className="py-8 text-center text-sm text-slate-500">Select a batch to view its statement lines.</p>}</div>}
          </div>
        </>}
      </div>;
    }
    if (module === 'repayments') {
      const money = (value: number | string) => rupiah(Number(value ?? 0));
      return <div className="space-y-5">
        {backendMode !== 'live' ? <div className={panel+' p-5'}>
          <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 text-amber-600" size={19}/><div><h2 className="font-bold text-slate-900">Repayment ledger · demo mode</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">The live servicing API is not available to this session. The repayment and ledger views are not populated with fictional data in this panel. An authorized financing session is required to view production records.</p></div></div>
        </div> : <>
          <div className={panel+' p-5'}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Repayment schedule</h2><p className="mt-1 text-xs text-slate-500">Persisted instalments from the financing API · IDR</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>{setServicingState('loading'); refreshServicingData().catch((e:unknown)=>{setServicingState(e instanceof Error&&/FORBIDDEN|403|UNAUTHENTICATED/i.test(e.message)?'forbidden':'error');});}} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Activity size={14} className="mr-1 inline"/> Refresh</button>{servicingState==='live' && <button onClick={()=>setShowRecordRepayment(true)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Record receipt</button>}{servicingState==='live' && <button onClick={()=>setShowAllocateRepayment(true)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">Allocate payment</button>}</div></div>
            {servicingState==='loading' && <p className="py-8 text-sm text-slate-500">Loading repayment records…</p>}
            {servicingState==='forbidden' && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Access restricted.</strong> This account has no servicing permission. Ask an administrator to assign an approved SERVICING_FINANCE or AUDITOR role.</div>}
            {servicingState==='error' && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">The servicing API could not be loaded. No demo values are being substituted for production records.</div>}
            {servicingState==='live' && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Due date</th><th className="px-3 py-3">Account reference</th><th className="px-3 py-3">Schedule ID</th><th className="px-3 py-3">Installment</th><th className="px-3 py-3">Paid</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Version</th></tr></thead><tbody>{liveSchedules.map(row=><tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-3 text-slate-600">{new Date(row.due_date+'T00:00:00').toLocaleDateString('id-ID')}</td><td className="px-3 py-3 font-mono text-xs text-slate-600">{row.loan_account_id.slice(0,8)}…</td><td className="px-3 py-3 font-mono text-[10px] text-slate-500" title={row.id}>{row.id}</td><td className="px-3 py-3 font-semibold text-slate-800">{money(row.scheduled_payment || (Number(row.principal_due)+Number(row.interest_due)+Number(row.fees_due)))}</td><td className="px-3 py-3 text-slate-600">{money(row.amount_paid)}</td><td className="px-3 py-3"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold '+(row.status==='PAID'?'bg-emerald-50 text-emerald-700':row.status==='OVERDUE'?'bg-rose-50 text-rose-700':'bg-sky-50 text-sky-700')}>{row.status}</span></td><td className="px-3 py-3 text-slate-500">v{row.schedule_version}</td></tr>)}</tbody></table>{liveSchedules.length===0&&<p className="py-8 text-center text-sm text-slate-500">No persisted repayment schedules yet.</p>}</div>}
          </div>
          <div className={panel+' p-5'}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Recent repayment receipts</h2><p className="mt-1 text-xs text-slate-500">Payment IDs can be used in the allocation form. Receipts remain unreconciled until verified.</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">Not bank-reconciled</span></div>
            {servicingState==='live'&&<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Payment ID</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{livePayments.map(row=><tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-3 font-mono text-[10px] text-slate-500" title={row.id}>{row.id}</td><td className="px-3 py-3 text-slate-600">{new Date(row.payment_date).toLocaleDateString('id-ID')}</td><td className="px-3 py-3 font-semibold text-slate-800">{money(row.amount)}</td><td className="px-3 py-3 text-slate-600">{row.channel}</td><td className="px-3 py-3"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{row.status}</span></td></tr>)}</tbody></table>{livePayments.length===0&&<p className="py-8 text-center text-sm text-slate-500">No repayment receipts have been recorded.</p>}</div>}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <div className={panel+' p-5'}><h2 className="font-bold text-slate-900">Trial balance</h2><p className="mt-1 text-xs text-slate-500">Posted journal totals by ledger account</p>{servicingState==='live'&&<div className="mt-4 space-y-3">{trialBalance.map(row=><div key={row.account_code} className="border-b border-slate-100 pb-3 last:border-0"><div className="flex justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{row.account_name}</span><span className="font-mono text-[10px] text-slate-400">{row.account_code}</span></div><div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>Dr {money(row.total_debit)}</span><span>Cr {money(row.total_credit)}</span><span className="font-bold text-slate-700">Net {money(row.net_debit)}</span></div></div>)}{trialBalance.length===0&&<p className="py-5 text-sm text-slate-500">No ledger accounts returned.</p>}</div>}</div>
            <div className={panel+' p-5'}><h2 className="font-bold text-slate-900">Recent journal entries</h2><p className="mt-1 text-xs text-slate-500">Audit-linked accounting events</p>{servicingState==='live'&&<div className="mt-4 space-y-3">{liveJournals.map(row=><div key={row.id} className="rounded-xl border border-slate-100 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-slate-800">{row.journal_number}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{row.status}</span></div><p className="mt-1 text-sm font-semibold text-slate-700">{row.source_type.replaceAll('_',' ')}</p><p className="mt-1 text-xs text-slate-500">{new Date(row.created_at).toLocaleString('id-ID')} · {row.memo}</p></div>)}{liveJournals.length===0&&<p className="py-5 text-sm text-slate-500">No journal entries have been posted.</p>}</div>}</div>
          </div>
        </>}
      </div>;
    }
    if (module === 'collections') return <div className={panel+' overflow-hidden'}><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Collections worklist</h2><p className={'mt-1 text-xs '+muted}>Illustrative collection queue · demo data only</p></div><div className="p-5"><p className="text-sm text-slate-600">Collections automation and live delinquency worklists have not been enabled. No live collections data is displayed here.</p></div></div>;
    if (module === 'approvals') return <div className="space-y-4">
      <div className={panel+' p-5'}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Sequential approval queue</h2><p className="mt-1 text-sm text-slate-500">Document verification → credit review → credit approval → finance control. Each layer requires its assigned role and a reasoned decision.</p></div><button onClick={()=>{setApprovalState('loading');refreshApprovalSteps().catch((e:unknown)=>setApprovalState(e instanceof Error&&/FORBIDDEN|403/i.test(e.message)?'forbidden':'error'));}} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Activity size={14} className="mr-1 inline"/> Refresh queue</button></div>
      {backendMode!=='live'&&<p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Approval queue requires an authenticated financing role. Demo records cannot approve live applications.</p>}
      {approvalState==='loading'&&<p className="py-8 text-sm text-slate-500">Loading approval queue…</p>}
      {approvalState==='forbidden'&&<p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your current account has no role for this approval queue. No approval privileges are granted automatically.</p>}
      {approvalState==='error'&&<p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load approval steps. Retry after checking the financing API.</p>}
      {approvalState==='live'&&<div className="mt-5 space-y-3">{approvalSteps.length===0&&<div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No approval workflows have been created yet. New applications create the standard four-layer workflow.</div>}{approvalSteps.map((step)=><div key={step.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold">Layer {step.step_order}</span><h3 className="font-bold text-slate-900">{step.step_label}</h3><span className={'rounded-full px-2.5 py-1 text-[10px] font-bold '+(step.status==='APPROVED'?'bg-emerald-50 text-emerald-700':step.status==='REJECTED'?'bg-rose-50 text-rose-700':step.status==='SKIPPED'?'bg-slate-100 text-slate-500':'bg-amber-50 text-amber-700')}>{step.status}</span></div><p className="mt-2 text-sm text-slate-500">{step.application?.customer?.display_name ?? 'Application'} · {step.application?.application_number ?? step.application_id} · {rupiah(Number(step.application?.requested_amount ?? 0))}</p><p className="mt-1 text-xs text-slate-400">Required role: {step.required_role}{step.decided_at?' · Decided '+new Date(step.decided_at).toLocaleString('id-ID'):''}</p>{step.decision_note&&<p className="mt-2 text-sm text-slate-600">Reason: {step.decision_note}</p>}</div></div>
      {step.status==='PENDING'&&backendMode==='live'&&<div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={approvalNotes[step.id]??''} onChange={(e)=>setApprovalNotes(current=>({...current,[step.id]:e.target.value}))} placeholder="Decision reason (required)" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"/><button onClick={()=>void submitApprovalDecision(step,'APPROVE')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve</button><button onClick={()=>void submitApprovalDecision(step,'REJECT')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Reject</button></div>}</div>)}</div>}
      </div>
    </div>;
    if (module === 'reports') return <div className="space-y-4">
      <div className={panel+' p-5'}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Finance transaction report</h2><p className="mt-1 text-sm text-slate-500">Daily or monthly transaction journal report with double-entry totals. Exports include only authorized persisted ledger data.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportFinanceCsv} disabled={financeReportState!=='live'||financeReportRows.length===0} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"><FileSpreadsheet size={14} className="mr-1 inline"/> Export Excel CSV</button><button onClick={exportFinancePdf} disabled={financeReportState!=='live'||financeReportRows.length===0} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Download size={14} className="mr-1 inline"/> Export PDF</button></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-slate-600">Report period<select value={reportPeriod} onChange={(e)=>{const value=e.target.value;setReportPeriod(value);const now=new Date();if(value==='daily'){const day=now.toISOString().slice(0,10);setReportStartDate(day);setReportEndDate(day);}else{setReportStartDate(new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10));setReportEndDate(now.toISOString().slice(0,10));}}} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="daily">Daily</option><option value="monthly">Monthly to date</option><option value="custom">Custom range</option></select></label><label className="text-xs font-semibold text-slate-600">From<input type="date" value={reportStartDate} onChange={(e)=>{setReportStartDate(e.target.value);setReportPeriod('custom');}} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="text-xs font-semibold text-slate-600">To<input type="date" value={reportEndDate} onChange={(e)=>{setReportEndDate(e.target.value);setReportPeriod('custom');}} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><div className="flex items-end"><button onClick={()=>{setFinanceReportState('loading');getFinancingTransactionReport(reportStartDate,reportEndDate).then(r=>{setFinanceReportRows(r.data??[]);setFinanceReportTotals(r.totals??null);setFinanceReportState('live');}).catch((e:unknown)=>setFinanceReportState(e instanceof Error&&/FORBIDDEN|403/i.test(e.message)?'forbidden':'error'));}} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Generate report</button></div></div>
      {backendMode!=='live'&&<p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Finance reports require an authenticated finance, admin, or auditor role. Demo totals are not exported.</p>}
      {financeReportState==='loading'&&<p className="py-8 text-sm text-slate-500">Generating report from ledger journals…</p>}
      {financeReportState==='forbidden'&&<p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Access restricted: your account is not authorized to generate finance reports.</p>}
      {financeReportState==='error'&&<p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not generate the report. Check the date range and financing API.</p>}
      {financeReportState==='live'&&<><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Transactions</p><p className="mt-1 text-xl font-black text-slate-900">{financeReportTotals?.transaction_count??financeReportRows.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Total debit</p><p className="mt-1 text-lg font-black text-slate-900">{rupiah(financeReportTotals?.debit??0)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Total credit</p><p className="mt-1 text-lg font-black text-slate-900">{rupiah(financeReportTotals?.credit??0)}</p></div></div>{financeReportTotals?.truncated&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Report reached the 1,000 journal safety limit. Narrow the date range before exporting a complete report.</p>}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs text-slate-400"><th className="py-3 pr-3">Journal</th><th className="py-3 pr-3">Date</th><th className="py-3 pr-3">Source</th><th className="py-3 pr-3">Memo</th><th className="py-3 pr-3 text-right">Debit</th><th className="py-3 text-right">Credit</th></tr></thead><tbody>{financeReportRows.map(row=><tr key={row.id} className="border-b border-slate-50"><td className="py-3 pr-3 font-semibold text-slate-800">{row.journal_number}</td><td className="py-3 pr-3 text-slate-500">{new Date(row.created_at).toLocaleDateString('id-ID')}</td><td className="py-3 pr-3 text-slate-600">{row.source_type}</td><td className="py-3 pr-3 text-slate-500">{row.memo||'—'}</td><td className="py-3 pr-3 text-right tabular-nums">{rupiah(row.debit)}</td><td className="py-3 text-right tabular-nums">{rupiah(row.credit)}</td></tr>)}</tbody></table>{financeReportRows.length===0&&<p className="py-8 text-center text-sm text-slate-500">No posted ledger journals found for this period.</p>}</div></>}
      </div>
      <div className={panel+' p-4 text-xs leading-relaxed text-slate-500'}>Excel export is CSV format, compatible with Microsoft Excel and spreadsheet tools. Reports are based on posted ledger journals, not unreconciled raw bank feeds. All amounts are IDR; timestamps in the source ledger are UTC.</div>
    </div>;
    return <div className={panel+' p-5 sm:p-6'}><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Settings2 size={21}/></span><div><h2 className="font-bold text-slate-900">Workspace configuration</h2><p className="mt-1 text-sm text-slate-500">Configuration areas for a future production tenant</p></div></div><div className="mt-6 divide-y divide-slate-100">{[{title:'Partner / tenant profile',desc:'Finance partner identity, branding and operational scope'},{title:'Roles & permissions',desc:'Role-based access for admin, credit analyst, operations and collections'},{title:'Approval matrix',desc:'Maker-checker rules, limits and delegated approval'},{title:'Product and pricing rules',desc:'Partner-owned eligibility, rates, fees and product versions'},{title:'Verification providers',desc:'Approved provider credentials and consent controls'},{title:'Audit and retention',desc:'Access logs, decision trails, retention and export policy'}].map((item)=><button key={item.title} onClick={()=>notify(item.title+' requires authenticated backend configuration.')} className="flex w-full items-center justify-between gap-4 py-4 text-left"><span><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.desc}</span></span><ChevronRight size={17} className="shrink-0 text-slate-400"/></button>)}</div></div>;
  };

  if (!demoEntered) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071b15] px-4 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 15% 15%, rgba(16,185,129,.28), transparent 34%), radial-gradient(circle at 85% 80%, rgba(20,184,166,.20), transparent 32%)' }} />
        <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-2xl sm:p-9">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><Building2 size={25} /></span>
            <div><p className="text-xl font-black tracking-tight">SurePath <span className="text-emerald-300">Financing Core</span></p><p className="mt-1 text-xs text-emerald-100/70">Multi-finance operations workspace</p></div>
          </div>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-amber-100"><ShieldCheck size={13} /> Restricted demo environment</div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Masuk ke dashboard demo</h1>
          <p className="mt-3 text-sm leading-6 text-emerald-50/75">Coba alur kerja pembiayaan dengan data fiktif untuk pilot Mutiara Finance. Tidak ada transaksi, pencairan, atau perubahan data produksi.</p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-100/55">Demo profile</p>
            <p className="mt-2 text-sm font-semibold">angkouw84+admindemo@gmail.com</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-emerald-200">Role: Financing Demo</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/70">Read-only production boundary</span>
            </div>
          </div>
          <button onClick={() => { try { sessionStorage.setItem('sp_financing_demo_session', 'active'); } catch {} setDemoEntered(true); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-950/25 transition hover:bg-emerald-300">
            Masuk sebagai Demo <ArrowRight size={17} />
          </button>
          <p className="mt-4 text-center text-[11px] leading-5 text-white/45">Demo access saja — bukan autentikasi produksi. Seluruh data hanya contoh dan interaksi tersimpan sementara di browser.</p>
          <a href="/" onClick={(event) => { event.preventDefault(); props.navigate("/"); }} className="mt-5 block text-center text-xs font-semibold text-emerald-200/75 hover:text-white">← Kembali ke SurePath</a>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white"><Building2 size={21} /></span><div><p className="text-sm font-black text-slate-900">SurePath <span className="text-emerald-700">Financing Core</span></p><p className="mt-0.5 text-[10px] text-slate-500">Independent operations workspace · {backendMode === 'live' ? 'Live API' : 'Demo'}</p></div></div>
          <div className="flex items-center gap-2"><span className="hidden rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:inline-flex">angkouw84+admindemo@gmail.com</span><button onClick={() => { try { sessionStorage.removeItem('sp_financing_demo_session'); } catch {} setDemoEntered(false); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">Keluar Demo</button></div>
        </div>
      </header>
      <main className="min-h-screen bg-[#f5f7f8] px-3 pb-12 pt-5 text-slate-900 sm:px-5 sm:pt-6 lg:px-7">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 px-4 py-3 text-white shadow-lg shadow-emerald-950/10 sm:px-5">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Building2 size={21}/></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">SurePath Financing Core</p><span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.14em] text-amber-100">{backendMode === "live" ? "Live API" : "Demo environment"}</span></div><p className="mt-1 text-xs text-emerald-100/70">Multi-finance operations workspace · Mutiara Finance pilot</p></div></div>
            <div className="flex items-center gap-2 text-xs text-emerald-50/80"><span className="h-2 w-2 rounded-full bg-amber-300"/><span>{backendMode === "live" ? "Persistent application data" : "Sample data only"}</span><span className="mx-1 hidden h-5 w-px bg-white/20 sm:block"/><span className="hidden sm:inline">No live credit bureau or disbursement connection</span></div>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[235px_minmax(0,1fr)]">
            <aside className={(mobileNavOpen ? 'fixed inset-0 z-[70] block bg-slate-950/40 p-4 backdrop-blur-sm lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-none ' : 'hidden lg:block ')}>
              <div className={(mobileNavOpen ? 'h-full w-[280px] max-w-[85vw] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl lg:w-auto lg:max-w-none ' : '') + 'lg:sticky lg:top-28 lg:rounded-2xl lg:border lg:border-slate-200/80 lg:bg-white/85 lg:p-3 lg:shadow-sm'}>
                <div className="mb-4 flex items-center justify-between px-2 pt-2 lg:hidden"><span className="font-bold text-slate-900">Financing menu</span><button onClick={()=>setMobileNavOpen(false)} className="rounded-lg p-2 text-slate-500"><X size={18}/></button></div>
                <div className="mb-4 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Workspace</p><button className="mt-2 flex w-full items-center gap-2 text-left"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800">MF</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">Mutiara Finance</span><span className="mt-0.5 block text-[10px] text-slate-400">Pilot tenant</span></span><ChevronDown size={14} className="text-slate-400"/></button></div>
                {navGroups.map((group)=><div key={group.label} className="mb-4"><p className="mb-2 px-2 text-[9px] font-black tracking-[.15em] text-slate-400">{group.label}</p><div className="space-y-1">{group.items.map((item)=>{const Icon=item.icon;const active=module===item.key;return <button key={item.key} onClick={()=>{setModule(item.key);setMobileNavOpen(false);setSearch('');setStatusFilter('All statuses');}} className={'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition '+(active?'bg-emerald-700 text-white shadow-md shadow-emerald-900/10':'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}><Icon size={16}/><span className="flex-1">{item.label}</span>{item.count&&<span className={'rounded-md px-1.5 py-0.5 text-[9px] '+(active?'bg-white/15 text-white':'bg-slate-100 text-slate-500')}>{item.count}</span>}</button>})}</div></div>)}
                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><div className="flex items-center gap-2 text-xs font-bold text-emerald-900"><ShieldCheck size={15}/> Demo access</div><p className="mt-1.5 text-[10px] leading-relaxed text-emerald-800/75">No production privileges. All displayed records are fictional.</p></div>
              </div>
            </aside>

            <section className="min-w-0">
              <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3"><button onClick={()=>setMobileNavOpen(true)} className="mt-1 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm lg:hidden" aria-label="Open navigation"><Menu size={18}/></button><div><div className="flex items-center gap-2 text-xs text-slate-400"><span>Financing Core</span><ChevronRight size={13}/><span className="font-semibold text-slate-600">{pageTitle}</span></div><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{pageTitle}</h1><p className="mt-1.5 text-sm text-slate-500">{module==='overview'?'Monitor portfolio performance and daily operations.':module==='applications'?'Manage the application pipeline from intake to decision.':module==='credit'?'Review simulated cases and credit workflow status.':'Manage '+pageTitle.toLowerCase()+' for the financing workspace.'}</p></div></div>
                <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500 sm:inline-flex"><CalendarDays size={14}/> 17 Oct 2026 <ChevronDown size={13}/></span><button onClick={()=>notify('Demo workspace refreshed. No live systems were queried.')} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50" aria-label="Refresh demo"><Activity size={17}/></button><button onClick={()=>setShowNewApplication(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-800 sm:text-sm"><Plus size={15}/> <span className="hidden sm:inline">New application</span><span className="sm:hidden">New</span></button></div>
              </header>

              <div className={"mb-5 flex items-start gap-3 rounded-xl px-4 py-3 " + (backendMode === 'live' ? 'border border-emerald-100 bg-emerald-50/80' : 'border border-sky-100 bg-sky-50/80')}>
                <span className={backendMode === 'live' ? 'mt-0.5 text-emerald-700' : 'mt-0.5 text-sky-700'}><AlertCircle size={16}/></span>
                <p className={"text-xs leading-relaxed " + (backendMode === 'live' ? 'text-emerald-900/80' : 'text-sky-900/80')}>
                  {backendMode === 'live' ? <><strong>Backend connected:</strong> applications and overview are loaded from the authenticated financing API. Credit bureau, e-signature, loan servicing and money movement are not enabled.</> : backendMode === 'checking' ? <><strong>Checking financing API:</strong> if no authorized financing role is available, this workspace stays in demo mode.</> : backendMode === 'forbidden' ? <><strong>Demo mode:</strong> this account is not authorized for live financing data. Assign an approved financing role to enable access.</> : <><strong>Demo mode:</strong> the live API could not be reached. Displayed records are fictional and application creation remains local only.</>}
                </p>
              </div>

              {renderModuleContent()}
            </section>
          </div>
        </div>

        {showImportReconciliation && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={importReconciliation} className="w-full max-w-2xl rounded-2xl border border-white/60 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><ShieldCheck size={20}/></span><h2 className="mt-4 text-xl font-black text-slate-900">Import bank statement lines</h2><p className="mt-1 text-sm text-slate-500">Paste normalized JSON from an independently verified statement. No bank connection is made.</p></div><button type="button" onClick={()=>setShowImportReconciliation(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close import form"><X size={18}/></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Statement reference<input required minLength={6} maxLength={120} value={statementReference} onChange={e=>setStatementReference(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">Masked bank account<input required minLength={4} maxLength={40} value={maskedBankAccount} onChange={e=>setMaskedBankAccount(e.target.value)} placeholder="****1234" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-500"/><span className="mt-1 block text-[11px] font-normal text-rose-700">Do not enter a full bank account number.</span></label><label className="block text-sm font-semibold text-slate-700">Period start<input required type="date" value={statementPeriodStart} onChange={e=>setStatementPeriodStart(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">Period end<input required type="date" value={statementPeriodEnd} onChange={e=>setStatementPeriodEnd(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-500"/></label></div><label className="mt-4 block text-sm font-semibold text-slate-700">Normalized statement lines JSON<textarea required rows={8} value={statementLinesJson} onChange={e=>setStatementLinesJson(e.target.value)} spellCheck={false} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-mono text-xs outline-none focus:border-emerald-500" placeholder={'[{"transaction_date":"2026-10-18","direction":"IN","amount":1000000,"external_reference":"BANK-REF-123"}]'}/></label><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Each line needs transaction_date, direction (IN/OUT), amount and external_reference. Optional description_hash must be SHA-256. Raw bank descriptions and unmasked account numbers are not accepted.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setShowImportReconciliation(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={reconciliationSaving} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{reconciliationSaving?'Importing…':'Import statement'}</button></div></form></div>}
        {showRecordRepayment && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={saveRepaymentReceipt} className="w-full max-w-lg rounded-2xl border border-white/60 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><CreditCard size={20}/></span><h2 className="mt-4 text-xl font-black text-slate-900">Record repayment receipt</h2><p className="mt-1 text-sm text-slate-500">Records an internal receipt only; no bank settlement is verified.</p></div><button type="button" onClick={()=>setShowRecordRepayment(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close repayment form"><X size={18}/></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Loan account UUID<input required value={paymentAccountId} onChange={e=>setPaymentAccountId(e.target.value)} placeholder="Paste loan account ID" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-mono text-xs outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">Amount (IDR)<input required type="number" min="0.01" step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">Channel<input required minLength={2} maxLength={60} value={paymentChannel} onChange={e=>setPaymentChannel(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">External receipt reference<input maxLength={200} value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Bank / payment provider reference" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">Payment date<input required type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-emerald-500"/></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setShowRecordRepayment(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={servicingSaving} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{servicingSaving ? "Saving…" : "Save receipt"}</button></div></form></div>}
        {showAllocateRepayment && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={saveRepaymentAllocation} className="w-full max-w-lg rounded-2xl border border-white/60 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800"><CircleDollarSign size={20}/></span><h2 className="mt-4 text-xl font-black text-slate-900">Allocate repayment</h2><p className="mt-1 text-sm text-slate-500">Enter explicit component amounts. Allocation is posted to the ledger.</p></div><button type="button" onClick={()=>setShowAllocateRepayment(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close allocation form"><X size={18}/></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Repayment UUID<input required value={allocationPaymentId} onChange={e=>setAllocationPaymentId(e.target.value)} placeholder="Copy Payment ID from receipts table" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-mono text-xs outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">Schedule UUID<input required value={allocationScheduleId} onChange={e=>setAllocationScheduleId(e.target.value)} placeholder="Copy Schedule ID from schedule table" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-mono text-xs outline-none focus:border-emerald-500"/></label><div className="grid gap-3 sm:grid-cols-3"><label className="block text-sm font-semibold text-slate-700">Principal<input required type="number" min="0" step="0.01" value={allocationPrincipal} onChange={e=>setAllocationPrincipal(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-2 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">Interest<input required type="number" min="0" step="0.01" value={allocationInterest} onChange={e=>setAllocationInterest(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-2 py-3 font-normal outline-none focus:border-emerald-500"/></label><label className="block text-sm font-semibold text-slate-700">Fees<input required type="number" min="0" step="0.01" value={allocationFees} onChange={e=>setAllocationFees(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-2 py-3 font-normal outline-none focus:border-emerald-500"/></label></div></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setShowAllocateRepayment(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={servicingSaving} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{servicingSaving ? "Posting…" : "Post allocation"}</button></div></form></div>}
        {showNewApplication && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={addDemoApplication} className="w-full max-w-lg rounded-2xl border border-white/60 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><Plus size={20}/></span><h2 className="mt-4 text-xl font-black text-slate-900">{backendMode === 'live' ? 'Create financing application' : 'Create demo application'}</h2><p className="mt-1 text-sm text-slate-500">{backendMode === 'live' ? 'Saves a persistent application to the financing database.' : 'Adds a temporary local sample record only.'}</p></div><button type="button" onClick={()=>setShowNewApplication(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close modal"><X size={18}/></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Customer / business name<input required value={newCustomer} onChange={(e)=>setNewCustomer(e.target.value)} placeholder="e.g. PT Contoh Sejahtera" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"/></label><label className="block text-sm font-semibold text-slate-700">Customer type<select value={newCustomerType} onChange={(e)=>setNewCustomerType(e.target.value as 'INDIVIDUAL' | 'BUSINESS')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal outline-none focus:border-emerald-500"><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business</option></select></label><label className="block text-sm font-semibold text-slate-700">Financing product<select value={newProduct} onChange={(e)=>setNewProduct(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal outline-none focus:border-emerald-500">{products.map((p)=><option key={p.name}>{p.name}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Requested tenor (months)<select value={newTenor} onChange={(e)=>setNewTenor(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal outline-none focus:border-emerald-500">{[6,12,18,24,36,48,60,72,84,96,120].map((months)=><option key={months} value={months}>{months} months</option>)}</select></label><div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileUp size={17} className="text-emerald-700"/> Application documents</div><p className="mt-1 text-xs leading-relaxed text-slate-600">{newCustomerType==='INDIVIDUAL'?'Suggested: identity card, proof of address, income/bank statement, consent, and collateral evidence if applicable.':'Suggested: business registration, tax document, recent financial statements, authorized signatory identity, bank statement, consent, and collateral evidence if applicable.'}</p><label className="mt-3 block text-xs font-semibold text-slate-600">Document category<select value={newDocumentType} onChange={(e)=>setNewDocumentType(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="IDENTITY">Identity / authorized signatory</option><option value="PROOF_OF_ADDRESS">Proof of address</option><option value="INCOME_OR_BANK_STATEMENT">Income / bank statement</option><option value="BUSINESS_REGISTRATION">Business registration</option><option value="TAX_DOCUMENT">Tax document</option><option value="FINANCIAL_STATEMENT">Financial statement</option><option value="COLLATERAL">Collateral evidence</option><option value="SIGNED_CONSENT">Signed consent</option><option value="OTHER">Other</option></select></label><input className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-emerald-800" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={(e)=>setNewDocuments(Array.from(e.target.files??[]))}/><p className="mt-2 text-[11px] text-slate-500">{newDocuments.length} file(s) selected · max 10 MB each · private storage</p></div><label className="block text-sm font-semibold text-slate-700">Requested amount (IDR)<input required type="number" min="1" step="1000000" value={newAmount} onChange={(e)=>setNewAmount(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"/></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setShowNewApplication(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">{backendMode === 'live' ? 'Save application' : 'Add to demo'}</button></div></form></div>}

        {selectedApplication && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Demo application</span><h2 className="mt-3 text-xl font-black text-slate-900">{selectedApplication.customer}</h2><p className="mt-1 text-sm text-slate-400">{selectedApplication.id}</p></div><button onClick={()=>setSelectedApplication(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close details"><X size={18}/></button></div><div className="mt-5 grid grid-cols-2 gap-3">{[{label:'Product',value:selectedApplication.product},{label:'Requested amount',value:rupiah(selectedApplication.amount)},{label:'Current status',value:selectedApplication.status},{label:'Credit score',value:selectedApplication.score?selectedApplication.score+'/100':'Not assessed'},{label:'Submitted',value:selectedApplication.submitted},{label:'Assigned owner',value:selectedApplication.owner}].map((item)=><div key={item.label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">{item.label}</p><p className="mt-1 text-sm font-bold text-slate-800">{item.value}</p></div>)}</div>{backendMode==='live'&&selectedApplication.databaseId ? <div className="mt-5 rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-slate-900">Application documents</h3><span className="text-xs text-slate-400">{selectedDocuments.length} file(s)</span></div>{selectedDocumentsState==='loading'&&<p className="mt-2 text-xs text-slate-500">Loading documents…</p>}{selectedDocumentsState==='error'&&<p className="mt-2 text-xs text-rose-700">Document list unavailable for this account.</p>}{selectedDocumentsState==='live'&&<div className="mt-2 space-y-2">{selectedDocuments.map(doc=><div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{doc.file_name}</p><p className="mt-1 text-[11px] text-slate-500">{doc.document_type} · {(doc.size_bytes/1024/1024).toFixed(2)} MB · {doc.verification_status}</p></div>{doc.download_url&&<a href={doc.download_url} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-bold text-emerald-700">View</a>}</div>)}</div>}<div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr]"><select value={selectedDocumentType} onChange={(e)=>setSelectedDocumentType(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option value="IDENTITY">Identity</option><option value="PROOF_OF_ADDRESS">Proof of address</option><option value="INCOME_OR_BANK_STATEMENT">Income / bank statement</option><option value="BUSINESS_REGISTRATION">Business registration</option><option value="TAX_DOCUMENT">Tax document</option><option value="FINANCIAL_STATEMENT">Financial statement</option><option value="COLLATERAL">Collateral</option><option value="SIGNED_CONSENT">Signed consent</option><option value="OTHER">Other</option></select><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={(e)=>setSelectedDocumentFiles(Array.from(e.target.files??[]))} className="min-w-0 text-xs text-slate-500"/></div><button onClick={()=>void uploadSelectedApplicationDocuments()} disabled={!selectedDocumentFiles.length||selectedDocumentSaving} className="mt-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{selectedDocumentSaving?'Uploading…':'Upload selected documents'}</button></div> : <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">This is a demo record. Credit decisions and status transitions are not persisted to a backend.</p>}<div className="mt-5 flex justify-end"><button onClick={()=>setSelectedApplication(null)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Close details</button></div></div></div>}

        {toast && <div role="status" className="fixed bottom-5 right-5 z-[120] flex max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-2xl"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600"/><span>{toast}</span><button onClick={()=>setToast('')} className="ml-2 text-slate-400" aria-label="Dismiss notification"><X size={15}/></button></div>}
      </main>
    </div>
  );
};

export default FinancingPage;
