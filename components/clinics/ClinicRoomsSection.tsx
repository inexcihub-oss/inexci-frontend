"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { clinicService, ClinicRoom } from "@/services/clinic.service";
import { clinicRoomsQueryKey, useClinicRooms } from "@/hooks/useClinicRooms";
import { getApiErrorMessage } from "@/lib/http-error";
import { cn } from "@/lib/utils";

/**
 * Salas (consultórios) da clínica. Opcional: clínica sem sala funciona como
 * antes, e a consulta só oferece "Sala" quando há alguma cadastrada.
 *
 * Salva cada ação na hora, independente do formulário da clínica ao lado.
 * Desativar tira a sala do agendamento sem apagar o histórico das consultas.
 */
export function ClinicRoomsSection({ clinicId }: { clinicId: string }) {
  const queryClient = useQueryClient();
  const { data: rooms = [], isLoading } = useClinicRooms(clinicId);
  const [novoNome, setNovoNome] = useState("");
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = () =>
    queryClient.invalidateQueries({ queryKey: clinicRoomsQueryKey(clinicId) });
  const comErro = (fallback: string) => (err: unknown) =>
    setErro(getApiErrorMessage(err, fallback));

  const criar = useMutation({
    mutationFn: (nome: string) => clinicService.createRoom(clinicId, nome),
    onSuccess: () => {
      setNovoNome("");
      setErro(null);
      return recarregar();
    },
    onError: comErro("Não foi possível adicionar a sala."),
  });
  const atualizar = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      active?: boolean;
    }) => clinicService.updateRoom(clinicId, id, payload),
    onSuccess: () => {
      setEditando(null);
      setErro(null);
      return recarregar();
    },
    onError: comErro("Não foi possível alterar a sala."),
  });
  const excluir = useMutation({
    mutationFn: (id: string) => clinicService.deleteRoom(clinicId, id),
    onSuccess: () => {
      setErro(null);
      return recarregar();
    },
    onError: comErro("Não foi possível excluir a sala."),
  });

  const ocupado = criar.isPending || atualizar.isPending || excluir.isPending;

  const adicionar = () => {
    const nome = novoNome.trim();
    if (nome) criar.mutate(nome);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-neutral-500">
        Opcional. Com salas cadastradas, a consulta pode indicar em qual
        consultório acontece.
      </p>

      {isLoading ? (
        <p className="text-sm text-neutral-400">Carregando salas...</p>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma sala cadastrada.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-100">
          {rooms.map((room) => (
            <SalaLinha
              key={room.id}
              room={room}
              editando={editando?.id === room.id ? editando.nome : null}
              ocupado={ocupado}
              onEditar={() => setEditando({ id: room.id, nome: room.name })}
              onMudarNome={(nome) => setEditando({ id: room.id, nome })}
              onCancelarEdicao={() => setEditando(null)}
              onSalvarNome={(nome) =>
                atualizar.mutate({ id: room.id, name: nome })
              }
              onAlternarAtiva={() =>
                atualizar.mutate({ id: room.id, active: !room.active })
              }
              onExcluir={() => {
                if (
                  window.confirm(
                    `Excluir a sala "${room.name}"? As consultas antigas continuam mostrando o nome.`,
                  )
                ) {
                  excluir.mutate(room.id);
                }
              }}
            />
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          aria-label="Nome da nova sala"
          className="ds-input flex-1"
          placeholder="Ex.: Consultório 01"
          maxLength={80}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={!novoNome.trim() || ocupado}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar sala
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-red-600">
          {erro}
        </p>
      )}
    </div>
  );
}

function SalaLinha({
  room,
  editando,
  ocupado,
  onEditar,
  onMudarNome,
  onCancelarEdicao,
  onSalvarNome,
  onAlternarAtiva,
  onExcluir,
}: {
  room: ClinicRoom;
  editando: string | null;
  ocupado: boolean;
  onEditar: () => void;
  onMudarNome: (nome: string) => void;
  onCancelarEdicao: () => void;
  onSalvarNome: (nome: string) => void;
  onAlternarAtiva: () => void;
  onExcluir: () => void;
}) {
  const botao =
    "inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-40";

  if (editando !== null) {
    return (
      <li className="flex items-center gap-2 px-3 py-2">
        <input
          aria-label={`Novo nome da sala ${room.name}`}
          className="ds-input flex-1"
          maxLength={80}
          value={editando}
          onChange={(e) => onMudarNome(e.target.value)}
        />
        <button
          type="button"
          aria-label="Salvar nome"
          className={botao}
          disabled={!editando.trim() || ocupado}
          onClick={() => onSalvarNome(editando.trim())}
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Cancelar"
          className={botao}
          onClick={onCancelarEdicao}
        >
          <X className="w-4 h-4" />
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span
        className={cn(
          "flex-1 text-sm",
          room.active ? "text-neutral-800" : "text-neutral-400",
        )}
      >
        {room.name}
        {!room.active && (
          <span className="ml-2 text-xs rounded-full border border-neutral-200 px-2 py-0.5">
            Desativada
          </span>
        )}
      </span>
      <button
        type="button"
        className="text-xs font-medium text-neutral-600 hover:underline disabled:opacity-40"
        disabled={ocupado}
        onClick={onAlternarAtiva}
      >
        {room.active ? "Desativar" : "Reativar"}
      </button>
      <button
        type="button"
        aria-label={`Renomear ${room.name}`}
        className={botao}
        disabled={ocupado}
        onClick={onEditar}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label={`Excluir ${room.name}`}
        className={cn(botao, "hover:text-red-600")}
        disabled={ocupado}
        onClick={onExcluir}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}
