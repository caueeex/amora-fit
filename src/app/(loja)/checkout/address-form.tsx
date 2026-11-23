"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { UFS } from "@/lib/validators/address";
import { saveAddressAction, type SavedAddress } from "./actions";

type Props = {
  defaultRecipient: string;
  defaultPhone: string;
  onSaved: (a: SavedAddress) => void;
  onCancel?: () => void;
};

export function AddressForm({ defaultRecipient, defaultPhone, onSaved, onCancel }: Props) {
  const [values, setValues] = useState({
    label: "Casa",
    recipientName: defaultRecipient,
    phone: defaultPhone,
    cep: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  // Preenche rua/bairro/cidade/UF a partir do CEP (ViaCEP, serviço público). Só envia o CEP.
  async function lookupCep() {
    const cep = values.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLookingUp(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (d.erro) {
        setErrors((e) => ({ ...e, cep: "CEP não encontrado. Preencha o endereço manualmente." }));
        return;
      }
      setErrors((e) => ({ ...e, cep: undefined }));
      setValues((v) => ({
        ...v,
        street: d.logradouro || v.street,
        district: d.bairro || v.district,
        city: d.localidade || v.city,
        state: d.uf || v.state,
      }));
    } catch {
      // sem internet / serviço fora: segue manual
    } finally {
      setLookingUp(false);
    }
  }

  async function submit() {
    setSaving(true);
    setMessage(null);
    const r = await saveAddressAction({ ...values, isDefault: false });
    setSaving(false);
    if ("error" in r) {
      setErrors(r.fieldErrors ?? {});
      setMessage(r.error);
      return;
    }
    onSaved(r.address);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-creme-300/15 bg-amora-950/30 p-4">
      {message && <Notice tone="error">{message}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CEP" name="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={values.cep} onChange={set("cep")} onBlur={lookupCep} error={errors.cep} hint={lookingUp ? "Buscando endereço…" : undefined} />
        <Field label="Identificação" name="label" placeholder="Casa, Trabalho…" value={values.label} onChange={set("label")} error={errors.label} />
      </div>
      <Field label="Rua" name="street" autoComplete="address-line1" value={values.street} onChange={set("street")} error={errors.street} />
      <div className="grid grid-cols-[1fr_2fr] gap-4">
        <Field label="Número" name="number" value={values.number} onChange={set("number")} error={errors.number} />
        <Field label="Complemento" name="complement" autoComplete="address-line2" placeholder="Apto, bloco…" value={values.complement} onChange={set("complement")} error={errors.complement} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
        <Field label="Bairro" name="district" value={values.district} onChange={set("district")} error={errors.district} />
        <Field label="Cidade" name="city" autoComplete="address-level2" value={values.city} onChange={set("city")} error={errors.city} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uf" className="text-sm font-medium text-creme-100">
            UF
          </label>
          <select
            id="uf"
            value={values.state}
            onChange={set("state")}
            aria-invalid={errors.state ? true : undefined}
            className={`min-h-12 rounded-xl border bg-amora-950/40 px-3 text-base text-creme-50 focus:border-creme-300 focus:outline-none ${errors.state ? "border-amora-300" : "border-creme-300/20"}`}
          >
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {errors.state && <p className="text-xs font-medium text-amora-300">{errors.state}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quem recebe" name="recipientName" autoComplete="name" value={values.recipientName} onChange={set("recipientName")} error={errors.recipientName} />
        <Field label="Telefone de quem recebe (opcional)" name="phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} error={errors.phone} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={submit} loading={saving}>
          Salvar endereço
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
