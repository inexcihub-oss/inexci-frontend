"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
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

// ─── Custom FontSize extension ────────────────────────────────────────────────

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: Record<string, any>) => {
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
        ({ chain }: any) => {
          return chain().setMark("textStyle", { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

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

// ─── Botão da barra de ferramentas ────────────────────────────────────────────

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
      className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
        isActive
          ? "bg-teal-100 text-teal-700"
          : "text-gray-600 hover:bg-gray-100"
      } ${extraClass}`}
    >
      {children}
    </button>
  );
}

// ─── Hook para posicionamento flutuante fixo ─────────────────────────────────

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
    // Recalcula ao fazer scroll em qualquer ancestral
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

// ─── Dropdown genérico ────────────────────────────────────────────────────────

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
                ? React.cloneElement(child as React.ReactElement<any>, {
                    onClick: (...args: any[]) => {
                      (child as any).props.onClick?.(...args);
                      setOpen(false);
                    },
                  })
                : child,
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── Color picker inline ──────────────────────────────────────────────────────

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

// ─── Componente principal ─────────────────────────────────────────────────────

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className = "",
  disabled = false,
  minHeight = "80px",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      FontSize,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: `outline-none py-2 px-3 text-sm text-gray-800`,
        style: `min-height: ${minHeight}`,
        "data-placeholder": placeholder ?? "Digite aqui...",
      },
    },
  });

  // Sincronizar conteúdo externo
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = current === "<p></p>" ? "" : current;
    if (value !== normalized) {
      editor.commands.setContent(value || "");
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

  // Força re-render ao mudar seleção para atualizar estado dos botões
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

  const currentFontLabel =
    FONT_FAMILIES.find((f) => f.value === getCurrentFontFamily())?.label ||
    "Fonte";
  const currentSize = getCurrentFontSize() || "14px";

  return (
    <div
      className={`border border-gray-200 rounded-xl overflow-hidden bg-white ${className}`}
    >
      {/* ─── Barra de ferramentas ──────────────────────────── */}
      {!disabled && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50 flex-wrap">
          {/* ── Fonte ── */}
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

          {/* ── Tamanho da fonte ── */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const idx = FONT_SIZES.indexOf(currentSize);
                if (idx > 0) {
                  (editor.commands as any).setFontSize(FONT_SIZES[idx - 1]);
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
                    (editor.commands as any).setFontSize(size);
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
                  (editor.commands as any).setFontSize(FONT_SIZES[idx + 1]);
                }
              }}
              title="Aumentar fonte"
              className="w-6 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* ── Formatação básica ── */}
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

          {/* ── Cor do texto ── */}
          <ColorPicker
            colors={TEXT_COLORS}
            currentColor={getCurrentColor()}
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
            title="Cor do texto"
            icon={<Palette className="w-3.5 h-3.5" />}
          />

          {/* ── Destaque ── */}
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

          {/* ── Alinhamento ── */}
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

          {/* ── Listas ── */}
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

          {/* ── Limpar formatação ── */}
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

      {/* ─── Área de edição ───────────────────────────────── */}
      <EditorContent editor={editor} />
    </div>
  );
}
