import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Scissors, Plus, Phone, Trash2, Pencil, Calendar as CalendarIcon, CalendarPlus } from "lucide-react";
import {
  Appointment,
  buildWhatsAppUrl,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  downloadICS,
  formatDateBR,
  formatPrice,
  loadAppointments,
  todayISO,
} from "@/lib/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Home,
});

const SERVICES = [
  "Corte",
  "Escova",
  "Coloração",
  "Hidratação",
  "Progressiva",
  "Mechas / Luzes",
];

const SERVICE_DURATIONS: Record<string, number> = {
  Corte: 60,
  Escova: 60,
  Coloração: 120,
  Hidratação: 60,
  Progressiva: 180,
  "Mechas / Luzes": 180,
};

function parseServices(service: string) {
  return service
    .split(" + ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAppointmentDurationMinutes(
  appointment: Pick<Appointment, "service">,
) {
  const selectedServices = parseServices(appointment.service);

  if (selectedServices.length === 0) return 60;

  return selectedServices.reduce(
    (total, selectedService) =>
      total + (SERVICE_DURATIONS[selectedService] ?? 60),
    0,
  );
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getAppointmentEndMinutes(appointment: Pick<Appointment, "time" | "service">) {
  return timeToMinutes(appointment.time) + getAppointmentDurationMinutes(appointment);
}

function appointmentsOverlap(
  first: Pick<Appointment, "date" | "time" | "service">,
  second: Pick<Appointment, "date" | "time" | "service">,
) {
  if (first.date !== second.date) return false;

  const firstStart = timeToMinutes(first.time);
  const firstEnd = getAppointmentEndMinutes(first);
  const secondStart = timeToMinutes(second.time);
  const secondEnd = getAppointmentEndMinutes(second);

  return firstStart < secondEnd && firstEnd > secondStart;
}

function Home() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [dialogResetKey, setDialogResetKey] = useState(0);

  useEffect(() => {
  let cancelled = false;

  async function load() {
    try {
      const appointments = await loadAppointments();

      if (!cancelled) {
        setItems(appointments);
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar os agendamentos");
    }
  }

  void load();

  return () => {
    cancelled = true;
  };
}, []);

  const dayItems = useMemo(
    () =>
      items
        .filter((a) => a.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [items, selectedDate],
  );

  const upcoming = useMemo(
    () =>
      [...items]
        .filter((a) => a.date >= todayISO())
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 20),
    [items],
  );

  const totalDia = dayItems.reduce((s, a) => s + (Number(a.price) || 0), 0);

  const remove = async (id: string) => {
    const toastId = "appointment-removed";

    try {
      toast.dismiss(toastId);
      await deleteAppointment(id);

      setItems((current) =>
        current.filter((appointment) => appointment.id !== id),
      );

      toast.success("Agendamento removido", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível remover o agendamento");
    }
  };

  const notify = (a: Appointment) => {
    const firstName = a.name.split(" ")[0];
    const msg = `Oi ${firstName}, passando para confirmar seu agendamento no dia ${formatDateBR(a.date)} às ${a.time} para ${a.service}. Posso te esperar? 💇‍♀️✨`;
    window.open(buildWhatsAppUrl(a.phone, msg), "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />

      {/* HERO */}
      <header
        className="relative overflow-hidden text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{
               backgroundImage:
                 "radial-gradient(circle at 20% 20%, oklch(0.78 0.11 65) 0, transparent 40%), radial-gradient(circle at 80% 60%, oklch(0.88 0.06 40) 0, transparent 45%)",
             }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-10 sm:py-14">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
              style={{ background: "var(--gradient-gold)" }}
            >
              <Scissors className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-accent">Salão</p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight">
                Gadelha <span className="italic" style={{ color: "var(--gold)" }}>Hair</span>
              </h1>
            </div>
          </div>

          <p className="mt-6 max-w-lg text-sm sm:text-base text-primary-foreground/80">
            Sua agenda pessoal para organizar clientes, serviços e horários com elegância.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            <StatCard label="Hoje" value={dayItems.length.toString()} />
            <StatCard label="Próximos" value={upcoming.length.toString()} />
            <StatCard label="Total do dia" value={formatPrice(totalDia)} small />
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            {selectedDate && (
              <span className="text-sm text-muted-foreground">
                {formatDateBR(selectedDate)}
              </span>
            )}
            {selectedDate === todayISO() ? (
              <span className="text-sm text-muted-foreground">Hoje</span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(todayISO())}
              >
                Hoje
              </Button>
            )}
          </div>

          <Dialog
            open={open}
            onOpenChange={(isOpen: boolean) => {
              setOpen(isOpen);
              if (!isOpen) setEditingAppointment(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="shadow-md"
                onClick={() => {
                  setEditingAppointment(null);
                  setDialogResetKey((current) => current + 1);
                  setOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Novo agendamento
              </Button>
            </DialogTrigger>
            <AppointmentDialog
              key={dialogResetKey}
              defaultDate={selectedDate}
              appointment={editingAppointment}
              appointments={items}
              onSave={async (a, allowOverlap) => {
                const conflito = items.find(
                  (item) =>
                    item.id !== a.id &&
                    appointmentsOverlap(item, a),
                );

                if (conflito && !allowOverlap) {
                  toast.error("Este horário entra em conflito", {
                    description:
                      `${conflito.name}: ${conflito.time} — ` +
                      `${formatDateBR(conflito.date)}`,
                  });

                  throw new Error("Horário ocupado");
                }

                try {
                  if (editingAppointment) {
                    const updatedAppointment = await updateAppointment(a);

                    setItems((current) =>
                      current.map((item) =>
                        item.id === updatedAppointment.id ? updatedAppointment : item,
                      ),
                    );

                    setOpen(false);
                    setEditingAppointment(null);

                    toast.success("Agendamento atualizado", {
                      description:
                        `${updatedAppointment.name} — ` +
                        `${formatDateBR(updatedAppointment.date)} ` +
                        `às ${updatedAppointment.time}`,
                    });

                    return;
                  }

                  const savedAppointment = await createAppointment(a);

                  setItems((current) => [
                    ...current,
                    savedAppointment,
                  ]);

                  setOpen(false);

                  toast.success("Agendamento criado", {
                    description:
                      `${savedAppointment.name} — ` +
                      `${formatDateBR(savedAppointment.date)} ` +
                      `às ${savedAppointment.time}`,
                  });
                } catch (error) {
                  console.error(error);
                  toast.error(
                    editingAppointment
                      ? "Não foi possível atualizar o agendamento"
                      : "Não foi possível salvar o agendamento",
                  );
                  throw error;
                }
              }}
            />
          </Dialog>
        </div>

        <Tabs defaultValue="dia" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="dia">Do dia</TabsTrigger>
            <TabsTrigger value="proximos">Próximos</TabsTrigger>
          </TabsList>

          <TabsContent value="dia" className="space-y-3">
            {dayItems.length === 0 ? (
              <EmptyState
                title="Sem agendamentos neste dia"
                subtitle="Clique em “Novo agendamento” para adicionar."
              />
            ) : (
              dayItems.map((a) => (
                <AppointmentCard
                  key={a.id}
                  a={a}
                  isOverlap={items.some(
                    (item) => item.id !== a.id && appointmentsOverlap(item, a),
                  )}
                  onEdit={() => {
                    setEditingAppointment(a);
                    setOpen(true);
                  }}
                  onNotify={() => notify(a)}
                  onRemove={() => remove(a.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="proximos" className="space-y-3">
            {upcoming.length === 0 ? (
              <EmptyState title="Nenhum agendamento futuro" subtitle="Sua agenda está livre." />
            ) : (
              upcoming.map((a) => (
                <AppointmentCard
                  key={a.id}
                  a={a}
                  showDate
                  isOverlap={items.some(
                    (item) => item.id !== a.id && appointmentsOverlap(item, a),
                  )}
                  onEdit={() => {
                    setEditingAppointment(a);
                    setOpen(true);
                  }}
                  onNotify={() => notify(a)}
                  onRemove={() => remove(a.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-muted-foreground">
        @By Gabriel - 83 982270768
      </footer>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-primary-foreground/10 backdrop-blur border border-primary-foreground/15 px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">{label}</p>
      <p className={`font-display font-semibold ${small ? "text-lg" : "text-2xl"} mt-1`} style={{ color: "var(--gold)" }}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-dashed py-16 text-center">
      <Scissors className="mx-auto h-8 w-8 text-muted-foreground/60" />
      <p className="mt-3 font-display text-lg text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function AppointmentCard({
  a,
  isOverlap,
  onEdit,
  onNotify,
  onRemove,
  showDate,
}: {
  a: Appointment;
  isOverlap: boolean;
  onEdit: () => void;
  onNotify: () => void;
  onRemove: () => void;
  showDate?: boolean;
}) {
  return (
    <article
      className="group rounded-2xl border p-4 sm:p-5 transition-all hover:-translate-y-0.5"
      style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-soft)" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div
          className="flex flex-col items-center justify-center rounded-xl px-4 py-3 min-w-20 text-primary-foreground"
          style={{ background: "var(--gradient-hero)" }}
        >
          <span className="font-display text-2xl leading-none">{a.time}</span>
          {showDate && (
            <span className="text-[10px] uppercase tracking-widest mt-1 opacity-80">
              {formatDateBR(a.date)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold truncate">{a.name}</h3>
            {isOverlap && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Encaixe
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Scissors className="h-3.5 w-3.5" /> {a.service}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {a.phone}
            </span>
            <span className="font-medium" style={{ color: "var(--gold)" }}>
              {formatPrice(a.price)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
          >
            <Pencil className="mr-1.5 h-4 w-4" /> Editar
          </Button>
          <Button
            size="sm"
            onClick={onNotify}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: "var(--whatsapp)" }}
          >
            <Phone className="mr-1.5 h-4 w-4" /> Avisar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadICS(a)}
            title="Adicionar à Agenda do iPhone / Google / Outlook"
          >
            <CalendarPlus className="mr-1.5 h-4 w-4" /> Agenda
          </Button>
          <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remover">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function AppointmentDialog({
  defaultDate,
  appointment,
  appointments,
  onSave,
}: {
  defaultDate: string;
  appointment: Appointment | null;
  appointments: Appointment[];
  onSave: (a: Appointment, allowOverlap: boolean) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([SERVICES[0]]);
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [allowOverlap, setAllowOverlap] = useState(false);

  const isEditing = appointment !== null;

  useEffect(() => {
    setAllowOverlap(false);

    if (appointment) {
      setName(appointment.name);
      setPhone(appointment.phone);
      const appointmentServices = parseServices(appointment.service).filter(
        (service) => SERVICES.includes(service),
      );
      setSelectedServices(
        appointmentServices.length > 0 ? appointmentServices : [SERVICES[0]],
      );
      setPrice(appointment.price.toFixed(2).replace(".", ","));
      setDate(appointment.date);
      setTime(appointment.time);
      return;
    }

    setName("");
    setPhone("");
    setSelectedServices([SERVICES[0]]);
    setPrice("");
    setDate(defaultDate);
    setTime("09:00");
  }, [appointment, defaultDate]);

  const draftAppointment: Appointment = {
    id: appointment?.id ?? "novo-agendamento",
    name: name.trim(),
    phone: phone.trim(),
    service: selectedServices.join(" + "),
    price: Number(price.replace(/\./g, "").replace(",", ".")) || 0,
    date,
    time,
    createdAt: appointment?.createdAt ?? Date.now(),
  };

  const conflictingAppointment = appointments.find(
    (item) =>
      item.id !== draftAppointment.id &&
      appointmentsOverlap(item, draftAppointment),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || selectedServices.length === 0 || !date || !time) {
      toast.error("Preencha nome, telefone, serviço, data e horário");
      return;
    }

    try {
      setSaving(true);

      await onSave(
        {
          ...draftAppointment,
          id: appointment?.id ?? crypto.randomUUID(),
        },
        allowOverlap,
      );
    } catch {
      // A mensagem de erro já é exibida pelo componente principal.
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">
          {isEditing ? "Editar agendamento" : "Novo agendamento"}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome da cliente</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Maria Silva"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone (WhatsApp)</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            inputMode="tel"
          />
        </div>

        <div className="space-y-2">
          <Label>Serviços</Label>
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-input bg-background p-3 sm:grid-cols-2">
            {SERVICES.map((serviceOption) => {
              const isSelected = selectedServices.includes(serviceOption);

              return (
                <label
                  key={serviceOption}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedServices((current) => [
                          ...current,
                          serviceOption,
                        ]);
                        return;
                      }

                      setSelectedServices((current) =>
                        current.filter(
                          (selectedService) =>
                            selectedService !== serviceOption,
                        ),
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <span>{serviceOption}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Você pode selecionar mais de um serviço.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 min-w-0 space-y-1.5">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full min-w-0"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 w-full min-w-0"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">Valor (R$)</Label>
          <Input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="80,00"
            inputMode="decimal"
          />
        </div>

        {conflictingAppointment && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm font-semibold text-amber-800">
              Horário em conflito
            </p>
            <p className="mt-1 text-xs text-amber-700">
              {conflictingAppointment.name} já está marcada às{" "}
              {conflictingAppointment.time}. Esse atendimento ocupa aproximadamente{" "}
              {getAppointmentDurationMinutes(conflictingAppointment)} minutos.
            </p>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={allowOverlap}
                onChange={(e) => setAllowOverlap(e.target.checked)}
                className="h-4 w-4"
              />
              Permitir encaixe mesmo assim
            </label>
          </div>
        )}

        <DialogFooter>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={saving || (!!conflictingAppointment && !allowOverlap)}
          >
            {saving
              ? "Salvando..."
              : conflictingAppointment && !allowOverlap
                ? "Marque “Permitir encaixe”"
                : isEditing
                  ? "Salvar alterações"
                  : "Salvar agendamento"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}