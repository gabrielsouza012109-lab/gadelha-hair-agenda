import { supabase } from "./supabase";

export type Appointment = {
  id: string;
  name: string;
  phone: string;
  service: string;
  price: number;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  createdAt: number;
};

type AppointmentRow = {
  id: string;
  client_name: string;
  phone: string;
  service: string;
  price: number | string;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
};

function rowToAppointment(
  row: AppointmentRow,
): Appointment {
  return {
    id: row.id,
    name: row.client_name,
    phone: row.phone,
    service: row.service,
    price: Number(row.price) || 0,
    date: row.appointment_date,
    time: row.appointment_time.slice(0, 5),
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function loadAppointments(): Promise<
  Appointment[]
> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
        id,
        client_name,
        phone,
        service,
        price,
        appointment_date,
        appointment_time,
        created_at
      `,
    )
    .order("appointment_date", {
      ascending: true,
    })
    .order("appointment_time", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Erro ao carregar agendamentos: ${error.message}`,
    );
  }

  return (data ?? []).map((row) =>
    rowToAppointment(row as AppointmentRow),
  );
}

export async function createAppointment(
  appointment: Appointment,
): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      id: appointment.id,
      client_name: appointment.name,
      phone: appointment.phone,
      service: appointment.service,
      price: appointment.price,
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      status: "scheduled",
    })
    .select(
      `
        id,
        client_name,
        phone,
        service,
        price,
        appointment_date,
        appointment_time,
        created_at
      `,
    )
    .single();

  if (error) {
    throw new Error(
      `Erro ao criar agendamento: ${error.message}`,
    );
  }

  return rowToAppointment(
    data as AppointmentRow,
  );
}

export async function updateAppointment(
  appointment: Appointment,
): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      client_name: appointment.name,
      phone: appointment.phone,
      service: appointment.service,
      price: appointment.price,
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointment.id)
    .select(
      `
        id,
        client_name,
        phone,
        service,
        price,
        appointment_date,
        appointment_time,
        created_at
      `,
    )
    .single();

  if (error) {
    throw new Error(
      `Erro ao atualizar agendamento: ${error.message}`,
    );
  }

  return rowToAppointment(
    data as AppointmentRow,
  );
}

export async function deleteAppointment(
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Erro ao excluir agendamento: ${error.message}`,
    );
  }
}

export function formatPrice(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateBR(
  dateISO: string,
) {
  const [y, m, d] = dateISO.split("-");

  return `${d}/${m}/${y}`;
}

export function todayISO() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function buildWhatsAppUrl(
  phone: string,
  message: string,
) {
  let digits = onlyDigits(phone);

  if (digits.length && digits.length <= 11) {
    digits = `55${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(
    message,
  )}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(
  dateISO: string,
  time: string,
  addMinutes = 0,
) {
  const [year, month, day] = dateISO
    .split("-")
    .map(Number);

  const [hour, minute] = time
    .split(":")
    .map(Number);

  const date = new Date(
    year,
    (month ?? 1) - 1,
    day ?? 1,
    hour ?? 0,
    minute ?? 0,
  );

  date.setMinutes(
    date.getMinutes() + addMinutes,
  );

  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    "00"
  );
}

function escapeICS(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildICS(
  appointment: {
    id: string;
    name: string;
    phone: string;
    service: string;
    price: number;
    date: string;
    time: string;
  },
  durationMinutes = 60,
) {
  const dtStart = toICSDate(
    appointment.date,
    appointment.time,
  );

  const dtEnd = toICSDate(
    appointment.date,
    appointment.time,
    durationMinutes,
  );

  const now = toICSDate(
    todayISO(),
    "00:00",
  );

  const title =
    `${appointment.service} — ` +
    appointment.name;

  const description =
    `Cliente: ${appointment.name}\n` +
    `Telefone: ${appointment.phone}\n` +
    `Serviço: ${appointment.service}\n` +
    `Valor: R$ ${appointment.price
      .toFixed(2)
      .replace(".", ",")}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gadelha Hair//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@gadelha-hair`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(
      description,
    )}`,
    "LOCATION:Gadelha Hair",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete de agendamento",
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(
  appointment: Parameters<
    typeof buildICS
  >[0],
) {
  const ics = buildICS(appointment);

  const blob = new Blob([ics], {
    type: "text/calendar;charset=utf-8",
  });

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  const formattedDate = formatDateBR(
    appointment.date,
  ).replace(/\//g, "-");

  const formattedName = appointment.name
    .replace(/\s+/g, "-")
    .toLowerCase();

  link.download =
    `agendamento-${formattedName}-` +
    `${formattedDate}.ics`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}