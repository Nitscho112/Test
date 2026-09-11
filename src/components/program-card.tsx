import { CalendarClock, Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { DashboardKpis } from "@/lib/metrics";
import type { Settings } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

/** Zeitlicher Rahmen der Vorbereitung plus Trainingsvolumen der letzten Woche. */
export function ProgramCard({
  kpis,
  settings,
}: {
  kpis: DashboardKpis;
  settings: Settings;
}) {
  const { program, weight, sessionsLast7d } = kpis;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="text-muted-foreground size-4" />
          Vorbereitung
        </CardTitle>
        <CardDescription>
          {formatDate(program.startDate)} – {formatDate(program.targetDate)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="tabular text-3xl leading-none font-semibold tracking-tight">
              {program.remainingWeeks}
            </span>
            <span className="text-muted-foreground text-sm">
              {program.remainingWeeks === 1 ? "Woche" : "Wochen"} bis zur Untersuchung
            </span>
          </div>
          <Progress value={program.progressPct} />
          <p className="text-muted-foreground text-xs tabular">
            Tag {program.elapsedDays} von {program.totalDays} · noch {program.remainingDays} Tage
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Gewichtsverlauf
          </span>
          <div className="flex items-center gap-2 text-sm tabular">
            <span className="text-muted-foreground">
              {formatNumber(settings.startWeightKg, 1)} kg
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-semibold">
              {weight ? `${formatNumber(weight.value, 1)} kg` : "—"}
            </span>
            {settings.targetWeightKg ? (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="text-muted-foreground">
                  {formatNumber(settings.targetWeightKg, 1)} kg
                </span>
              </>
            ) : null}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Flame className="size-4" />
            Einheiten letzte 7 Tage
          </span>
          <Badge variant={sessionsLast7d >= 4 ? "success" : "secondary"}>
            {sessionsLast7d} / {kpis.totalSessions} gesamt
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
