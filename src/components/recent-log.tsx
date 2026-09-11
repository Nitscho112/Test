import { Bike, Dumbbell, Trash2 } from "lucide-react";

import { deleteHealthEntryAction, deleteWorkoutAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WORKOUT_TYPE_LABELS, type HealthEntry, type Workout } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const MAX_ROWS = 12;

/** Letzte Einträge zur Kontrolle — inklusive Korrekturmöglichkeit. */
export function RecentLog({
  entries,
  workouts,
}: {
  entries: HealthEntry[];
  workouts: Workout[];
}) {
  const recentEntries = entries.slice(-MAX_ROWS).reverse();
  const recentWorkouts = workouts.slice(-MAX_ROWS).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Letzte Einträge</CardTitle>
        <CardDescription>
          {entries.length} Messtage · {workouts.length} Trainingseinheiten erfasst.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vitals">
          <TabsList>
            <TabsTrigger value="vitals">Vitalwerte</TabsTrigger>
            <TabsTrigger value="workouts">Training</TabsTrigger>
          </TabsList>

          <TabsContent value="vitals" className="space-y-1">
            {recentEntries.length === 0 ? (
              <Empty hint="Noch keine Vitalwerte erfasst." />
            ) : (
              recentEntries.map((entry) => (
                <Row
                  key={entry.id}
                  date={entry.date}
                  source={entry.source}
                  note={entry.note}
                  action={
                    <DeleteButton
                      id={entry.id}
                      action={deleteHealthEntryAction}
                      label={`Eintrag vom ${formatDate(entry.date)} löschen`}
                    />
                  }
                >
                  {entry.weightKg ? <Value value={`${formatNumber(entry.weightKg, 1)} kg`} /> : null}
                  {entry.systolic && entry.diastolic ? (
                    <Value value={`${entry.systolic}/${entry.diastolic} mmHg`} />
                  ) : null}
                  {entry.restingHr ? <Value value={`${entry.restingHr} bpm`} /> : null}
                </Row>
              ))
            )}
          </TabsContent>

          <TabsContent value="workouts" className="space-y-1">
            {recentWorkouts.length === 0 ? (
              <Empty hint="Noch keine Trainingseinheiten erfasst." />
            ) : (
              recentWorkouts.map((workout) => (
                <Row
                  key={workout.id}
                  date={workout.date}
                  source={workout.source}
                  note={workout.note}
                  icon={workout.type === "kettlebell" ? Dumbbell : Bike}
                  action={
                    <DeleteButton
                      id={workout.id}
                      action={deleteWorkoutAction}
                      label={`Training vom ${formatDate(workout.date)} löschen`}
                    />
                  }
                >
                  <Value value={WORKOUT_TYPE_LABELS[workout.type]} muted />
                  <Value value={`${workout.durationMin} min`} />
                  {workout.avgWatts ? <Value value={`Ø ${workout.avgWatts} W`} /> : null}
                  {workout.ftpWatts ? (
                    <Badge variant="secondary">FTP {workout.ftpWatts} W</Badge>
                  ) : null}
                  {workout.kettlebellWeightKg ? (
                    <Value
                      value={`${formatNumber(workout.kettlebellWeightKg, 0)} kg${
                        workout.rounds ? ` × ${workout.rounds}` : ""
                      }`}
                    />
                  ) : null}
                </Row>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Row({
  date,
  source,
  note,
  icon: Icon,
  action,
  children,
}: {
  date: string;
  source: "manual" | "shortcut";
  note?: string;
  icon?: React.ElementType;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="hover:bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border-b px-2 py-2.5 last:border-b-0">
      <div className="flex w-28 shrink-0 items-center gap-2">
        {Icon ? <Icon className="text-muted-foreground size-3.5" /> : null}
        <span className="text-sm font-medium tabular">{formatDate(date)}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        {children}
        {note ? <span className="text-muted-foreground min-w-0 truncate text-xs">{note}</span> : null}
      </div>

      {source === "shortcut" ? (
        <Badge variant="outline" className="hidden sm:inline-flex">
          Shortcut
        </Badge>
      ) : null}
      {action}
    </div>
  );
}

function Value({ value, muted }: { value: string; muted?: boolean }) {
  return (
    <span className={muted ? "text-muted-foreground text-sm" : "text-sm tabular"}>{value}</span>
  );
}

function DeleteButton({
  id,
  action,
  label,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        className="text-muted-foreground hover:text-destructive size-7"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </form>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-sm">
      {hint}
    </p>
  );
}
