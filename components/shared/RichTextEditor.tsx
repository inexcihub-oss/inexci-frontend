"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import {
  getHTMLFromFragment,
  type CommandProps,
  type Editor,
} from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  BookmarkPlus,
  Italic,
  Loader2,
  Mic,
  Square,
  X,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  RemoveFormatting,
  ChevronDown,
  Type,
  Palette,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ditadoSuportado,
  useDitado,
  type EstadoDitado,
} from "@/hooks/useDitado";

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: { fontSize?: string | null }) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize:
        (size: string) =>
        ({ chain }: CommandProps) => {
          return chain().setMark("textStyle", { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: CommandProps) => {
          return chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

interface MenuItemProps {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
  variant?: "full" | "clinical";
  toolbarSlot?: HTMLElement | null;
  ariaLabel?: string;
  autoFocus?: boolean;
  snippets?: SnippetOption[];
  onSnippetUsed?: (id: string) => void;
  onSaveSelection?: (html: string) => void;
  transcrever?: (audio: Blob) => Promise<string>;
}

interface ControleDitado {
  estado: EstadoDitado;
  iniciar: () => void;
  parar: () => void;
}

function formatarDuracao(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  return `${minutos}:${String(segundos % 60).padStart(2, "0")}`;
}

export interface SnippetOption {
  id: string;
  shortcut: string;
  title: string;
  content: string;
}

interface SlashState {
  from: number;
  query: string;
  left: number;
  top: number;
}

const MAX_SNIPPETS_NO_MENU = 8;

export function filtrarSnippets(
  snippets: SnippetOption[],
  query: string,
): SnippetOption[] {
  const q = query.toLowerCase();
  if (!q) return snippets.slice(0, MAX_SNIPPETS_NO_MENU);
  const comeca = snippets.filter((s) => s.shortcut.startsWith(q));
  const contem = snippets.filter(
    (s) =>
      !s.shortcut.startsWith(q) &&
      (s.shortcut.includes(q) || s.title.toLowerCase().includes(q)),
  );
  return [...comeca, ...contem].slice(0, MAX_SNIPPETS_NO_MENU);
}

export function conteudoDoSnippet(html: string): string {
  const unico = html.trim().match(/^<p>([\s\S]*)<\/p>$/);
  return unico && !/<\/?p[\s>]/.test(unico[1]) ? unico[1] : html;
}

function detectarSlash(editor: Editor): SlashState | null {
  const { $from, empty } = editor.state.selection;
  if (!empty || !$from.parent.isTextblock) return null;
  const antes = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 41),
    $from.parentOffset,
    undefined,
    "\ufffc",
  );
  const encontrado = antes.match(/(?:^|\s)\/([a-z0-9-]*)$/i);
  if (!encontrado) return null;
  const from = $from.pos - encontrado[1].length - 1;
  let left = 0;
  let top = 0;
  try {
    const coords = editor.view.coordsAtPos(from);
    left = coords.left;
    top = coords.bottom;
  } catch {
    left = 0;
    top = 0;
  }
  return { from, query: encontrado[1].toLowerCase(), left, top };
}

const FONT_FAMILIES = [
  { label: "Padrão", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Courier New", value: "Courier New, monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "Trebuchet MS, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
];

const FONT_SIZES = [
  "8px",
  "10px",
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "28px",
  "32px",
  "36px",
  "48px",
];

const TEXT_COLORS = [
  "#000000",
  "#374151",
  "#6B7280",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0D9488",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#FFFFFF",
];

const HIGHLIGHT_COLORS = [
  { label: "Nenhum", value: "" },
  { label: "Amarelo", value: "#FEF08A" },
  { label: "Verde", value: "#BBF7D0" },
  { label: "Azul", value: "#BFDBFE" },
  { label: "Rosa", value: "#FBCFE8" },
  { label: "Laranja", value: "#FED7AA" },
  { label: "Roxo", value: "#E9D5FF" },
];

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
  className: extraClass = "",
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      aria-pressed={isActive}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded text-sm transition-colors",
        isActive
          ? "bg-teal-100 text-teal-700"
          : "text-gray-600 hover:bg-gray-100",
        extraClass,
      )}
    >
      {children}
    </button>
  );
}

function useFloatingPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  open: boolean,
) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function update() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    update();
    const parents: (HTMLElement | Window)[] = [window];
    let el: HTMLElement | null = triggerRef.current;
    while (el) {
      if (
        el.scrollHeight > el.clientHeight ||
        el.scrollWidth > el.clientWidth
      ) {
        parents.push(el);
      }
      el = el.parentElement;
    }
    parents.forEach((p) =>
      p.addEventListener("scroll", update, { passive: true }),
    );
    window.addEventListener("resize", update, { passive: true });
    return () => {
      parents.forEach((p) => p.removeEventListener("scroll", update));
      window.removeEventListener("resize", update);
    };
  }, [open, triggerRef]);

  return pos;
}

function ToolbarDropdown({
  label,
  title,
  children,
  icon,
}: {
  label?: string;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useFloatingPosition(triggerRef, open);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((p) => !p);
        }}
        title={title}
        className="h-7 flex items-center gap-0.5 px-1.5 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors"
      >
        {icon}
        {label && <span className="max-w-[80px] truncate">{label}</span>}
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px] py-1 max-h-60 overflow-y-auto"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
          >
            {React.Children.map(children, (child) =>
              React.isValidElement(child)
                ? React.cloneElement(
                    child as React.ReactElement<MenuItemProps>,
                    {
                      onClick: (event: React.MouseEvent<HTMLElement>) => {
                        (child.props as MenuItemProps).onClick?.(event);
                        setOpen(false);
                      },
                    },
                  )
                : child,
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function ColorPicker({
  colors,
  currentColor,
  onSelect,
  title,
  icon,
}: {
  colors: string[];
  currentColor: string | undefined;
  onSelect: (color: string) => void;
  title: string;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useFloatingPosition(triggerRef, open);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((p) => !p);
        }}
        title={title}
        className="w-7 h-7 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <div className="flex flex-col items-center">
          {icon}
          <div
            className="w-4 h-1 rounded-sm mt-0.5"
            style={{ backgroundColor: currentColor || "#000000" }}
          />
        </div>
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-2"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
            }}
          >
            <div className="grid grid-cols-6 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(color);
                    setOpen(false);
                  }}
                  className={`w-6 h-6 rounded border transition-transform hover:scale-110 ${
                    currentColor === color
                      ? "border-teal-500 ring-1 ring-teal-300"
                      : "border-gray-200"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function ClinicalToolbar({
  editor,
  onSaveSelection,
  ditado,
}: {
  editor: Editor;
  onSaveSelection?: (html: string) => void;
  ditado?: ControleDitado;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Formatação"
      className="flex items-center gap-0.5 rounded-xl border border-neutral-200 bg-white p-0.5 shadow-sm"
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Negrito"
        className="w-8 h-8 rounded-lg"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Itálico"
        className="w-8 h-8 rounded-lg"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Sublinhado"
        className="w-8 h-8 rounded-lg"
      >
        <UnderlineIcon className="w-4 h-4" />
      </ToolbarButton>
      <div className="w-px h-4 bg-neutral-200 mx-0.5" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Lista"
        className="w-8 h-8 rounded-lg"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Lista numerada"
        className="w-8 h-8 rounded-lg"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title="Realçar"
        className="w-8 h-8 rounded-lg"
      >
        <Highlighter className="w-4 h-4" />
      </ToolbarButton>
      <div className="w-px h-4 bg-neutral-200 mx-0.5" />
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
        title="Remover formatação"
        className="w-8 h-8 rounded-lg"
      >
        <RemoveFormatting className="w-4 h-4" />
      </ToolbarButton>
      {onSaveSelection && (
        <>
          <div className="w-px h-4 bg-neutral-200 mx-0.5" />
          <ToolbarButton
            onClick={() => {
              if (editor.state.selection.empty) return;
              onSaveSelection(
                getHTMLFromFragment(
                  editor.state.selection.content().content,
                  editor.schema,
                ),
              );
            }}
            title={
              editor.state.selection.empty
                ? "Selecione um trecho para salvar como texto rápido"
                : "Salvar seleção como texto rápido"
            }
            className={cn(
              "w-8 h-8 rounded-lg",
              editor.state.selection.empty && "opacity-40",
            )}
          >
            <BookmarkPlus className="w-4 h-4" />
          </ToolbarButton>
        </>
      )}
      {ditado && (
        <>
          <div className="w-px h-4 bg-neutral-200 mx-0.5" />
          {ditado.estado === "transcrevendo" ? (
            <span
              className="w-8 h-8 flex items-center justify-center text-teal-700"
              title="Transcrevendo"
            >
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            </span>
          ) : ditado.estado === "gravando" ? (
            <ToolbarButton
              onClick={ditado.parar}
              title="Parar ditado"
              className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </ToolbarButton>
          ) : (
            <ToolbarButton
              onClick={ditado.iniciar}
              title="Ditar por voz"
              className="w-8 h-8 rounded-lg"
            >
              <Mic className="w-4 h-4" />
            </ToolbarButton>
          )}
        </>
      )}
    </div>
  );
}

function FaixaDitado({
  estado,
  segundos,
  erro,
  onParar,
  onCancelar,
  onFecharErro,
}: {
  estado: EstadoDitado;
  segundos: number;
  erro: string | null;
  onParar: () => void;
  onCancelar: () => void;
  onFecharErro: () => void;
}) {
  if (estado === "gravando") {
    return (
      <div
        role="status"
        className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-600"
          aria-hidden="true"
        />
        <span className="font-medium tabular-nums">
          Gravando {formatarDuracao(segundos)}
        </span>
        <span className="flex-1 min-w-[10rem] text-xs text-red-700">
          O texto entra onde está o cursor. O áudio não é guardado.
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCancelar}
            className="min-h-[36px] rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onParar}
            className="min-h-[36px] rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            Parar e transcrever
          </button>
        </span>
      </div>
    );
  }
  if (estado === "transcrevendo") {
    return (
      <div
        role="status"
        className="mt-2 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-800"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Transcrevendo o ditado…
      </div>
    );
  }
  if (erro) {
    return (
      <div
        role="alert"
        className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      >
        <span className="flex-1">{erro}</span>
        <button
          type="button"
          onClick={onFecharErro}
          aria-label="Fechar aviso do ditado"
          className="-m-1 rounded p-1 text-amber-700 hover:bg-amber-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }
  return null;
}

function SlashMenu({
  slash,
  itens,
  ativo,
  semNenhum,
  onEscolher,
  onAtivar,
}: {
  slash: SlashState;
  itens: SnippetOption[];
  ativo: number;
  semNenhum: boolean;
  onEscolher: (item: SnippetOption) => void;
  onAtivar: (indice: number) => void;
}) {
  const largura = 320;
  const left =
    typeof window === "undefined"
      ? slash.left
      : Math.max(8, Math.min(slash.left, window.innerWidth - largura - 8));
  return createPortal(
    <div
      className="fixed z-[9999] rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl"
      style={{ left, top: slash.top + 6, width: largura }}
    >
      <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Textos rápidos
      </p>
      {itens.length > 0 ? (
        <ul role="listbox" aria-label="Textos rápidos" className="flex flex-col">
          {itens.map((item, indice) => (
            <li
              key={item.id}
              role="option"
              aria-selected={indice === ativo}
              onMouseDown={(e) => {
                e.preventDefault();
                onEscolher(item);
              }}
              onMouseEnter={() => onAtivar(indice)}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2",
                indice === ativo ? "bg-teal-50" : "hover:bg-neutral-50",
              )}
            >
              <span className="text-sm font-medium text-neutral-900">
                /{item.shortcut}
                <span className="font-normal text-neutral-600">
                  {" "}
                  · {item.title}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2.5 py-2 text-sm text-neutral-600">
          {semNenhum
            ? "Você ainda não tem textos rápidos. Selecione um trecho e use o botão de salvar na barra, ou crie em Configurações › Textos rápidos."
            : `Nenhum texto rápido para "/${slash.query}".`}
        </p>
      )}
      {itens.length > 0 && (
        <p className="border-t border-neutral-100 px-2.5 pt-1.5 pb-0.5 text-[11px] text-neutral-500">
          Enter insere · Esc fecha
        </p>
      )}
    </div>,
    document.body,
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className = "",
  disabled = false,
  minHeight = "80px",
  variant = "full",
  toolbarSlot,
  ariaLabel,
  autoFocus = false,
  snippets,
  onSnippetUsed,
  onSaveSelection,
  transcrever,
}: RichTextEditorProps) {
  const clinical = variant === "clinical";
  const [microfoneDisponivel] = useState(() => ditadoSuportado());
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [ativo, setAtivo] = useState(0);
  const dispensadoEm = useRef<number | null>(null);
  const sincronizando = useRef(false);
  const teclaRef = useRef<(event: KeyboardEvent) => boolean>(() => false);

  const extensions = useMemo(() => {
    const starter = StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
    });
    if (!clinical) {
      return [
        starter,
        FontSize,
        Color,
        FontFamily,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
      ];
    }
    return [starter, Highlight];
  }, [clinical]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: clinical
          ? "rte-content rte-clinical outline-none py-1 text-[15px] leading-relaxed text-neutral-800"
          : "rte-content outline-none py-2 px-3 text-sm text-gray-800",
        style: `min-height: ${minHeight}`,
        "data-placeholder": placeholder ?? "Digite aqui...",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        role: "textbox",
        "aria-multiline": "true",
      },
      handleKeyDown: (_view, event) => teclaRef.current(event),
    },
  });

  const usaSnippets = clinical && snippets !== undefined && !disabled;
  const usaDitado =
    clinical && !!transcrever && !disabled && microfoneDisponivel;
  const ditado = useDitado(usaDitado ? transcrever : undefined, (texto) => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const anterior =
      from > 1 ? editor.state.doc.textBetween(from - 1, from, undefined, " ") : "";
    const prefixo = anterior && !/\s/.test(anterior) ? " " : "";
    editor
      .chain()
      .focus()
      .insertContent({ type: "text", text: `${prefixo}${texto}` })
      .run();
  });
  const itens = useMemo(
    () => (slash ? filtrarSnippets(snippets ?? [], slash.query) : []),
    [slash, snippets],
  );

  useEffect(() => {
    if (!editor || !usaSnippets) return;
    const atualizar = () => {
      const novo = sincronizando.current ? null : detectarSlash(editor);
      if (!novo) dispensadoEm.current = null;
      if (novo && dispensadoEm.current === novo.from) {
        setSlash(null);
        return;
      }
      setSlash((atual) => {
        if (atual?.query !== novo?.query) setAtivo(0);
        return novo;
      });
    };
    const fechar = () => setSlash(null);
    editor.on("update", atualizar);
    editor.on("selectionUpdate", atualizar);
    editor.on("blur", fechar);
    return () => {
      editor.off("update", atualizar);
      editor.off("selectionUpdate", atualizar);
      editor.off("blur", fechar);
    };
  }, [editor, usaSnippets]);

  const escolher = (item: SnippetOption) => {
    if (!editor || !slash) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: slash.from, to: editor.state.selection.from })
      .insertContent(conteudoDoSnippet(item.content))
      .run();
    setSlash(null);
    onSnippetUsed?.(item.id);
  };

  teclaRef.current = (event: KeyboardEvent) => {
    if (!slash) return false;
    if (event.key === "Escape") {
      event.stopPropagation();
      dispensadoEm.current = slash.from;
      setSlash(null);
      return true;
    }
    if (itens.length === 0) return false;
    if (event.key === "ArrowDown") {
      setAtivo((i) => (i + 1) % itens.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      setAtivo((i) => (i - 1 + itens.length) % itens.length);
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      escolher(itens[Math.min(ativo, itens.length - 1)]);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = current === "<p></p>" ? "" : current;
    if (value !== normalized) {
      sincronizando.current = true;
      editor.commands.setContent(value || "");
      sincronizando.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  const getCurrentFontFamily = useCallback(() => {
    if (!editor) return "";
    const attrs = editor.getAttributes("textStyle");
    return attrs?.fontFamily || "";
  }, [editor]);

  const getCurrentFontSize = useCallback(() => {
    if (!editor) return "";
    const attrs = editor.getAttributes("textStyle");
    return attrs?.fontSize || "";
  }, [editor]);

  const getCurrentColor = useCallback(() => {
    if (!editor) return undefined;
    const attrs = editor.getAttributes("textStyle");
    return attrs?.color || undefined;
  }, [editor]);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const handler = () => forceUpdate((n) => n + 1);
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor]);

  if (!editor) return null;

  if (clinical) {
    const toolbar = disabled ? null : (
      <ClinicalToolbar
        editor={editor}
        onSaveSelection={onSaveSelection}
        ditado={
          usaDitado
            ? {
                estado: ditado.estado,
                iniciar: () => void ditado.iniciar(),
                parar: ditado.parar,
              }
            : undefined
        }
      />
    );
    return (
      <div className={className}>
        {toolbar && (toolbarSlot ? createPortal(toolbar, toolbarSlot) : toolbar)}
        <EditorContent editor={editor} />
        {usaDitado && (
          <FaixaDitado
            estado={ditado.estado}
            segundos={ditado.segundos}
            erro={ditado.erro}
            onParar={ditado.parar}
            onCancelar={ditado.cancelar}
            onFecharErro={ditado.limparErro}
          />
        )}
        {usaSnippets && slash && (
          <SlashMenu
            slash={slash}
            itens={itens}
            ativo={Math.min(ativo, Math.max(0, itens.length - 1))}
            semNenhum={(snippets ?? []).length === 0}
            onEscolher={escolher}
            onAtivar={setAtivo}
          />
        )}
      </div>
    );
  }

  const currentFontLabel =
    FONT_FAMILIES.find((f) => f.value === getCurrentFontFamily())?.label ||
    "Fonte";
  const currentSize = getCurrentFontSize() || "14px";

  return (
    <div
      className={`border border-gray-200 rounded-xl overflow-hidden bg-white ${className}`}
    >
      {!disabled && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50 flex-wrap">
          <ToolbarDropdown
            label={currentFontLabel}
            title="Fonte"
            icon={<Type className="w-3.5 h-3.5 mr-0.5" />}
          >
            {FONT_FAMILIES.map((font) => (
              <button
                key={font.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (font.value) {
                    editor.chain().focus().setFontFamily(font.value).run();
                  } else {
                    editor.chain().focus().unsetFontFamily().run();
                  }
                }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                  getCurrentFontFamily() === font.value
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-700"
                }`}
                style={{ fontFamily: font.value || "inherit" }}
              >
                {font.label}
              </button>
            ))}
          </ToolbarDropdown>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const idx = FONT_SIZES.indexOf(currentSize);
                if (idx > 0) {
                  editor.commands.setFontSize(FONT_SIZES[idx - 1]);
                }
              }}
              title="Diminuir fonte"
              className="w-6 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            >
              <Minus className="w-3 h-3" />
            </button>
            <ToolbarDropdown label={currentSize} title="Tamanho da fonte">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.commands.setFontSize(size);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                    currentSize === size
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-700"
                  }`}
                >
                  {size}
                </button>
              ))}
            </ToolbarDropdown>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const idx = FONT_SIZES.indexOf(currentSize);
                if (idx < FONT_SIZES.length - 1) {
                  editor.commands.setFontSize(FONT_SIZES[idx + 1]);
                }
              }}
              title="Aumentar fonte"
              className="w-6 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Negrito"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Itálico"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Sublinhado"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          <ColorPicker
            colors={TEXT_COLORS}
            currentColor={getCurrentColor()}
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
            title="Cor do texto"
            icon={<Palette className="w-3.5 h-3.5" />}
          />

          <ToolbarDropdown
            title="Destaque"
            icon={<Highlighter className="w-3.5 h-3.5" />}
            label=""
          >
            {HIGHLIGHT_COLORS.map((hl) => (
              <button
                key={hl.value || "none"}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (hl.value) {
                    editor
                      .chain()
                      .focus()
                      .setHighlight({ color: hl.value })
                      .run();
                  } else {
                    editor.chain().focus().unsetHighlight().run();
                  }
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                {hl.value ? (
                  <span
                    className="w-4 h-4 rounded border border-gray-200"
                    style={{ backgroundColor: hl.value }}
                  />
                ) : (
                  <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center text-[10px] text-gray-400">
                    ✕
                  </span>
                )}
                <span className="text-gray-700">{hl.label}</span>
              </button>
            ))}
          </ToolbarDropdown>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            title="Alinhar à esquerda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="Centralizar"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="Alinhar à direita"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            isActive={editor.isActive({ textAlign: "justify" })}
            title="Justificar"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Lista"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Lista numerada"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
            title="Remover formatação"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
