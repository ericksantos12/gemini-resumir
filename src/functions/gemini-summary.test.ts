import { expect, test } from "vitest";

type DiscordMessageFixture = {
    id: string;
    content: string;
    createdTimestamp: number;
    author: {
        bot: boolean;
        username: string;
        displayName?: string;
    };
};

type SummaryMessage = {
    authorName: string;
    content: string;
    createdAt: Date;
};

type FetchOptions = {
    limit: number;
    before?: string;
};

type GeminiSummaryModule = {
    isGeminiSummaryRequest(content: string): boolean;
    getMessagesFromLast24Hours(channel: unknown, options: {
        now: Date;
        beforeMessageId: string;
        pageSize?: number;
    }): Promise<SummaryMessage[]>;
    buildSummaryPrompt(messages: SummaryMessage[], options?: { now?: Date }): string;
};

async function loadGeminiSummaryModule(): Promise<GeminiSummaryModule> {
    const modulePath = "./gemini-summary.js";

    return await import(modulePath) as GeminiSummaryModule;
}

function createMessage(overrides: Partial<DiscordMessageFixture> & Pick<DiscordMessageFixture, "id" | "content" | "createdTimestamp">): DiscordMessageFixture {
    return {
        author: {
            bot: false,
            username: "user",
        },
        ...overrides,
    };
}

function createMessageCollection(messages: DiscordMessageFixture[]): Map<string, DiscordMessageFixture> {
    return new Map(messages.map((message) => [message.id, message]));
}

test("detects the gemini resumir trigger with case and spacing variations", async () => {
    const { isGeminiSummaryRequest } = await loadGeminiSummaryModule();

    expect(isGeminiSummaryRequest("gemini resumir")).toBe(true);
    expect(isGeminiSummaryRequest("Gemini Resumir")).toBe(true);
    expect(isGeminiSummaryRequest(" GEMINI   RESUMIR ")).toBe(true);
    expect(isGeminiSummaryRequest("gemini\tresumir")).toBe(true);
});

test("rejects messages that are not exactly the summary trigger", async () => {
    const { isGeminiSummaryRequest } = await loadGeminiSummaryModule();

    expect(isGeminiSummaryRequest("")).toBe(false);
    expect(isGeminiSummaryRequest("gemini")).toBe(false);
    expect(isGeminiSummaryRequest("resumir")).toBe(false);
    expect(isGeminiSummaryRequest("gemini resumir agora")).toBe(false);
    expect(isGeminiSummaryRequest("oi gemini resumir")).toBe(false);
    expect(isGeminiSummaryRequest("gemini resume")).toBe(false);
});

test("fetches only human messages from the previous 24 hours before the trigger message", async () => {
    const { getMessagesFromLast24Hours } = await loadGeminiSummaryModule();
    const now = new Date("2026-04-28T12:00:00.000Z");
    const oneHourAgo = now.getTime() - 60 * 60 * 1000;
    const twoHoursAgo = now.getTime() - 2 * 60 * 60 * 1000;
    const windowStart = now.getTime() - 24 * 60 * 60 * 1000;
    const fetchCalls: FetchOptions[] = [];
    const pages = [
        createMessageCollection([
            createMessage({ id: "105", content: "Deploy terminou sem erros", createdTimestamp: oneHourAgo, author: { bot: false, username: "ana" } }),
            createMessage({ id: "104", content: "Mensagem automatica", createdTimestamp: twoHoursAgo, author: { bot: true, username: "ci-bot" } }),
            createMessage({ id: "103", content: "   ", createdTimestamp: twoHoursAgo, author: { bot: false, username: "bruno" } }),
        ]),
        createMessageCollection([
            createMessage({ id: "102", content: "Discussao sobre prazo", createdTimestamp: windowStart, author: { bot: false, username: "carol", displayName: "Carol" } }),
            createMessage({ id: "101", content: "Mensagem antiga", createdTimestamp: windowStart - 1, author: { bot: false, username: "dan" } }),
        ]),
    ];
    const channel = {
        messages: {
            fetch: async (options: FetchOptions) => {
                fetchCalls.push(options);

                return pages.shift() ?? createMessageCollection([]);
            },
        },
    };

    const messages = await getMessagesFromLast24Hours(channel, {
        now,
        beforeMessageId: "trigger-message-id",
        pageSize: 3,
    });

    expect(fetchCalls).toEqual([
        { limit: 3, before: "trigger-message-id" },
        { limit: 3, before: "103" },
    ]);
    expect(messages).toEqual([
        {
            authorName: "Carol",
            content: "Discussao sobre prazo",
            createdAt: new Date(windowStart),
        },
        {
            authorName: "ana",
            content: "Deploy terminou sem erros",
            createdAt: new Date(oneHourAgo),
        },
    ]);
});

test("builds a concise PT-BR prompt with chronological chat context", async () => {
    const { buildSummaryPrompt } = await loadGeminiSummaryModule();
    const prompt = buildSummaryPrompt([
        {
            authorName: "Ana",
            content: "Deploy terminou sem erros",
            createdAt: new Date("2026-04-28T10:00:00.000Z"),
        },
        {
            authorName: "Bruno",
            content: "Ainda falta revisar o endpoint de resumo",
            createdAt: new Date("2026-04-28T11:00:00.000Z"),
        },
    ], { now: new Date("2026-04-28T12:00:00.000Z") });

    expect(prompt).toMatch(/resumo conciso/i);
    expect(prompt).toMatch(/principais pontos/i);
    expect(prompt).toMatch(/PT-BR|portugu(?:es|\u00eas)/i);
    expect(prompt).toMatch(/Ana.*Deploy terminou sem erros/s);
    expect(prompt).toMatch(/Bruno.*Ainda falta revisar o endpoint de resumo/s);
    expect(prompt).not.toContain("gemini resumir");
});

test("builds a safe prompt when there are no messages to summarize", async () => {
    const { buildSummaryPrompt } = await loadGeminiSummaryModule();
    const prompt = buildSummaryPrompt([], { now: new Date("2026-04-28T12:00:00.000Z") });

    expect(prompt).toMatch(/sem mensagens|nenhuma mensagem|nao ha mensagens/i);
    expect(prompt).toMatch(/24 horas/i);
});
