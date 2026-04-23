import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChildName } from "@/hooks/use-child-name";
import { useAddressStyle } from "@/hooks/use-address-style";

/**
 * Bloco "Perfil da criança" do /perfil.
 *
 * Extraído de `perfil.tsx` para permitir testes de UI focados em:
 *   - salvar (sucesso e erro de rede)
 *   - limpar (com confirmação visual)
 *   - estados de loading / disabled
 *   - sanitização do input (espaços iniciais, limite de 25 chars)
 *
 * Toda a copy é injetada via prop `copy` para refletir 1:1 a estrutura
 * do `PROFILE_COPY` em `perfil.tsx` (sem duplicar dicionários).
 */
export type ChildProfileBlockCopy = {
  childProfile: string;
  childNameLabel: string;
  childNamePlaceholder: string;
  childNameHint: string;
  childNameSaved: string;
  childNameRemoved: string;
  childNameError: string;
  childNameSave: string;
  childNameClear: string;
  saving: string;
  addressStyleLabel: string;
  addressStyleHint: string;
  addressStyleName: string;
  addressStyleYou: string;
  addressStyleNamePreview: string;
  addressStyleYouPreview: string;
};

export function ChildProfileBlock({ copy }: { copy: ChildProfileBlockCopy }) {
  const { childName, setChildName } = useChildName();
  const { addressStyle, setAddressStyle } = useAddressStyle();
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Sincroniza o input com o valor canônico (DB / outra aba).
  useEffect(() => {
    setDraft(childName);
  }, [childName]);

  return (
    <section
      data-testid="child-profile-block"
      className="mt-6 rounded-2xl bg-surface/80 p-5 ring-1 ring-inset ring-white/[0.07] shadow-card backdrop-blur sm:p-6"
    >
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:text-[11px]">
        <Heart className="h-3.5 w-3.5" /> {copy.childProfile}
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          const result = await setChildName(draft);
          setSaving(false);
          if (!result.ok) {
            toast.error(copy.childNameError);
            return;
          }
          toast.success(result.value ? copy.childNameSaved : copy.childNameRemoved);
        }}
      >
        <label className="sr-only" htmlFor="child-name-input">
          {copy.childNameLabel}
        </label>
        <Input
          id="child-name-input"
          value={draft}
          onChange={(event) => {
            // Bloqueia espaços iniciais e respeita o limite de 25 chars
            // antes mesmo do save (PRD).
            const next = event.target.value.replace(/^\s+/, "").slice(0, 25);
            setDraft(next);
          }}
          maxLength={25}
          placeholder={copy.childNamePlaceholder}
          aria-label={copy.childNameLabel}
          aria-describedby="child-name-hint"
          className="h-11 rounded-xl bg-background/45"
        />
        <Button
          type="button"
          variant="ghost"
          disabled={saving || (!draft && !childName)}
          onClick={async () => {
            setDraft("");
            setSaving(true);
            const result = await setChildName("");
            setSaving(false);
            if (!result.ok) toast.error(copy.childNameError);
            else toast.success(copy.childNameRemoved);
          }}
          className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:text-foreground"
        >
          {copy.childNameClear}
        </Button>
        <Button type="submit" disabled={saving} className="h-11 rounded-xl px-5 font-bold">
          {saving ? copy.saving : copy.childNameSave}
        </Button>
      </form>
      <p id="child-name-hint" className="mt-2 text-xs font-medium text-muted-foreground">
        {copy.childNameHint}
      </p>

      {/* Estilo de tratamento — escolha do pai/responsável.
          Persistido por dispositivo via `useAddressStyle` (localStorage).
          As frases já são gramaticalmente corretas em PT/EN/ES nas duas
          variantes — o helper `pick` em personalize.ts seleciona a
          variante "named" ou "generic" conforme este valor. */}
      <fieldset className="mt-5 rounded-xl bg-background/35 p-4 ring-1 ring-inset ring-white/[0.05]">
        <legend className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px]">
          {copy.addressStyleLabel}
        </legend>
        <div
          role="radiogroup"
          aria-label={copy.addressStyleLabel}
          className="mt-2 grid gap-2 sm:grid-cols-2"
        >
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition ${
              addressStyle === "name"
                ? "border-primary bg-primary/10"
                : "border-white/[0.08] hover:border-white/[0.16]"
            }`}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="address-style"
                value="name"
                checked={addressStyle === "name"}
                onChange={() => setAddressStyle("name")}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-display text-sm font-extrabold text-foreground">
                {copy.addressStyleName}
              </span>
            </span>
            <span className="text-xs italic text-muted-foreground">
              {copy.addressStyleNamePreview}
            </span>
          </label>
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition ${
              addressStyle === "you"
                ? "border-primary bg-primary/10"
                : "border-white/[0.08] hover:border-white/[0.16]"
            }`}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="address-style"
                value="you"
                checked={addressStyle === "you"}
                onChange={() => setAddressStyle("you")}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-display text-sm font-extrabold text-foreground">
                {copy.addressStyleYou}
              </span>
            </span>
            <span className="text-xs italic text-muted-foreground">
              {copy.addressStyleYouPreview}
            </span>
          </label>
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground">{copy.addressStyleHint}</p>
      </fieldset>
    </section>
  );
}
