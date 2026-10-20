import { APIRequestContext, request } from "@playwright/test";
import { API_URL, DOCTOR } from "./credentials";

export interface ApiSession {
  ctx: APIRequestContext;
  token: string;
  userId: string;
}

export async function loginApi(): Promise<ApiSession> {
  const ctx = await request.newContext({ baseURL: API_URL });

  for (let tentativa = 1; tentativa <= 6; tentativa++) {
    const res = await ctx.post("/auth/login", { data: DOCTOR });
    if (res.ok()) {
      const body = await res.json();
      return { ctx, token: body.access_token, userId: body.user.id };
    }
    if (res.status() !== 429 || tentativa === 6) {
      throw new Error(
        `Login da API falhou (${res.status()}). A API está no ar em ${API_URL} e o seed rodou?`,
      );
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
  throw new Error("Login da API falhou após as tentativas.");
}

function auth(session: ApiSession) {
  return { Authorization: `Bearer ${session.token}` };
}

export async function criarPaciente(
  session: ApiSession,
  nome: string,
  cpf: string,
): Promise<{ id: string; name: string }> {
  const res = await session.ctx.post("/patients", {
    headers: auth(session),
    data: {
      name: nome,
      cpf,
      phone: "11955551234",
      gender: "F",
      birthDate: "1990-05-20",
    },
  });
  if (!res.ok()) {
    throw new Error(`Falha ao criar paciente (${res.status()})`);
  }
  return res.json();
}

export async function excluirPaciente(session: ApiSession, id: string) {
  await session.ctx.delete(`/patients/${id}`, { headers: auth(session) });
}

export async function consultasDoPaciente(session: ApiSession, patientId: string) {
  const res = await session.ctx.get(`/appointments/patient/${patientId}`, {
    headers: auth(session),
  });
  if (!res.ok()) return [];
  const body = await res.json();
  return body.records ?? [];
}

export async function limparConsultas(session: ApiSession, patientId: string) {
  const consultas = await consultasDoPaciente(session, patientId);
  for (const consulta of consultas) {
    const ficha = await session.ctx.get("/clinical-records", {
      headers: auth(session),
      params: { appointmentId: consulta.id },
    });
    if (ficha.ok()) {
      const corpo = await ficha.text();
      if (corpo && corpo !== "" && corpo !== "null") {
        const registro = JSON.parse(corpo);
        if (registro?.id) {
          await session.ctx.delete(`/clinical-records/${registro.id}`, {
            headers: auth(session),
          });
        }
      }
    }

    const remocao = await session.ctx.delete(`/appointments/${consulta.id}`, {
      headers: auth(session),
    });
    if (!remocao.ok()) {
      await session.ctx.patch(`/appointments/${consulta.id}/status`, {
        headers: auth(session),
        data: { status: "cancelled", cancellationReason: "limpeza e2e" },
      });
    }
  }
}

export async function agendarViaApi(
  session: ApiSession,
  patientId: string,
  scheduledAt: string,
) {
  const res = await session.ctx.post("/appointments", {
    headers: auth(session),
    data: { patientId, doctorId: session.userId, scheduledAt },
  });
  if (!res.ok()) {
    throw new Error(`Falha ao agendar consulta (${res.status()})`);
  }
  return res.json();
}

export async function resetOnboarding(session: ApiSession) {
  const res = await session.ctx.post("/onboarding/reset", {
    headers: auth(session),
  });
  if (!res.ok()) {
    throw new Error(`Falha ao reiniciar o onboarding (${res.status()})`);
  }
  return res.json();
}

export async function onboardingState(session: ApiSession) {
  const res = await session.ctx.get("/onboarding/state", {
    headers: auth(session),
  });
  if (!res.ok()) {
    throw new Error(`Falha ao ler o estado do onboarding (${res.status()})`);
  }
  return res.json();
}

export function gerarCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const digito = (nums: number[], pesoInicial: number) => {
    const soma = nums.reduce((acc, n, i) => acc + n * (pesoInicial - i), 0);
    return ((soma * 10) % 11) % 10;
  };
  const d1 = digito(base, 10);
  const d2 = digito([...base, d1], 11);
  return [...base, d1, d2].join("");
}
