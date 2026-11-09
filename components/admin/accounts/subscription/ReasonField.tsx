import Textarea from "@/components/ui/Textarea";
import { REASON_MAX } from "./reason";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function ReasonField({ id, value, onChange, error }: Props) {
  return (
    <Textarea
      id={id}
      label="Motivo"
      required
      rows={3}
      maxLength={REASON_MAX}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error ?? undefined}
      placeholder="Registre por que esta ação está sendo feita"
    />
  );
}
