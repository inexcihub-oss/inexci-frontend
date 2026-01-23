"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Search, Plus } from "lucide-react";
import { healthPlanService, HealthPlan } from "@/services/health-plan.service";

interface HealthPlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHealthPlan: (healthPlan: HealthPlan) => void;
  onCreateNew: () => void;
}

export function HealthPlanSelectionModal({
  isOpen,
  onClose,
  onSelectHealthPlan,
  onCreateNew,
}: HealthPlanSelectionModalProps) {
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHealthPlans();
    }
  }, [isOpen]);

  const loadHealthPlans = async () => {
    setLoading(true);
    try {
      const data = await healthPlanService.getAll();
      setHealthPlans(data);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const filteredHealthPlans = healthPlans.filter((healthPlan) =>
    healthPlan.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar Convênio"
      size="lg"
    >
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar convênio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#DCDFE3] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Convênio
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : filteredHealthPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum convênio encontrado
            </div>
          ) : (
            filteredHealthPlans.map((healthPlan) => (
              <button
                key={healthPlan.id}
                onClick={() => {
                  onSelectHealthPlan(healthPlan);
                  onClose();
                }}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-all"
              >
                <div className="font-medium text-gray-900">
                  {healthPlan.name}
                </div>
                {healthPlan.phone && (
                  <div className="text-sm text-gray-500 mt-1">
                    Tel: {healthPlan.phone}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
