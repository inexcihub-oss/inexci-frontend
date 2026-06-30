"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronRight,
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { DateInput } from "@/components/ui/DateInput";
import { FormSection } from "@/components/details";
import { OpmeModal } from "@/components/opme/OpmeModal";
import { TussProcedureModal } from "@/components/tuss/TussProcedureModal";
import { useZodForm } from "@/hooks/useZodForm";
import { useAvailableDoctors } from "@/hooks/useAvailableDoctors";
import { useCepLookup } from "@/hooks/useCepLookup";
import { unmask } from "@/lib/masks";
import { STATE_OPTIONS } from "@/lib/options";
import { procedureService, Procedure } from "@/services/procedure.service";
import { hospitalService } from "@/services/hospital.service";
import { healthPlanService } from "@/services/health-plan.service";
import { surgeryRequestService } from "@/services/surgery-request.service";
import {
  ExtractFromDocumentResponse,
  DocumentEntityCandidate,
  NewPatientFromDocument,
  TussItemFromDocument,
  OpmeItemFromDocument,
  ReportSectionFromDocument,
} from "@/types/surgery-request.types";
import { getApiErrorMessage } from "@/lib/http-error";
import { useToast } from "@/hooks/useToast";

// ─── Padding de fornecedor/fabricante OPME ──────────────────────────────────
//
// Espelha `MIN_OPME_OPTIONS`/`FALLBACK_OPME_NAME` do backend
// (surgery-request-assembly.service.ts): a plataforma exige >=3
// fornecedores e >=3 fabricantes por item OPME. Pré-preenchemos aqui com
// "Outros" para que o OpmeModal já abra em estado completo, evitando que o
// usuário precise digitar manualmente alternativas que o documento não trouxe.

const MIN_OPME_OPTIONS = 3;
const OPME_FALLBACK_NAME = "Outros";

function dedupeNames(names: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function padNames(names: string[], min: number, fallback: string): string[] {
  const out = [...names];
  while (out.length < min) out.push(fallback);
  return out;
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function normalizeToIsoDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const br = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return "";
}

function mergeEntityCandidates(
  extracted: DocumentEntityCandidate[],
  all: DocumentEntityCandidate[],
): DocumentEntityCandidate[] {
  const byId = new Map<string, DocumentEntityCandidate>();
  for (const item of [...extracted, ...all]) {
    if (!item?.id) continue;
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    procedureId: z.string().optional(),
    procedureName: z.string().optional(),
    doctorId: z.string().min(1, "Selecione o médico"),
    patientMode: z.enum(["existing", "new"]),
    patientId: z.string().optional(),
    newPatientName: z.string().optional(),
    newPatientCpf: z.string().optional(),
    newPatientBirthDate: z.string().optional(),
    newPatientGender: z.string().optional(),
    newPatientPhone: z.string().optional(),
    newPatientZipCode: z.string().optional(),
    newPatientState: z.string().optional(),
    newPatientAddress: z.string().optional(),
    newPatientAddressNumber: z.string().optional(),
    newPatientAddressComplement: z.string().optional(),
    newPatientNeighborhood: z.string().optional(),
    newPatientCity: z.string().optional(),
    newPatientHealthPlanNumber: z.string().optional(),
    hospitalId: z.string().optional(),
    hospitalName: z.string().optional(),
    healthPlanId: z.string().optional(),
    healthPlanName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.procedureId && !data.procedureName?.trim()) {
      ctx.addIssue({
        path: ["procedureId"],
        code: z.ZodIssueCode.custom,
        message: "Selecione ou informe o procedimento",
      });
    }
    if (data.patientMode === "existing" && !data.patientId) {
      ctx.addIssue({
        path: ["patientId"],
        code: z.ZodIssueCode.custom,
        message: "Selecione o paciente",
      });
    }
    if (data.patientMode === "new") {
      if (!data.newPatientName || data.newPatientName.trim().length < 2) {
        ctx.addIssue({
          path: ["newPatientName"],
          code: z.ZodIssueCode.custom,
          message: "Nome do paciente é obrigatório",
        });
      }
      const cpfDigits = (data.newPatientCpf ?? "").replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        ctx.addIssue({
          path: ["newPatientCpf"],
          code: z.ZodIssueCode.custom,
          message: "CPF deve ter 11 dígitos",
        });
      }
      const phoneDigits = (data.newPatientPhone ?? "").replace(/\D/g, "");
      if (
        phoneDigits &&
        phoneDigits.length !== 10 &&
        phoneDigits.length !== 11
      ) {
        ctx.addIssue({
          path: ["newPatientPhone"],
          code: z.ZodIssueCode.custom,
          message: "Telefone inválido",
        });
      }
      const cepDigits = (data.newPatientZipCode ?? "").replace(/\D/g, "");
      if (cepDigits && cepDigits.length !== 8) {
        ctx.addIssue({
          path: ["newPatientZipCode"],
          code: z.ZodIssueCode.custom,
          message: "CEP inválido",
        });
      }
    }
  });

type FormValues = z.input<typeof formSchema>;

interface TussDisplayItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
}

interface OpmeDisplayItem {
  id: string;
  name: string;
  manufacturers: string[];
  suppliers: string[];
  quantity: number;
}

interface SectionRow {
  title: string;
  description: string;
}

// ─── Combobox de procedimento (criação adiada para o submit) ───────────────
//
// Mesmo padrão do ManufacturerAutocomplete/SupplierAutocomplete usados no
// OpmeModal: campo de busca + dropdown. Quando não existe resultado exato,
// o procedimento novo é criado apenas ao salvar a solicitação.

interface ProcedureComboboxProps {
  procedures: Procedure[];
  value: string;
  query: string;
  onSelect: (id: string) => void;
  onQueryChange: (name: string) => void;
  error?: string;
}

function ProcedureCombobox({
  procedures,
  value,
  query,
  onSelect,
  onQueryChange,
  error,
}: ProcedureComboboxProps) {
  const selected = procedures.find((p) => p.id === value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = procedures.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const hasExactMatch = procedures.some(
    (p) => p.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const handleSelect = (p: Procedure) => {
    onSelect(p.id);
    onQueryChange(p.name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={selected?.name ?? query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            if (value) onSelect("");
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar ou criar procedimento..."
          className={`ds-input pl-9 pr-9 ${error ? "border-red-500" : ""}`}
        />
        {selected && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center justify-between ${
                value === p.id
                  ? "bg-teal-50 text-teal-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              <span className="truncate">{p.name}</span>
              {value === p.id && (
                <Check className="h-4 w-4 text-teal-600 shrink-0" />
              )}
            </button>
          ))}

          {filtered.length === 0 && !hasExactMatch && (
            <div className="px-3 py-2 text-sm text-gray-400">
              Nenhum procedimento encontrado.
            </div>
          )}

          {query.trim() && !hasExactMatch && (
            <div className="w-full text-left px-3 py-2.5 text-sm text-teal-700 border-t border-neutral-100 font-medium flex items-center gap-2">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">
                &ldquo;{query.trim()}&rdquo; será criado ao salvar
              </span>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface EntityComboboxDeferredCreateProps {
  value: string;
  query: string;
  options: DocumentEntityCandidate[];
  placeholder: string;
  emptyText: string;
  createLabel: string;
  onSelect: (id: string) => void;
  onQueryChange: (name: string) => void;
}

function EntityComboboxDeferredCreate({
  value,
  query,
  options,
  placeholder,
  emptyText,
  createLabel,
  onSelect,
  onQueryChange,
}: EntityComboboxDeferredCreateProps) {
  const selected = options.find((o) => o.id === value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase()),
  );
  const hasExactMatch = options.some(
    (o) => o.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const handleSelect = (o: DocumentEntityCandidate) => {
    onSelect(o.id);
    onQueryChange(o.name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={selected?.name ?? query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            if (value) onSelect("");
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="ds-input pl-9 pr-9"
        />
        {selected && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => handleSelect(o)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center justify-between ${
                value === o.id
                  ? "bg-teal-50 text-teal-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              <span className="truncate">{o.name}</span>
              {value === o.id && (
                <Check className="h-4 w-4 text-teal-600 shrink-0" />
              )}
            </button>
          ))}

          {filtered.length === 0 && query.trim() && !hasExactMatch && (
            <div className="px-3 py-2 text-sm text-gray-400">{emptyText}</div>
          )}

          {query.trim() && !hasExactMatch && (
            <div className="w-full text-left px-3 py-2.5 text-sm text-teal-700 border-t border-neutral-100 font-medium flex items-center gap-2">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">
                &ldquo;{query.trim()}&rdquo; será criado como {createLabel} ao
                salvar
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NovaViaDocumentoPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [extraction, setExtraction] =
    useState<ExtractFromDocumentResponse | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [allHospitals, setAllHospitals] = useState<DocumentEntityCandidate[]>(
    [],
  );
  const [allHealthPlans, setAllHealthPlans] = useState<
    DocumentEntityCandidate[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [tussItems, setTussItems] = useState<TussDisplayItem[]>([]);
  const [opmeItems, setOpmeItems] = useState<OpmeDisplayItem[]>([]);
  const [expandedOpme, setExpandedOpme] = useState<Record<string, boolean>>({});
  const [sectionRows, setSectionRows] = useState<SectionRow[]>([]);
  const [isTussModalOpen, setIsTussModalOpen] = useState(false);
  const [isOpmeModalOpen, setIsOpmeModalOpen] = useState(false);

  const { data: availableDoctors = [] } = useAvailableDoctors();

  const form = useZodForm({
    schema: formSchema,
    initialValues: {
      procedureId: "",
      procedureName: "",
      doctorId: "",
      patientMode: "existing",
      patientId: "",
      newPatientName: "",
      newPatientCpf: "",
      newPatientBirthDate: "",
      newPatientGender: "",
      newPatientPhone: "",
      newPatientZipCode: "",
      newPatientState: "",
      newPatientAddress: "",
      newPatientAddressNumber: "",
      newPatientAddressComplement: "",
      newPatientNeighborhood: "",
      newPatientCity: "",
      newPatientHealthPlanNumber: "",
      hospitalId: "",
      hospitalName: "",
      healthPlanId: "",
      healthPlanName: "",
    } satisfies FormValues,
  });

  const { values, errors, setField, setValues } = form;

  // Busca automática de endereço por CEP (ViaCEP) — só ativa em modo "novo paciente"
  const { loading: cepLoading } = useCepLookup({
    cep: values.newPatientZipCode,
    enabled: values.patientMode === "new",
    onResolved: (data) => {
      setValues({
        newPatientAddress: data.logradouro || values.newPatientAddress,
        newPatientNeighborhood: data.bairro || values.newPatientNeighborhood,
        newPatientCity: data.cidade || values.newPatientCity,
        newPatientState: data.uf || values.newPatientState,
      });
    },
  });

  // Carrega extraction do sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("sc_from_document_extraction");
    if (!raw) {
      router.replace("/solicitacoes-cirurgicas");
      return;
    }
    try {
      setExtraction(JSON.parse(raw) as ExtractFromDocumentResponse);
    } catch {
      router.replace("/solicitacoes-cirurgicas");
    }
  }, [router]);

  useEffect(() => {
    procedureService
      .getAll()
      .then(setProcedures)
      .catch(() => {});

    hospitalService
      .getAll()
      .then((rows) =>
        setAllHospitals(rows.map((h) => ({ id: h.id, name: h.name }))),
      )
      .catch(() => {});

    healthPlanService
      .getAll()
      .then((rows) =>
        setAllHealthPlans(rows.map((h) => ({ id: h.id, name: h.name }))),
      )
      .catch(() => {});
  }, []);

  // Preenche o formulário e as listas de TUSS/OPME após carregar a extração
  useEffect(() => {
    if (!extraction) return;
    const e = extraction.extracted ?? {};
    const c = extraction.candidates;
    const patch: Partial<FormValues> = {};

    if (availableDoctors[0]?.id) patch.doctorId = availableDoctors[0].id;

    const hasPatientCandidates = (c?.patient?.length ?? 0) > 0;
    patch.patientMode = hasPatientCandidates ? "existing" : "new";
    if (c?.patient?.length === 1) patch.patientId = c.patient[0].id;
    if (e.patient?.name) patch.newPatientName = e.patient.name;
    if (e.patient?.cpf) patch.newPatientCpf = e.patient.cpf.replace(/\D/g, "");
    const isoDate = normalizeToIsoDate(e.patient?.birthDate);
    if (isoDate) patch.newPatientBirthDate = isoDate;
    if (e.patient?.gender) patch.newPatientGender = e.patient.gender;
    if (e.patient?.phone) patch.newPatientPhone = e.patient.phone;
    if (e.patient?.zipCode) patch.newPatientZipCode = e.patient.zipCode;
    if (e.patient?.state) patch.newPatientState = e.patient.state;
    if (e.patient?.address) patch.newPatientAddress = e.patient.address;
    if (e.patient?.addressNumber)
      patch.newPatientAddressNumber = e.patient.addressNumber;
    if (e.patient?.addressComplement)
      patch.newPatientAddressComplement = e.patient.addressComplement;
    if (e.patient?.neighborhood)
      patch.newPatientNeighborhood = e.patient.neighborhood;
    if (e.patient?.city) patch.newPatientCity = e.patient.city;
    if (e.healthPlan?.planId)
      patch.newPatientHealthPlanNumber = e.healthPlan.planId;
    if (c?.procedure?.length === 1) patch.procedureId = c.procedure[0].id;
    if (c?.hospital?.length === 1) patch.hospitalId = c.hospital[0].id;
    if (e.hospital) patch.hospitalName = e.hospital;
    if (c?.healthPlan?.length === 1) patch.healthPlanId = c.healthPlan[0].id;
    if (e.healthPlan?.name) patch.healthPlanName = e.healthPlan.name;

    form.setValues(patch);

    if (e.tuss?.length) {
      setTussItems(
        e.tuss.map((t, i) => ({
          id: String(i),
          code: t.code ?? "",
          name: t.description ?? "",
          quantity: t.qty ?? 1,
        })),
      );
    }

    if (e.opme?.length) {
      setOpmeItems(
        e.opme.map((o, i) => ({
          id: String(i),
          name: o.description ?? "",
          quantity: o.qty ?? 1,
          suppliers: padNames(
            dedupeNames([o.supplier, ...(e.suggestedSuppliers ?? [])]),
            MIN_OPME_OPTIONS,
            OPME_FALLBACK_NAME,
          ),
          manufacturers: padNames(
            dedupeNames([o.manufacturer]),
            MIN_OPME_OPTIONS,
            OPME_FALLBACK_NAME,
          ),
        })),
      );
    }

    if (e.reportSections?.length) {
      setSectionRows(
        e.reportSections.map((s) => ({
          title: s.title ?? "",
          description: s.description ?? "",
        })),
      );
    } else if (e.laudoText) {
      setSectionRows([{ title: "Laudo", description: e.laudoText }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraction, availableDoctors]);

  // ─── OPME/TUSS helpers ─────────────────────────────────────────────────────

  const toggleOpmeExpand = (id: string) =>
    setExpandedOpme((prev) => ({ ...prev, [id]: !prev[id] }));

  const removeOpmeItem = (id: string) =>
    setOpmeItems((prev) => prev.filter((item) => item.id !== id));

  const removeTussItem = (id: string) =>
    setTussItems((prev) => prev.filter((item) => item.id !== id));

  // ─── Seções do laudo helpers ───────────────────────────────────────────────

  const addSectionRow = () =>
    setSectionRows((prev) => [...prev, { title: "", description: "" }]);

  const removeSectionRow = (i: number) =>
    setSectionRows((prev) => prev.filter((_, idx) => idx !== i));

  const updateSectionRow = (
    i: number,
    field: keyof SectionRow,
    value: string,
  ) =>
    setSectionRows((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)),
    );

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!extraction) return;
    setSubmitting(true);
    try {
      let newPatient: NewPatientFromDocument | undefined;
      if (values.patientMode === "new") {
        const rawDate = values.newPatientBirthDate ?? "";
        const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
          ? rawDate
          : undefined;
        newPatient = {
          name: values.newPatientName!,
          cpf: (values.newPatientCpf ?? "").replace(/\D/g, ""),
          birthDate: isoDate,
          gender: values.newPatientGender || undefined,
          phone: values.newPatientPhone?.trim() || undefined,
          zipCode: unmask(values.newPatientZipCode) || undefined,
          state: values.newPatientState || undefined,
          address: values.newPatientAddress?.trim() || undefined,
          addressNumber: values.newPatientAddressNumber?.trim() || undefined,
          addressComplement:
            values.newPatientAddressComplement?.trim() || undefined,
          neighborhood: values.newPatientNeighborhood?.trim() || undefined,
          city: values.newPatientCity?.trim() || undefined,
          healthPlanNumber:
            values.newPatientHealthPlanNumber?.trim() || undefined,
        };
      }

      const tussPayload: TussItemFromDocument[] = tussItems
        .filter((item) => item.code.trim())
        .map((item) => ({
          tussCode: item.code.trim(),
          name: item.name.trim() || undefined,
          quantity: item.quantity,
        }));

      const opmePayload: OpmeItemFromDocument[] = opmeItems
        .filter((item) => item.name.trim())
        .map((item) => ({
          description: item.name.trim(),
          qty: item.quantity || 1,
          supplier:
            item.suppliers.filter((s) => s.trim()).join(", ") || undefined,
          manufacturer:
            item.manufacturers.filter((m) => m.trim()).join(", ") || undefined,
        }));

      const sections: ReportSectionFromDocument[] = sectionRows
        .filter((r) => r.title.trim())
        .map((r) => ({
          title: r.title.trim(),
          description: r.description.trim() || undefined,
        }));

      const result = await surgeryRequestService.createFromDocument({
        doctorId: values.doctorId,
        patientId:
          values.patientMode === "existing" && values.patientId
            ? values.patientId
            : undefined,
        newPatient,
        procedureId: values.procedureId || undefined,
        procedureName:
          !values.procedureId && values.procedureName?.trim()
            ? values.procedureName.trim()
            : undefined,
        hospitalId: values.hospitalId || undefined,
        hospitalName:
          !values.hospitalId && values.hospitalName?.trim()
            ? values.hospitalName.trim()
            : undefined,
        healthPlanId: values.healthPlanId || undefined,
        healthPlanName:
          !values.healthPlanId && values.healthPlanName?.trim()
            ? values.healthPlanName.trim()
            : undefined,
        healthPlanNumber:
          values.patientMode === "existing"
            ? ext.healthPlan?.planId?.trim() || undefined
            : undefined,
        sections: sections.length > 0 ? sections : undefined,
        tussItems: tussPayload.length > 0 ? tussPayload : undefined,
        opmeItems: opmePayload.length > 0 ? opmePayload : undefined,
        tempStoragePath: extraction.tempStoragePath,
      });

      sessionStorage.removeItem("sc_from_document_extraction");

      if (result.warnings.length > 0) {
        showToast(
          `Solicitação criada com alertas: ${result.warnings.join("; ")}`,
          "warning",
        );
      } else {
        showToast("Solicitação criada com sucesso!", "success");
      }

      router.replace(`/solicitacao/${result.id}`);
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, "Erro ao criar solicitação."), "error");
    } finally {
      setSubmitting(false);
    }
  });

  if (!extraction) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      </PageContainer>
    );
  }

  const doctorOptions = availableDoctors.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  const patientOptions = (extraction.candidates?.patient ?? []).map(
    (c: DocumentEntityCandidate) => ({
      value: c.id,
      label: `${c.name}${c.cpf ? ` — CPF ${c.cpf}` : ""}`,
    }),
  );

  const hospitalCandidates = mergeEntityCandidates(
    extraction.candidates?.hospital ?? [],
    allHospitals,
  );

  const healthPlanCandidates = mergeEntityCandidates(
    extraction.candidates?.healthPlan ?? [],
    allHealthPlans,
  );

  const ext = extraction.extracted ?? {};
  const extractedPatient = ext.patient;

  // Só exibimos os campos que o documento efetivamente preencheu — o resto
  // o usuário completa depois, no cadastro do paciente.
  const showBirthDate = !!extractedPatient?.birthDate;
  const showGender = !!extractedPatient?.gender;
  const showPhone = !!extractedPatient?.phone;
  const showZipCode = !!extractedPatient?.zipCode;
  const showState = !!extractedPatient?.state;
  const showAddress = !!extractedPatient?.address;
  const showAddressNumber = !!extractedPatient?.addressNumber;
  const showAddressComplement = !!extractedPatient?.addressComplement;
  const showNeighborhood = !!extractedPatient?.neighborhood;
  const showCity = !!extractedPatient?.city;
  const showHealthPlanNumber = !!ext.healthPlan?.planId;
  const showHealthPlanSection = true;
  const showHospitalSection = true;

  return (
    <PageContainer>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-neutral-100 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-500" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">
                Revisar e criar solicitação
              </h1>
              <p className="text-sm text-neutral-500">
                Confirme os dados extraídos do documento antes de criar a
                solicitação.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Convênio/Hospital/Procedimento serão criados ao salvar.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Procedimento */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Procedimento <span className="text-red-500">*</span>
              </label>
              {ext.suggestedProcedureName && (
                <p className="text-xs text-neutral-500 mb-1.5">
                  Sugerido pelo documento: &ldquo;{ext.suggestedProcedureName}
                  &rdquo;
                </p>
              )}
              <ProcedureCombobox
                procedures={procedures}
                value={values.procedureId ?? ""}
                query={values.procedureName ?? ""}
                onSelect={(id) => setField("procedureId", id)}
                onQueryChange={(name) => setField("procedureName", name)}
                error={errors.procedureId}
              />
            </div>

            {/* Médico */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Médico <span className="text-red-500">*</span>
              </label>
              <Select
                value={values.doctorId}
                onChange={(e) => setField("doctorId", e.target.value)}
                options={doctorOptions}
                error={errors.doctorId}
              />
            </div>

            {/* Paciente */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-neutral-700">
                Paciente <span className="text-red-500">*</span>
              </label>

              {/* Toggle existente / novo — só faz sentido quando há candidatos */}
              {patientOptions.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setField("patientMode", "existing")}
                    className={[
                      "flex-1 py-2 rounded-xl text-sm font-medium transition-colors border",
                      values.patientMode === "existing"
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    Paciente existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setField("patientMode", "new")}
                    className={[
                      "flex-1 py-2 rounded-xl text-sm font-medium transition-colors border",
                      values.patientMode === "new"
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    Novo paciente
                  </button>
                </div>
              )}

              {values.patientMode === "existing" &&
              patientOptions.length > 0 ? (
                <Select
                  value={values.patientId}
                  onChange={(e) => setField("patientId", e.target.value)}
                  options={[
                    { value: "", label: "Selecione o paciente..." },
                    ...patientOptions,
                  ]}
                  error={errors.patientId}
                />
              ) : (
                <FormSection title="Identificação do paciente">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome completo"
                      required
                      value={values.newPatientName}
                      onChange={(e) =>
                        setField("newPatientName", e.target.value)
                      }
                      placeholder="Nome do paciente"
                      error={errors.newPatientName}
                    />
                    <Input
                      label="CPF"
                      required
                      mask="cpf"
                      value={values.newPatientCpf}
                      onChange={(e) =>
                        setField("newPatientCpf", e.target.value)
                      }
                      placeholder="000.000.000-00"
                      error={errors.newPatientCpf}
                    />
                    {showBirthDate && (
                      <DateInput
                        label="Data de nascimento"
                        value={values.newPatientBirthDate ?? ""}
                        onChange={(v) => setField("newPatientBirthDate", v)}
                      />
                    )}
                    {showGender && (
                      <Select
                        label="Sexo"
                        value={values.newPatientGender}
                        onChange={(e) =>
                          setField("newPatientGender", e.target.value)
                        }
                        options={[
                          { value: "", label: "Não informado" },
                          { value: "M", label: "Masculino" },
                          { value: "F", label: "Feminino" },
                        ]}
                      />
                    )}
                    {showPhone && (
                      <Input
                        label="Telefone"
                        mask="phone"
                        value={values.newPatientPhone}
                        onChange={(e) =>
                          setField("newPatientPhone", e.target.value)
                        }
                        placeholder="(00) 00000-0000"
                        error={errors.newPatientPhone}
                      />
                    )}
                    {showZipCode && (
                      <div className="relative">
                        <Input
                          label="CEP"
                          mask="cep"
                          value={values.newPatientZipCode}
                          onChange={(e) =>
                            setField("newPatientZipCode", e.target.value)
                          }
                          placeholder="00000-000"
                          error={errors.newPatientZipCode}
                        />
                        {cepLoading && (
                          <Loader2 className="absolute right-3 top-9 w-4 h-4 text-gray-400 animate-spin" />
                        )}
                      </div>
                    )}
                    {showState && (
                      <Select
                        label="Estado"
                        value={values.newPatientState}
                        onChange={(e) =>
                          setField("newPatientState", e.target.value)
                        }
                        options={STATE_OPTIONS}
                      />
                    )}
                    {showAddress && (
                      <div className="md:col-span-2">
                        <Input
                          label="Logradouro"
                          value={values.newPatientAddress}
                          onChange={(e) =>
                            setField("newPatientAddress", e.target.value)
                          }
                          placeholder="Rua / Avenida / Travessa"
                        />
                      </div>
                    )}
                    {showAddressNumber && (
                      <Input
                        label="Número"
                        value={values.newPatientAddressNumber}
                        onChange={(e) =>
                          setField("newPatientAddressNumber", e.target.value)
                        }
                      />
                    )}
                    {showAddressComplement && (
                      <Input
                        label="Complemento"
                        value={values.newPatientAddressComplement}
                        onChange={(e) =>
                          setField(
                            "newPatientAddressComplement",
                            e.target.value,
                          )
                        }
                      />
                    )}
                    {showNeighborhood && (
                      <Input
                        label="Bairro"
                        value={values.newPatientNeighborhood}
                        onChange={(e) =>
                          setField("newPatientNeighborhood", e.target.value)
                        }
                      />
                    )}
                    {showCity && (
                      <Input
                        label="Cidade"
                        value={values.newPatientCity}
                        onChange={(e) =>
                          setField("newPatientCity", e.target.value)
                        }
                      />
                    )}
                  </div>
                </FormSection>
              )}
            </div>

            {/* Convênio — convênio (vínculo da SC) e número da carteirinha (do
              novo paciente) ficam juntos no mesmo cartão, como na página de
              detalhe do paciente. */}
            {showHealthPlanSection && (
              <FormSection title="Convênio">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Convênio
                    </label>
                    <EntityComboboxDeferredCreate
                      value={values.healthPlanId ?? ""}
                      query={values.healthPlanName ?? ""}
                      options={healthPlanCandidates}
                      placeholder="Buscar ou criar convênio..."
                      emptyText="Nenhum convênio encontrado"
                      createLabel="convênio"
                      onSelect={(id) => setField("healthPlanId", id)}
                      onQueryChange={(name) => setField("healthPlanName", name)}
                    />
                  </div>
                  {values.patientMode === "new" && showHealthPlanNumber && (
                    <Input
                      label="Número da carteirinha"
                      value={values.newPatientHealthPlanNumber}
                      onChange={(e) =>
                        setField("newPatientHealthPlanNumber", e.target.value)
                      }
                      placeholder="Número da carteirinha do convênio"
                    />
                  )}
                </div>
              </FormSection>
            )}

            {/* Hospital */}
            {showHospitalSection && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Hospital
                </label>
                <EntityComboboxDeferredCreate
                  value={values.hospitalId ?? ""}
                  query={values.hospitalName ?? ""}
                  options={hospitalCandidates}
                  placeholder="Buscar ou criar hospital..."
                  emptyText="Nenhum hospital encontrado"
                  createLabel="hospital"
                  onSelect={(id) => setField("hospitalId", id)}
                  onQueryChange={(name) => setField("hospitalName", name)}
                />
              </div>
            )}

            {/* Códigos TUSS — mesmo design da aba "Código TUSS" da solicitação */}
            <div className="border border-neutral-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <h3 className="ds-section-title">Códigos TUSS</h3>
                <button
                  type="button"
                  onClick={() => setIsTussModalOpen(true)}
                  className="ds-btn-inline"
                >
                  {tussItems.length > 0 ? "Editar" : "Adicionar Procedimento"}
                </button>
              </div>

              {tussItems.length > 0 && (
                <div className="flex items-center gap-6 px-4 py-2 border-b border-neutral-100">
                  <span className="flex-1 text-xs text-gray-900 opacity-50">
                    Procedimento
                  </span>
                  <span className="text-xs text-gray-900 opacity-50">
                    Quantidade
                  </span>
                </div>
              )}

              {tussItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-xs md:text-sm">
                  Nenhum código TUSS extraído. Clique em &ldquo;Adicionar
                  Procedimento&rdquo; para incluir manualmente.
                </div>
              ) : (
                tussItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`relative flex items-center gap-4 px-4 pr-16 py-3 ${
                      index < tussItems.length - 1
                        ? "border-b border-neutral-100"
                        : ""
                    }`}
                  >
                    <span className="flex-1 text-xs md:text-sm text-gray-900 leading-normal truncate">
                      {item.code}
                      {item.name ? ` - ${item.name}` : ""}
                    </span>
                    <span className="text-xs text-gray-900 font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTussItem(item.id)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                      aria-label="Remover procedimento"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Materiais OPME — mesmo design da aba "OPME" da solicitação */}
            <div className="border border-neutral-100 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <h3 className="ds-section-title">Materiais OPME</h3>
                <button
                  type="button"
                  onClick={() => setIsOpmeModalOpen(true)}
                  className="ds-btn-inline"
                >
                  {opmeItems.length > 0 ? "Editar" : "Adicionar OPME"}
                </button>
              </div>

              {opmeItems.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-1 border-b border-neutral-100">
                  <div className="w-6 h-6 opacity-0" aria-hidden />
                  <span className="flex-1 text-xs text-gray-900 opacity-50">
                    Descrição
                  </span>
                  <div className="w-6 h-6 opacity-0" aria-hidden />
                </div>
              )}

              {opmeItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-xs md:text-sm">
                  Nenhum material OPME extraído. Clique em &ldquo;Adicionar
                  OPME&rdquo; para incluir manualmente.
                </div>
              ) : (
                opmeItems.map((item) => {
                  const expanded = expandedOpme[item.id] ?? true;
                  const manufacturers = item.manufacturers.filter((m) =>
                    m.trim(),
                  );
                  const suppliers = item.suppliers.filter((s) => s.trim());
                  return (
                    <div key={item.id} className="flex flex-col w-full">
                      <div className="flex items-center w-full gap-3 px-4 py-3 border-b border-neutral-100 bg-white">
                        <button
                          type="button"
                          onClick={() => toggleOpmeExpand(item.id)}
                          className={`w-6 h-6 flex items-center justify-center transition-transform flex-shrink-0 ${
                            expanded ? "rotate-90" : "rotate-0"
                          }`}
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Recolher" : "Expandir"} ${item.name}`}
                        >
                          <ChevronRight
                            className="w-5 h-5 text-gray-900"
                            strokeWidth={1.5}
                          />
                        </button>
                        <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900 leading-normal">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            Quantidade:
                          </span>
                          <span className="text-xs md:text-sm font-semibold text-gray-900">
                            {item.quantity}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOpmeItem(item.id)}
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 transition-colors flex-shrink-0"
                          aria-label="Remover material"
                        >
                          <Trash2
                            className="w-4 h-4 text-red-400"
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>

                      {expanded && (
                        <div className="flex flex-col sm:flex-row w-full border-b border-neutral-100">
                          {/* Fabricantes */}
                          <div className="flex-1 flex flex-col sm:border-r border-b sm:border-b-0 border-neutral-100">
                            <div className="flex w-full px-4 py-3 bg-white border-b border-neutral-100">
                              <span className="text-xs font-semibold text-gray-500 w-full">
                                FABRICANTES
                              </span>
                            </div>
                            {manufacturers.map((m, i) => (
                              <div
                                key={i}
                                className={`flex w-full px-4 py-3 bg-gray-100 ${
                                  i < manufacturers.length - 1
                                    ? "border-b border-neutral-100"
                                    : ""
                                }`}
                              >
                                <span className="text-xs text-gray-900 w-full">
                                  {m}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Fornecedores */}
                          <div className="flex-1 flex flex-col">
                            <div className="flex w-full px-4 py-3 bg-white border-b border-neutral-100">
                              <span className="text-xs font-semibold text-gray-500 w-full">
                                FORNECEDORES
                              </span>
                            </div>
                            {suppliers.map((s, i) => (
                              <div
                                key={i}
                                className={`flex w-full px-4 py-3 bg-gray-100 ${
                                  i < suppliers.length - 1
                                    ? "border-b border-neutral-100"
                                    : ""
                                }`}
                              >
                                <span className="text-xs text-gray-900 w-full">
                                  {s}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Seções do laudo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-neutral-700">
                  Seções do laudo
                </label>
                <button
                  type="button"
                  onClick={addSectionRow}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>

              {sectionRows.length === 0 ? (
                <p className="text-xs text-neutral-400 py-2">
                  Nenhuma seção extraída. Clique em &ldquo;Adicionar&rdquo; para
                  incluir manualmente.
                </p>
              ) : (
                <div className="space-y-3">
                  {sectionRows.map((row, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-neutral-500 mb-1">
                            Título <span className="text-red-400">*</span>
                          </label>
                          <Input
                            value={row.title}
                            onChange={(e) =>
                              updateSectionRow(i, "title", e.target.value)
                            }
                            placeholder="Ex.: Histórico e Diagnóstico"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSectionRow(i)}
                          className="mt-5 p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                          aria-label="Remover seção"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">
                          Descrição
                        </label>
                        <textarea
                          value={row.description}
                          onChange={(e) =>
                            updateSectionRow(i, "description", e.target.value)
                          }
                          rows={5}
                          placeholder="Texto da seção..."
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full sm:w-auto min-w-[180px]"
              >
                {submitting ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando solicitação...
                  </span>
                ) : (
                  "Criar solicitação"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <TussProcedureModal
        isOpen={isTussModalOpen}
        onClose={() => setIsTussModalOpen(false)}
        surgeryRequestId="doc-draft"
        onSuccess={() => setIsTussModalOpen(false)}
        onLocalSave={(items) =>
          setTussItems(
            items.map((item, i) => ({
              id: String(i),
              code: item.tussCode,
              name: item.name,
              quantity: item.quantity,
            })),
          )
        }
        initialItems={tussItems.map((item) => ({
          tussCode: item.code,
          name: item.name,
          quantity: item.quantity,
        }))}
      />

      <OpmeModal
        isOpen={isOpmeModalOpen}
        onClose={() => setIsOpmeModalOpen(false)}
        surgeryRequestId="doc-draft"
        onSuccess={() => setIsOpmeModalOpen(false)}
        onLocalSave={(items) =>
          setOpmeItems(
            items.map((item, i) => ({
              id: String(i),
              name: item.name,
              manufacturers: item.manufacturers,
              suppliers: item.suppliers,
              quantity: item.quantity,
            })),
          )
        }
        initialItems={opmeItems.map((item) => ({
          name: item.name,
          manufacturers: item.manufacturers,
          suppliers: item.suppliers,
          quantity: item.quantity,
        }))}
      />
    </PageContainer>
  );
}
