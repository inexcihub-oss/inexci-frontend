"use client";

import { useState, useEffect } from "react";
import {
  collaboratorService,
  Collaborator,
} from "@/services/collaborator.service";
import { hospitalService, Hospital } from "@/services/hospital.service";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";
import { supplierService, Supplier } from "@/services/supplier.service";
import { Checkbox, SearchIcon, DotsMenuIcon } from "@/components/ui";

type TabType = "assistentes" | "hospitais" | "convenios" | "fornecedores";

type CollaboratorRole = "admin" | "editor" | "viewer";

export default function ColaboradoresPage() {
  const [activeTab, setActiveTab] = useState<TabType>("assistentes");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Data states
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Selected items for checkbox
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Load data based on active tab
  useEffect(() => {
    loadData();
    setSelectedItems(new Set()); // Clear selection when changing tabs
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "assistentes":
          const collabData = await collaboratorService.getAll();
          setCollaborators(collabData);
          break;
        case "hospitais":
          const hospitalData = await hospitalService.getAll();
          setHospitals(hospitalData);
          break;
        case "convenios":
          const healthPlanData = await healthPlanService.getAll();
          setHealthPlans(healthPlanData);
          break;
        case "fornecedores":
          const supplierData = await supplierService.getAll();
          setSuppliers(supplierData);
          break;
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const currentData = getCurrentData();
    if (selectedItems.size === currentData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentData.map((item) => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "assistentes":
        return collaborators;
      case "hospitais":
        return hospitals;
      case "convenios":
        return healthPlans;
      case "fornecedores":
        return suppliers;
      default:
        return [];
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    if (!searchTerm) return data;

    return data.filter((item) => {
      const name = item.name.toLowerCase();
      const email = "email" in item ? item.email?.toLowerCase() || "" : "";
      const search = searchTerm.toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  };

  const getRoleBadge = (role?: CollaboratorRole) => {
    if (!role) return null;

    const roleConfig = {
      admin: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        label: "Administrador",
      },
      editor: {
        bg: "bg-yellow-50",
        text: "text-yellow-800",
        label: "Editor",
      },
      viewer: {
        bg: "bg-teal-50",
        text: "text-teal-700",
        label: "Visualizador",
      },
    };

    const config = roleConfig[role];

    return (
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center justify-center px-2 py-2 rounded-lg border border-gray-200 ${config.bg}`}
        >
          <span className={`text-xs ${config.text}`}>{config.label}</span>
        </div>
      </div>
    );
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const colors = [
      "bg-blue-200",
      "bg-green-200",
      "bg-yellow-200",
      "bg-purple-200",
      "bg-pink-200",
      "bg-indigo-200",
    ];
    const idString = String(id);
    const index = idString.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center gap-2 px-8 py-3 border-b border-gray-200">
        <h1 className="text-3xl font-semibold text-black font-urbanist">
          Colaboradores
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex-none flex items-center px-8 border-b border-gray-200">
        <div className="flex items-center h-full">
          <button
            onClick={() => setActiveTab("assistentes")}
            className={`px-3 py-4 text-sm transition-colors ${
              activeTab === "assistentes"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-black hover:bg-gray-50"
            }`}
          >
            Assistentes
          </button>
          <button
            onClick={() => setActiveTab("hospitais")}
            className={`px-3 py-4 text-sm transition-colors ${
              activeTab === "hospitais"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-black hover:bg-gray-50"
            }`}
          >
            Hospitais
          </button>
          <button
            onClick={() => setActiveTab("convenios")}
            className={`px-3 py-4 text-sm transition-colors ${
              activeTab === "convenios"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-black hover:bg-gray-50"
            }`}
          >
            Convênios
          </button>
          <button
            onClick={() => setActiveTab("fornecedores")}
            className={`px-3 py-4 text-sm transition-colors ${
              activeTab === "fornecedores"
                ? "font-semibold text-black border-b-[3px] border-teal-500"
                : "font-normal text-black hover:bg-gray-50"
            }`}
          >
            Fornecedores
          </button>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex-none flex items-center justify-between gap-2 px-8 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* Search Field */}
          <div className="relative flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded w-85">
            <SearchIcon size={24} className="w-6 h-6 text-gray-600" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-xs text-gray-600 placeholder:text-gray-600 outline-none bg-transparent"
            />
          </div>

          {/* Filter Button */}
          <button className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 transition-colors">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 4h18M3 10h12M3 16h6"
              />
            </svg>
            <span className="text-sm text-black">Filtro</span>
          </button>
        </div>

        {/* New Button */}
        <button className="flex items-center justify-center gap-3 px-6 py-2 bg-teal-500 rounded hover:bg-teal-600 transition-colors">
          <span className="text-sm font-semibold text-white">
            {activeTab === "assistentes" && "Novo assistente"}
            {activeTab === "hospitais" && "Novo hospital"}
            {activeTab === "convenios" && "Novo convênio"}
            {activeTab === "fornecedores" && "Novo fornecedor"}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table Header - Assistentes */}
            {activeTab === "assistentes" && (
              <>
                <div className="flex items-center gap-4 px-8 py-3 pr-14 border-b border-gray-200">
                  <Checkbox
                    checked={
                      selectedItems.size === collaborators.length &&
                      collaborators.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    indeterminate={
                      selectedItems.size > 0 &&
                      selectedItems.size < collaborators.length
                    }
                  />
                  <span className="flex-1 text-xs text-black opacity-70">
                    Nome
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    E-mail
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    Especialidade
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    Telefone
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    Permissão
                  </span>
                </div>

                {/* Table Rows - Assistentes */}
                {getFilteredData().map((item) => {
                  const collab = item as Collaborator;
                  const isSelected = selectedItems.has(collab.id);
                  return (
                    <div
                      key={collab.id}
                      className="flex items-center gap-4 px-8 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectItem(collab.id)}
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(
                            collab.id,
                          )}`}
                        >
                          {getInitials(collab.name)}
                        </div>
                        <span className="text-xs font-semibold text-black">
                          {collab.name}
                        </span>
                      </div>
                      <span className="flex-1 text-xs text-black">
                        {collab.email}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {collab.specialty || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {collab.phone || "-"}
                      </span>
                      <div className="flex-1">{getRoleBadge(collab.role)}</div>
                      <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
                        <DotsMenuIcon size={16} className="text-gray-600" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Table Header - Hospitais */}
            {activeTab === "hospitais" && (
              <>
                <div className="flex items-center gap-4 px-8 py-3 pr-14 border-b border-gray-200">
                  <Checkbox
                    checked={
                      selectedItems.size === hospitals.length &&
                      hospitals.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    indeterminate={
                      selectedItems.size > 0 &&
                      selectedItems.size < hospitals.length
                    }
                  />
                  <span className="flex-1 text-xs text-black opacity-70">
                    Nome
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    CNPJ
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    E-mail
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    Telefone
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    Endereço
                  </span>
                </div>

                {/* Table Rows - Hospitais */}
                {getFilteredData().map((item) => {
                  const hospital = item as Hospital;
                  const isSelected = selectedItems.has(hospital.id);
                  return (
                    <div
                      key={hospital.id}
                      className="flex items-center gap-4 px-8 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectItem(hospital.id)}
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(
                            hospital.id,
                          )}`}
                        >
                          {getInitials(hospital.name)}
                        </div>
                        <span className="text-xs font-semibold text-black">
                          {hospital.name}
                        </span>
                      </div>
                      <span className="flex-1 text-xs text-black">
                        {hospital.cnpj || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {hospital.email || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {hospital.phone || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {hospital.address || "-"}
                      </span>
                      <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
                        <DotsMenuIcon size={16} className="text-gray-600" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Table Header - Convênios */}
            {activeTab === "convenios" && (
              <>
                <div className="flex items-center gap-4 px-8 py-3 pr-14 border-b border-gray-200">
                  <Checkbox
                    checked={
                      selectedItems.size === healthPlans.length &&
                      healthPlans.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    indeterminate={
                      selectedItems.size > 0 &&
                      selectedItems.size < healthPlans.length
                    }
                  />
                  <span className="flex-1 text-xs text-black opacity-70">
                    Nome
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    CNPJ
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    E-mail
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    Telefone
                  </span>
                </div>

                {/* Table Rows - Convênios */}
                {getFilteredData().map((item) => {
                  const healthPlan = item as HealthPlan;
                  const isSelected = selectedItems.has(healthPlan.id);
                  return (
                    <div
                      key={healthPlan.id}
                      className="flex items-center gap-4 px-8 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectItem(healthPlan.id)}
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(
                            healthPlan.id,
                          )}`}
                        >
                          {getInitials(healthPlan.name)}
                        </div>
                        <span className="text-xs font-semibold text-black">
                          {healthPlan.name}
                        </span>
                      </div>
                      <span className="flex-1 text-xs text-black">
                        {healthPlan.cnpj || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {healthPlan.email || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {healthPlan.phone || "-"}
                      </span>
                      <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
                        <DotsMenuIcon size={16} className="text-gray-600" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Table Header - Fornecedores */}
            {activeTab === "fornecedores" && (
              <>
                <div className="flex items-center gap-4 px-8 py-3 pr-14 border-b border-gray-200">
                  <Checkbox
                    checked={
                      selectedItems.size === suppliers.length &&
                      suppliers.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    indeterminate={
                      selectedItems.size > 0 &&
                      selectedItems.size < suppliers.length
                    }
                  />
                  <span className="flex-1 text-xs text-black opacity-70">
                    Nome
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    CNPJ
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    E-mail
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    Telefone
                  </span>
                  <span className="flex-1 text-xs text-black opacity-70">
                    Endereço
                  </span>
                </div>

                {/* Table Rows - Fornecedores */}
                {getFilteredData().map((item) => {
                  const supplier = item as Supplier;
                  const isSelected = selectedItems.has(supplier.id);
                  return (
                    <div
                      key={supplier.id}
                      className="flex items-center gap-4 px-8 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectItem(supplier.id)}
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${getRandomColor(
                            supplier.id,
                          )}`}
                        >
                          {getInitials(supplier.name)}
                        </div>
                        <span className="text-xs font-semibold text-black">
                          {supplier.name}
                        </span>
                      </div>
                      <span className="flex-1 text-xs text-black">
                        {supplier.cnpj || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {supplier.email || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {supplier.phone || "-"}
                      </span>
                      <span className="flex-1 text-xs text-black">
                        {supplier.address || "-"}
                      </span>
                      <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50">
                        <DotsMenuIcon size={16} className="text-gray-600" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Empty State */}
            {getFilteredData().length === 0 && !loading && (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
