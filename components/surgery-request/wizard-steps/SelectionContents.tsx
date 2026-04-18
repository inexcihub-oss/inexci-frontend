"use client";

import React, { memo, useState, useEffect } from "react";
import Image from "next/image";
import { Procedure } from "@/services/procedure.service";
import { Patient } from "@/services/patient.service";
import { Hospital } from "@/services/hospital.service";
import { HealthPlan } from "@/services/health-plan.service";
import { User, AvailableDoctor } from "@/types";
import {
  surgeryRequestService,
  SurgeryRequestTemplate,
} from "@/services/surgery-request.service";

export const ProcedureSelectionContent = memo(function ProcedureSelectionContent({
  onSelect,
  onCreateNew,
  onNewItemCreated,
  selectedItemId,
  isActive,
}: {
  onSelect: (item: Procedure) => void;
  onCreateNew: () => void;
  onNewItemCreated: (item: Procedure) => void;
  selectedItemId?: string | number | null;
  isActive?: boolean;
}) {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadProcedures = async () => {
    setLoading(true);
    try {
      const { procedureService } = await import("@/services/procedure.service");
      const data = await procedureService.getAll();
      setProcedures(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setProcedures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadProcedures();
    }
  }, [isActive, hasLoaded]);

  useEffect(() => {
    if (onNewItemCreated) {
      const handleNewItem = (item: Procedure) => {
        setProcedures((prev) => [item, ...prev]);
      };
      onNewItemCreated(handleNewItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProcedures = procedures.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image src="/icons/search.svg" alt="Buscar" width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Procedimento" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm text-gray-900 placeholder:text-gray-400" />
        </div>
        <button onClick={onCreateNew} className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-xs md:text-sm">Novo</button>
      </div>
      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredProcedures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum procedimento encontrado</div>
        ) : (
          filteredProcedures.map((procedure) => {
            const isSelected = selectedItemId === procedure.id;
            return (
              <button type="button" key={procedure.id} onClick={() => onSelect(procedure)} className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200">
                <span className="text-xs md:text-sm text-gray-900">{procedure.name}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-teal-500" : "border-gray-300"}`}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-teal-500" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export const PatientSelectionContent = memo(function PatientSelectionContent({
  onSelect,
  onCreateNew,
  onNewItemCreated,
  selectedItemId,
  isActive,
}: {
  onSelect: (item: Patient) => void;
  onCreateNew: () => void;
  onNewItemCreated: (item: Patient) => void;
  selectedItemId?: string | number | null;
  isActive?: boolean;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { patientService } = await import("@/services/patient.service");
      const data = await patientService.getAll();
      setPatients(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadPatients();
    }
  }, [isActive, hasLoaded]);

  useEffect(() => {
    if (onNewItemCreated) {
      const handleNewItem = (item: Patient) => {
        setPatients((prev) => [item, ...prev]);
      };
      onNewItemCreated(handleNewItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image src="/icons/search.svg" alt="Buscar" width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Paciente" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm text-gray-900 placeholder:text-gray-400" />
        </div>
        <button onClick={onCreateNew} className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-xs md:text-sm">Novo</button>
      </div>
      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum paciente encontrado</div>
        ) : (
          filteredPatients.map((patient) => {
            const isSelected = selectedItemId === patient.id;
            return (
              <button type="button" key={patient.id} onClick={() => onSelect(patient)} className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200">
                <span className="text-xs md:text-sm text-gray-900">{patient.name}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-teal-500" : "border-gray-300"}`}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-teal-500" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export const HospitalSelectionContent = memo(function HospitalSelectionContent({
  onSelect,
  onDeselect,
  onCreateNew,
  onNewItemCreated,
  selectedItemId,
  isActive,
}: {
  onSelect: (item: Hospital) => void;
  onDeselect: () => void;
  onCreateNew: () => void;
  onNewItemCreated: (item: Hospital) => void;
  selectedItemId?: string | number | null;
  isActive?: boolean;
}) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const { hospitalService } = await import("@/services/hospital.service");
      const data = await hospitalService.getAll();
      setHospitals(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadHospitals();
    }
  }, [isActive, hasLoaded]);

  useEffect(() => {
    if (onNewItemCreated) {
      const handleNewItem = (item: Hospital) => {
        setHospitals((prev) => [item, ...prev]);
      };
      onNewItemCreated(handleNewItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image src="/icons/search.svg" alt="Buscar" width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Hospital" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm text-gray-900 placeholder:text-gray-400" />
        </div>
        <button onClick={onCreateNew} className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-xs md:text-sm">Novo</button>
      </div>
      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredHospitals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum hospital encontrado</div>
        ) : (
          filteredHospitals.map((hospital) => {
            const isSelected = selectedItemId === hospital.id;
            return (
              <button type="button" key={hospital.id} onClick={() => { if (isSelected) { onDeselect?.(); } else { onSelect(hospital); } }} className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200">
                <span className="text-xs md:text-sm text-gray-900">{hospital.name}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-teal-500" : "border-gray-300"}`}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-teal-500" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export const HealthPlanSelectionContent = memo(function HealthPlanSelectionContent({
  onSelect,
  onDeselect,
  onCreateNew,
  onNewItemCreated,
  selectedItemId,
  isActive,
}: {
  onSelect: (item: HealthPlan) => void;
  onDeselect: () => void;
  onCreateNew: () => void;
  onNewItemCreated: (item: HealthPlan) => void;
  selectedItemId?: string | number | null;
  isActive?: boolean;
}) {
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadHealthPlans = async () => {
    setLoading(true);
    try {
      const { healthPlanService } = await import("@/services/health-plan.service");
      const data = await healthPlanService.getAll();
      setHealthPlans(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setHealthPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadHealthPlans();
    }
  }, [isActive, hasLoaded]);

  useEffect(() => {
    if (onNewItemCreated) {
      const handleNewItem = (item: HealthPlan) => {
        setHealthPlans((prev) => [item, ...prev]);
      };
      onNewItemCreated(handleNewItem);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHealthPlans = healthPlans.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image src="/icons/search.svg" alt="Buscar" width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Convênio" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm text-gray-900 placeholder:text-gray-400" />
        </div>
        <button onClick={onCreateNew} className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-xs md:text-sm">Novo</button>
      </div>
      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredHealthPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum convênio encontrado</div>
        ) : (
          filteredHealthPlans.map((healthPlan) => {
            const isSelected = selectedItemId === healthPlan.id;
            return (
              <button type="button" key={healthPlan.id} onClick={() => { if (isSelected) { onDeselect?.(); } else { onSelect(healthPlan); } }} className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200">
                <span className="text-xs md:text-sm text-gray-900">{healthPlan.name}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-teal-500" : "border-gray-300"}`}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-teal-500" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export const DoctorSelectionContent = memo(function DoctorSelectionContent({
  onSelect,
  availableDoctors,
  loadingDoctors,
  selectedItemId,
}: {
  onSelect: (doctor: AvailableDoctor) => void;
  availableDoctors: AvailableDoctor[];
  loadingDoctors: boolean;
  selectedItemId?: string | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDoctors = availableDoctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.crm && d.crm.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image src="/icons/search.svg" alt="Buscar" width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Médico" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm text-gray-900 placeholder:text-gray-400" />
        </div>
      </div>
      <div className="border-t border-gray-200">
        {loadingDoctors ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum médico encontrado</div>
        ) : (
          filteredDoctors.map((doctor) => {
            const isSelected = selectedItemId === doctor.id;
            return (
              <button type="button" key={doctor.id} onClick={() => onSelect(doctor)} className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200">
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm text-gray-900">{doctor.name}</span>
                  {doctor.crm && <span className="text-xs text-gray-500">CRM {doctor.crm}{doctor.crm_state ? `/${doctor.crm_state}` : ""}</span>}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-teal-500" : "border-gray-300"}`}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-teal-500" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export const ManagerSelectionContent = memo(function ManagerSelectionContent({
  onSelect,
  onCreateNew,
  selectedItemId,
  isActive,
}: {
  onSelect: (manager: User) => void;
  onCreateNew?: () => void;
  onNewItemCreated?: (callback: (item: User) => void) => void;
  selectedItemId?: string | number | null;
  isActive?: boolean;
}) {
  const [managers, setManagers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const loadManagers = async () => {
    setLoading(true);
    try {
      const { userService } = await import("@/services/user.service");
      const data = await userService.getAll();
      setManagers(Array.isArray(data) ? data : []);
    } catch {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      loadManagers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const filteredManagers = managers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Image src="/icons/search.svg" alt="Buscar" width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Gestor" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm text-gray-900 placeholder:text-gray-400" />
        </div>
        {onCreateNew && (
          <button type="button" onClick={onCreateNew} className="h-12 px-6 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-xs md:text-sm">Novo</button>
        )}
      </div>
      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredManagers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum gestor encontrado</div>
        ) : (
          filteredManagers.map((manager) => {
            const isSelected = selectedItemId === manager.id;
            return (
              <button type="button" key={manager.id} onClick={() => onSelect(manager)} className="w-full flex items-center justify-between px-4 py-5 text-left cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-200">
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm text-gray-900">{manager.name}</span>
                  <span className="text-xs text-gray-500">{manager.email}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-teal-500" : "border-gray-300"}`}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-teal-500" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export const TemplateSelectionContent = memo(function TemplateSelectionContent({
  onSelect,
  isActive,
}: {
  onSelect: (template: SurgeryRequestTemplate) => void;
  isActive?: boolean;
}) {
  const [templates, setTemplates] = useState<SurgeryRequestTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadTemplates();
    }
  }, [isActive, hasLoaded]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await surgeryRequestService.getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = templates.filter((t) =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-6">
      <div className="relative mb-4">
        <Image src="/icons/search.svg" alt="Buscar" width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Buscar modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm text-gray-900 placeholder:text-gray-400" />
      </div>
      <div className="border-t border-gray-200">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando modelos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs md:text-sm text-gray-500">Nenhum modelo encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Salve uma solicitação como modelo ao enviá-la</p>
          </div>
        ) : (
          filtered.map((template) => {
            const procedureName =
              template.template_data?.procedure?.name ||
              template.template_data?.procedures?.[0]?.name;
            const hospitalName = template.template_data?.hospital?.name;
            const healthPlanName = template.template_data?.health_plan?.name;
            const meta = [hospitalName, healthPlanName].filter(Boolean).join(" · ");
            return (
              <button key={template.id} type="button" onClick={() => onSelect(template)} className="w-full flex items-start justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-xs md:text-sm font-medium text-gray-900 truncate">{template.name}</p>
                  {procedureName && <p className="text-xs text-teal-700 mt-0.5 truncate">{procedureName as string}</p>}
                  {meta && <p className="text-xs text-gray-400 mt-0.5 truncate">{meta}</p>}
                </div>
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});
