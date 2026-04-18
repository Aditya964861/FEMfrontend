import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import toast from 'react-hot-toast';
import { referenceApi, paymentApi, sharepointApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import type { PaymentInstructionCreate, SelectOption, Beneficiary } from '../types';

import {
  RefreshCw,
} from 'lucide-react';


interface UploadedFile {
  filename: string;
  invoiceNumber: string;
  webUrl?: string;
  fileId?: string;
  size?: number;
}

export default function PaymentInstructionForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PaymentInstructionCreate>();

  // ── Load reference data ─────────────────────────────────────────────
  const { data: entities, isLoading: loadingEntities } = useQuery({
    queryKey: ['paying-entities'],
    queryFn: () => referenceApi.getPayingEntities(),
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => referenceApi.getCategories(),
  });

  const { data: currencies, isLoading: loadingCurrencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => referenceApi.getCurrencies(),
  });

  const { data: beneficiaries, isLoading: loadingBeneficiaries } = useQuery({
    queryKey: ['beneficiaries', 'approved'],
    queryFn: () => referenceApi.getBeneficiaries(undefined, true),
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['payment-templates'],
    queryFn: () => referenceApi.getPaymentTemplates(),
  });

  const [duplicateWarning, setDuplicateWarning] = useState<{
    invoiceNumber: string;
    piId: string;
    status: string;
  } | null>(null);

  // ── Fetch pending invoices from SharePoint ──────────────────────────
  const { data: pendingInvoices, isLoading: loadingPending, refetch: refetchPending } = useQuery({
    queryKey: ['pending-invoices'],
    queryFn: () => sharepointApi.listPendingInvoices(),
    staleTime: 30_000,
  });

  // Merge SharePoint pending invoices into uploadedFiles (once on load)
  useEffect(() => {
    if (!pendingInvoices?.items) return;
    const spFiles: UploadedFile[] = pendingInvoices.items
      .filter((item: { name: string; is_folder: boolean }) => !item.is_folder)
      .map((item: { name: string; web_url?: string; size?: number }) => ({
        filename: item.name,
        invoiceNumber: item.name.replace(/\.[^/.]+$/, ''),
        webUrl: item.web_url,
        size: item.size,
      }));
    setUploadedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.filename));
      const newFiles = spFiles.filter((f) => !existingNames.has(f.filename));
      return newFiles.length > 0 ? [...prev, ...newFiles] : prev;
    });
  }, [pendingInvoices]);

  const createMutation = useMutation({
    mutationFn: paymentApi.create,
    onSuccess: (data) => {
      toast.success('Payment instruction created');
      navigate(`/payment-instructions/${data.id}`);
    },
    onError: (error: unknown) => {
      // Check for 409 duplicate invoice
      const axiosErr = error as { response?: { status?: number; data?: { detail?: { message?: string; pi_id?: string; status?: string } } } };
      if (axiosErr?.response?.status === 409 && axiosErr.response.data?.detail?.pi_id) {
        const detail = axiosErr.response.data.detail;
        setDuplicateWarning({
          invoiceNumber: detail.message || '',
          piId: detail.pi_id!,
          status: detail.status || '',
        });
        toast.error('A payment instruction already exists for this invoice');
      } else {
        toast.error('Failed to create payment instruction');
      }
    },
  });

  const isLoading =
    loadingEntities ||
    loadingCategories ||
    loadingCurrencies ||
    loadingBeneficiaries ||
    loadingTemplates;

  if (isLoading) return <LoadingSpinner text="Loading form data..." />;

  // ── Select options ──────────────────────────────────────────────────
  const entityOptions: SelectOption[] = (entities || []).map((e) => ({
    value: e.id,
    label: `${e.entity_name} (${e.entity_identifier})`,
  }));

  const categoryOptions: SelectOption[] = (categories || []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const currencyOptions: SelectOption[] = (currencies || []).map((c) => ({
    value: c.id,
    label: c.code,
  }));

  const beneficiaryOptions: SelectOption[] = (beneficiaries || []).map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const templateOptions: SelectOption[] = (templates || []).map((t) => ({
    value: t.id,
    label: t.name,
  }));

  // Invoice number options derived from uploaded filenames (name without extension)
  const invoiceNumberOptions: SelectOption[] = uploadedFiles.map((f) => ({
    value: f.invoiceNumber,
    label: f.invoiceNumber,
  }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await sharepointApi.uploadInvoice(file);
        const invoiceNumber = file.name.replace(/\.[^/.]+$/, ''); // strip extension
        const uploaded: UploadedFile = {
          filename: file.name,
          invoiceNumber,
          webUrl: result.web_url,
          fileId: result.file_id,
          size: result.size,
        };
        setUploadedFiles((prev) => {
          // Avoid duplicates
          if (prev.some((f) => f.filename === uploaded.filename)) return prev;
          return [...prev, uploaded];
        });
        toast.success(`"${file.name}" uploaded successfully`);

        // Check if a PI already exists for this invoice number
        try {
          const dupCheck = await paymentApi.checkDuplicate(invoiceNumber);
          if (dupCheck.exists && dupCheck.pi_id) {
            setDuplicateWarning({
              invoiceNumber,
              piId: dupCheck.pi_id,
              status: dupCheck.status || '',
            });
          } else {
            // Clear any previous warning if this invoice is clean
            setDuplicateWarning((prev) =>
              prev?.invoiceNumber === invoiceNumber ? null : prev
            );
          }
        } catch {
          // Non-critical — still allow the upload
        }
      } catch {
        toast.error(`Failed to upload "${file.name}"`);
      }
    }
    setIsUploading(false);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  

  const onSubmit = (data: PaymentInstructionCreate) => {
    // Attach the uploaded file info
    const matched = uploadedFiles.find((f) => f.invoiceNumber === data.invoice_number);
    if (matched) {
      data.invoice_filename = matched.filename;
      data.invoice_sharepoint_url = matched.webUrl;
    }
    createMutation.mutate(data);
  };

  const handleClear = () => {
    reset();
    setSelectedBeneficiary(null);
    setUploadedFiles([]);
    setDuplicateWarning(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Custom styles for react-select to match Power Apps dropdowns ────
  const selectStyles = {
    control: (base: Record<string, unknown>) => ({
      ...base,
      borderColor: '#D2E1E9',
      backgroundColor: '#F1FAFF',
      borderWidth: '1px',
      borderRadius: '5px',
      fontSize: '12px',
      boxShadow: 'none',
      '&:hover': { borderColor: '' },
    }),
    dropdownIndicator: (base: Record<string, unknown>) => ({
      ...base,
      color: '#989BA6',
      backgroundColor: 'transparent',
      padding: '6px 8px',
      '& svg': {
        width: '14px',
        height: '14px',
      },
      '&:hover': { color: '#000' },
    }),
    option: (base: Record<string, unknown>) => ({
    ...base,
    fontSize: '12px',
    padding: '8px 12px',
  }),
    indicatorSeparator: () => ({ display: 'none' }),
  };

  return (
    <>

    <div className="flex items-center justify-between border-b border-[#E1E5E6] pb-4 mb-8">
      <div className=''>
        <h1>Payment Inputs</h1>
        <p>Step 1 — Upload Invoice File(s)</p>
      </div>

      <button
        type="button"
        onClick={() => { refetchPending(); queryClient.invalidateQueries({ queryKey: ['pending-invoices'] }); toast.success('Refreshing invoices from SharePoint…'); }}
        className="btn-primary flex items-center gap-1 outline-none"
        title="Refresh invoices from SharePoint"
        >
        <RefreshCw  
          className="w-4 h-4"
        />  Refresh
      </button>
    </div>


    
    <div className="max-w-3xl form-default-component">
      {/* ── Step 1: Invoice File Upload ───────────────────────────── */}
      <div className="mb-4 flex gap-4">
        <h2>Basic Information</h2>
      </div>

      <div className="mb-4">
        <div className="">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 mb-4">
            <div>
              <label className="">
                Invoice File(s)<span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={handleFileUpload}
                className="cursor-pointer w-full file:cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:bg-[#D3F263] file:text-[#474E30] file:transition-colors file:hover:bg-[#03283f] file:hover:text-white"
              />
              {isUploading && (
                <p className="text-xs text-blue-600 mt-1 animate-pulse">Uploading…</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Duplicate Invoice Warning Banner ───────────────────────── */}
      {duplicateWarning && (
        <div className="mb-6 border-2 border-amber-400 bg-amber-50 rounded-lg px-5 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-bold text-amber-800">
                A Payment Instruction already exists for invoice "{duplicateWarning.invoiceNumber}"
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Status: <span className="font-semibold capitalize">{duplicateWarning.status}</span>
              </p>
              <button
                type="button"
                onClick={() => navigate(`/payment-instructions/${duplicateWarning.piId}`)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 underline"
              >
                Review existing PI →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 border-b border-[#E1E5E6] pb-8">
        {/* ── Row 1: Paying Entity, Category, Invoice Number ──────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <div>
            <label className="">
              Paying Entity<span className="text-red-500">*</span>
            </label>
            <Controller
              name="paying_entity_id"
              control={control}
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <Select
                  options={entityOptions}
                  onChange={(opt) => field.onChange(opt?.value)}
                  placeholder="Type to search..."
                  isSearchable
                  openMenuOnClick={false}
                  filterOption={(option, inputValue) => {
                    if (!inputValue) return true;
                    return option.label
                      .toLowerCase()
                      .includes(inputValue.toLowerCase());
                  }}
                  noOptionsMessage={({ inputValue }) =>
                    inputValue
                      ? 'No matching entity'
                      : 'Start typing to search'
                  }
                  styles={selectStyles}
                />
              )}
            />
            {errors.paying_entity_id && (
              <p className="text-red-500 text-xs mt-1">{errors.paying_entity_id.message}</p>
            )}
          </div>
          <div>
            <label className="">Category</label>
            <Controller
              name="category_id"
              control={control}
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <Select
                  options={categoryOptions}
                  onChange={(opt) => field.onChange(opt?.value)}
                  placeholder=""
                  styles={selectStyles}
                />
              )}
            />
          </div>
          <div>
            <label className="">
              Invoice Number<span className="text-red-500">*</span>
            </label>
            <Controller
              name="invoice_number"
              control={control}
              rules={{ required: 'Upload a file first' }}
              render={({ field }) => (
                <Select
                  options={invoiceNumberOptions}
                  onChange={(opt) => field.onChange(opt?.value || '')}
                  placeholder={
                    loadingPending
                      ? 'Loading invoices…'
                      : uploadedFiles.length === 0
                        ? 'Upload or refresh invoices'
                        : 'Select invoice…'
                  }
                  isDisabled={uploadedFiles.length === 0 && !loadingPending}
                  isLoading={loadingPending}
                  styles={selectStyles}
                />
              )}
            />
            {errors.invoice_number && (
              <p className="text-red-500 text-xs mt-1">{errors.invoice_number.message}</p>
            )}
          </div>
        </div>

        {/* ── Row 2: Currency, Amount, Value Date, Invoice Date ──────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <label className="">Currency</label>
            <Controller
              name="currency_id"
              control={control}
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <Select
                  options={currencyOptions}
                  onChange={(opt) => field.onChange(opt?.value)}
                  placeholder=""
                  styles={selectStyles}
                />
              )}
            />
          </div>
          <div>
            <label className="">Amount</label>
            <input
              type="number"
              step="0.01"
              {...register('amount', {
                required: 'Required',
                valueAsNumber: true,
                min: { value: 0.01, message: 'Must be > 0' },
              })}
              className=""
              placeholder="Amount"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
            )}
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className="">Value Date</label>
              <input
                type="date"
                {...register('value_date', { required: 'Required' })}
                className=""
              />
            </div>
            <div>
              <label className="">Invoice Date</label>
              <input
                type="date"
                {...register('invoice_date', { required: 'Required' })}
                className=""
              />
            </div>

          </div>
        </div>
      </div>

      {/* ── Beneficiary Details — cyan header bar ─────────────────── */}
      <div className="mb-8 border-b border-[#E1E5E6] pb-8">
        <div className="mb-4">
          <h2>Beneficiary Details</h2>
        </div>
        <div className="">
          {/* Beneficiary Name dropdown */}
          <div className="grid gap-2 mb-4">
            <div>
              <label className="">Name</label>
              <Controller
                name="beneficiary_id"
                control={control}
                rules={{ required: 'Required' }}
                render={({ field }) => (
                  <Select
                    options={beneficiaryOptions}
                    onChange={(opt) => {
                      field.onChange(opt?.value);
                      const ben = (beneficiaries || []).find(
                        (b) => b.id === opt?.value,
                      );
                      setSelectedBeneficiary(ben || null);
                      setValue('account_name', ben?.account_name || '');
                    }}
                    placeholder=""
                    isSearchable
                    styles={selectStyles}
                  />
                )}
              />
            </div>
          </div>

          {/* Auto-populated fields — Account Name, IBAN, BIC/Swift, Bank Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 gap-y-4">
            <div>
              <label className="">Account Name</label>
              <div className="input-box">
                {selectedBeneficiary?.account_name || '—'}
              </div>
              <input type="hidden" {...register('account_name')} />
            </div>
            <div>
              <label className="">IBAN</label>
              <div className="input-box">
                {selectedBeneficiary?.iban || '—'}
              </div>
            </div>
            <div>
              <label className="">Bank BIC/Swift:</label>
              <div className="input-box">
                {selectedBeneficiary?.bic || '—'}
              </div>
            </div>
            <div>
              <label className="">Bank Name</label>
              <div className="input-box">
                {selectedBeneficiary?.bank_name || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PI Template dropdown ──────────────────────────────────── */}
      <div className="">
        <div className="mb-4">
          <h2>Other Information</h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mb-4'>
          <div className=''>
            <label className="">PI Template</label>
            <Controller
              name="template_id"
              control={control}
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <Select
                  options={templateOptions}
                  onChange={(opt) => field.onChange(opt?.value)}
                  placeholder=""
                  styles={selectStyles}
                />
              )}
            />
          </div>

          {/* ── Description ───────────────────────────────────────────── */}
          <div className="">
            <label className="">Description</label>
            <input
              {...register('description')}
              className=""
              placeholder="Description"
            />
          </div>
        </div>

        {/* ── Additional Info ────────────────────────────────────────── */}
        <div className="mb-4 w-full">
          <label className="">Additional Info</label>
          <input
            {...register('additional_info')}
            className=""
            placeholder="Additional Information"
          />
        </div>



      </div>

      {/* ── Hidden fields ──────────────────────────────────────────── */}
      <input type="hidden" {...register('invoice_id')} />
      <input type="hidden" {...register('invoice_filename')} />

      {/* ── Action Buttons ───────────────────────────────────────── */}
      <div className="flex gap-4 mt-8 mb-6">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={createMutation.isPending || uploadedFiles.length === 0}
          className="px-8 py-2 bg-[#D3F263] text-[#414532] font-semibold rounded-lg text-sm
                     hover:bg-[#03283f] hover:text-white transition-colors min-w-[160px]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? 'Generating...' : 'Generate Draft'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-8 py-2 text-[#414532] hover:text-white border border-[#ADAEB4] font-semibold rounded-lg text-sm
                     hover:bg-[#03283f] transition-colors min-w-[160px]"
        >
          Clear
        </button>
      </div>
    </div>

    </>

  );
}
