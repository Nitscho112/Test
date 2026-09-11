"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2, ClipboardPlus, Loader2, TriangleAlert } from "lucide-react";

import { saveHealthEntryAction, saveWorkoutAction } from "@/app/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WORKOUT_TYPE_LABELS, WORKOUT_TYPES, type WorkoutType } from "@/lib/types";

/** Logbuch: Vitalwerte und Trainingseinheiten erfassen. */
export function LogForm({ today }: { today: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardPlus className="text-muted-foreground size-4" />
          Logbuch
        </CardTitle>
        <CardDescription>
          Vitalwerte werden pro Tag zusammengeführt — ein zweiter Eintrag ergänzt den ersten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vitals">
          <TabsList>
            <TabsTrigger value="vitals">Vitalwerte</TabsTrigger>
            <TabsTrigger value="workout">Training</TabsTrigger>
          </TabsList>

          <TabsContent value="vitals">
            <VitalsForm today={today} />
          </TabsContent>
          <TabsContent value="workout">
            <WorkoutForm today={today} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function VitalsForm({ today }: { today: string }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(saveHealthEntryAction, initialActionState);

  // Nach dem Speichern nur die Messwerte leeren, das Datum bleibt stehen.
  React.useEffect(() => {
    if (state.status === "success") {
      const form = formRef.current;
      if (!form) return;
      for (const name of ["weightKg", "systolic", "diastolic", "restingHr", "note"]) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = "";
      }
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Datum" name="date">
          <Input type="date" name="date" defaultValue={today} required />
        </Field>
        <Field label="Gewicht (kg)" name="weightKg">
          <Input type="number" name="weightKg" step="0.1" min="30" max="400" placeholder="112,4" />
        </Field>
        <Field label="Ruhepuls (bpm)" name="restingHr">
          <Input type="number" name="restingHr" step="1" min="25" max="150" placeholder="58" />
        </Field>
        <Field label="Systolisch (mmHg)" name="systolic">
          <Input type="number" name="systolic" step="1" min="60" max="300" placeholder="128" />
        </Field>
        <Field label="Diastolisch (mmHg)" name="diastolic">
          <Input type="number" name="diastolic" step="1" min="30" max="200" placeholder="82" />
        </Field>
        <Field label="Notiz" name="note">
          <Input type="text" name="note" maxLength={500} placeholder="z. B. morgens, nüchtern" />
        </Field>
      </div>

      <FormFooter state={state} isPending={isPending} label="Vitalwerte speichern" />
    </form>
  );
}

function WorkoutForm({ today }: { today: string }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [type, setType] = React.useState<WorkoutType>("zwift_z2");
  const [state, formAction, isPending] = useActionState(saveWorkoutAction, initialActionState);
  const isRide = type.startsWith("zwift");

  React.useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Datum" name="date">
          <Input type="date" name="date" defaultValue={today} required />
        </Field>
        <Field label="Art" name="type">
          <Select
            name="type"
            value={type}
            onValueChange={(next) => setType(next as WorkoutType)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Trainingsart" />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {WORKOUT_TYPE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Dauer (min)" name="durationMin">
          <Input type="number" name="durationMin" step="1" min="1" max="600" placeholder="60" required />
        </Field>

        {isRide ? (
          <>
            <Field label="Ø Leistung (W)" name="avgWatts">
              <Input type="number" name="avgWatts" step="1" min="20" max="800" placeholder="185" />
            </Field>
            <Field label="Neue FTP (W)" name="ftpWatts" hint="nur bei Test/Schätzung">
              <Input type="number" name="ftpWatts" step="1" min="20" max="800" placeholder="240" />
            </Field>
          </>
        ) : (
          <>
            <Field label="Kettlebell (kg)" name="kettlebellWeightKg">
              <Input
                type="number"
                name="kettlebellWeightKg"
                step="0.5"
                min="1"
                max="100"
                placeholder="24"
              />
            </Field>
            <Field label="Runden" name="rounds">
              <Input type="number" name="rounds" step="1" min="1" max="100" placeholder="8" />
            </Field>
          </>
        )}

        <Field label="Ø Puls (bpm)" name="avgHr">
          <Input type="number" name="avgHr" step="1" min="40" max="230" placeholder="132" />
        </Field>
        <Field label="Max. Puls (bpm)" name="maxHr">
          <Input type="number" name="maxHr" step="1" min="40" max="230" placeholder="164" />
        </Field>
        <Field label="RPE (1–10)" name="rpe">
          <Input type="number" name="rpe" step="1" min="1" max="10" placeholder="6" />
        </Field>
        <Field label="Notiz" name="note" className="lg:col-span-3">
          <Input type="text" name="note" maxLength={500} placeholder="z. B. 4×8 min Sweetspot" />
        </Field>
      </div>

      <FormFooter state={state} isPending={isPending} label="Training speichern" />
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  className,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} className="mb-1.5">
        {label}
        {hint ? <span className="normal-case opacity-70">({hint})</span> : null}
      </Label>
      {children}
    </div>
  );
}

function FormFooter({
  state,
  isPending,
  label,
}: {
  state: ActionState;
  isPending: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : null}
        {label}
      </Button>

      {state.status === "success" ? (
        <span className="text-success flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="size-4" />
          {state.message}
        </span>
      ) : null}

      {state.status === "error" ? (
        <span className="text-destructive flex items-center gap-1.5 text-sm">
          <TriangleAlert className="size-4" />
          {state.message ?? "Speichern fehlgeschlagen."}
          {state.errors?.length ? ` (${state.errors.map((e) => e.field).join(", ")})` : ""}
        </span>
      ) : null}
    </div>
  );
}
