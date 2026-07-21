# Gadelha Hair — Agenda

Aplicativo de agendamentos para salão de cabelo. Permite cadastrar clientes, serviços, valores, data e horário, visualizar os agendamentos do dia, enviar lembrete via WhatsApp e exportar eventos para a Agenda do iPhone (arquivo `.ics`).

## Tecnologias

- React 19 + TypeScript
- TanStack Start (router + SSR)
- Tailwind CSS v4
- shadcn/ui components
- localStorage (dados ficam no navegador)

## Como rodar no VSCode

1. Instale o [Node.js](https://nodejs.org/) (versão 20+) ou [Bun](https://bun.sh/).
2. Abra a pasta `gadelha-hair-vscode` no VSCode.
3. No terminal, instale as dependências:

```bash
npm install
```

ou, se estiver usando Bun:

```bash
bun install
```

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

ou

```bash
bun dev
```

5. Abra o navegador em `http://localhost:8080`.

## Funcionalidades

- **Agendamentos do dia**: filtra automaticamente pela data selecionada.
- **Próximos agendamentos**: lista os agendamentos futuros em ordem de data/hora.
- **Novo agendamento**: nome, telefone, serviço, data, horário e valor.
- **WhatsApp**: botão "Avisar" abre o WhatsApp com mensagem de confirmação.
- **Agenda do iPhone**: botão "Agenda" faz download de um `.ics` que pode ser aberto no iPhone, Google Calendar ou Outlook.

## Observações

- Os dados são salvos no `localStorage` do navegador. Se limpar o cache, os agendamentos serão perdidos.
- A configuração `vite.config.ts` é standalone e funciona sem dependências externas adicionais.
