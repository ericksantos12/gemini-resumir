import { expect, test } from "vitest";

type SummaryMessage = {
    authorName: string;
    content: string;
    createdAt: Date;
};

type ReplyPayload = string | { content: string };

type MessageFixture = {
    id: string;
    content: string;
    author: {
        bot: boolean;
    };
    channel: {
        sendTyping(): Promise<void>;
    };
    reply(payload: ReplyPayload): Promise<void>;
};

type HandlerDependencies = {
    now: Date;
    isGeminiSummaryRequest(content: string): boolean;
    getMessagesFromLast24Hours(
        channel: unknown,
        options: {
            now: Date;
            beforeMessageId: string;
        },
    ): Promise<SummaryMessage[]>;
    buildSummaryPrompt(messages: SummaryMessage[], options: { now: Date }): string;
    summarizeWithOllama(prompt: string): Promise<string>;
};

type GeminiEventModule = {
    handleGeminiSummaryMessage(message: MessageFixture, dependencies: HandlerDependencies): Promise<void>;
};

async function loadGeminiEventModule(): Promise<GeminiEventModule> {
    const modulePath = "./gemini-resumir.js";

    return (await import(modulePath)) as GeminiEventModule;
}

function getReplyContent(payload: ReplyPayload | undefined): string {
    if (typeof payload === "string") {
        return payload;
    }

    return payload?.content ?? "";
}

function createMessage(content: string, overrides: Partial<MessageFixture> = {}): MessageFixture {
    const replies: ReplyPayload[] = [];
    const message = {
        id: "trigger-message-id",
        content,
        author: { bot: false },
        channel: {
            async sendTyping() {},
        },
        async reply(payload: ReplyPayload) {
            replies.push(payload);
        },
        ...overrides,
    };

    return Object.assign(message, { replies }) as MessageFixture & { replies: ReplyPayload[] };
}

function createDependencies(overrides: Partial<HandlerDependencies> = {}): HandlerDependencies {
    return {
        now: new Date("2026-04-28T12:00:00.000Z"),
        isGeminiSummaryRequest: (content) => /^gemini\s+resumir$/i.test(content.trim()),
        async getMessagesFromLast24Hours() {
            return [
                {
                    authorName: "Ana",
                    content: "Deploy terminou sem erros",
                    createdAt: new Date("2026-04-28T10:00:00.000Z"),
                },
            ];
        },
        buildSummaryPrompt: () => "prompt gerado",
        async summarizeWithOllama() {
            return "Resumo conciso do chat";
        },
        ...overrides,
    };
}

test("ignores bot messages", async () => {
    const { handleGeminiSummaryMessage } = await loadGeminiEventModule();
    let triggerChecked = false;
    const message = createMessage("gemini resumir", { author: { bot: true } });

    await handleGeminiSummaryMessage(
        message,
        createDependencies({
            isGeminiSummaryRequest() {
                triggerChecked = true;

                return true;
            },
        }),
    );

    expect(triggerChecked).toBe(false);
    expect((message as MessageFixture & { replies: ReplyPayload[] }).replies).toEqual([]);
});

test("ignores human messages that are not the trigger", async () => {
    const { handleGeminiSummaryMessage } = await loadGeminiEventModule();
    let fetchedMessages = false;
    const message = createMessage("qual foi o resumo?");

    await handleGeminiSummaryMessage(
        message,
        createDependencies({
            isGeminiSummaryRequest: () => false,
            async getMessagesFromLast24Hours() {
                fetchedMessages = true;

                return [];
            },
        }),
    );

    expect(fetchedMessages).toBe(false);
    expect((message as MessageFixture & { replies: ReplyPayload[] }).replies).toEqual([]);
});

test("summarizes the previous 24 hours when a human sends the trigger", async () => {
    const { handleGeminiSummaryMessage } = await loadGeminiEventModule();
    const sentTyping: string[] = [];
    const message = createMessage(" GEMINI   RESUMIR ", {
        channel: {
            async sendTyping() {
                sentTyping.push("typing");
            },
        },
    });
    const expectedMessages: SummaryMessage[] = [
        {
            authorName: "Ana",
            content: "Deploy terminou sem erros",
            createdAt: new Date("2026-04-28T10:00:00.000Z"),
        },
    ];
    const calls: string[] = [];

    await handleGeminiSummaryMessage(
        message,
        createDependencies({
            async getMessagesFromLast24Hours(channel, options) {
                expect(channel).toBe(message.channel);
                expect(options).toEqual({
                    now: new Date("2026-04-28T12:00:00.000Z"),
                    beforeMessageId: "trigger-message-id",
                });
                calls.push("fetch");

                return expectedMessages;
            },
            buildSummaryPrompt(messages, options) {
                expect(messages).toBe(expectedMessages);
                expect(options).toEqual({ now: new Date("2026-04-28T12:00:00.000Z") });
                calls.push("prompt");

                return "prompt gerado";
            },
            async summarizeWithOllama(prompt) {
                expect(prompt).toBe("prompt gerado");
                calls.push("ollama");

                return "Resumo conciso do chat";
            },
        }),
    );

    expect(sentTyping).toEqual(["typing"]);
    expect(calls).toEqual(["fetch", "prompt", "ollama"]);
    expect(getReplyContent((message as MessageFixture & { replies: ReplyPayload[] }).replies[0])).toBe(
        "Resumo conciso do chat",
    );
});

test("replies with a friendly error when the summary provider fails", async () => {
    const { handleGeminiSummaryMessage } = await loadGeminiEventModule();
    const message = createMessage("gemini resumir");

    await handleGeminiSummaryMessage(
        message,
        createDependencies({
            async summarizeWithOllama() {
                throw new Error("Ollama unavailable");
            },
        }),
    );

    expect(getReplyContent((message as MessageFixture & { replies: ReplyPayload[] }).replies[0])).toMatch(
        /nao consegui|erro|falha/i,
    );
});
