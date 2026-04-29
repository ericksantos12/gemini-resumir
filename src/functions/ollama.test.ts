import { expect, test } from "vitest";

type FetchCall = {
    url: string;
    init: RequestInit;
};

type FetchResponse = {
    ok: boolean;
    status: number;
    statusText?: string;
    json(): Promise<unknown>;
    text?(): Promise<string>;
};

type OllamaModule = {
    summarizeWithOllama(prompt: string, options: {
        endpoint: string;
        model: string;
        fetch: (url: string, init: RequestInit) => Promise<FetchResponse>;
    }): Promise<string>;
};

async function loadOllamaModule(): Promise<OllamaModule> {
    const modulePath = "./ollama.js";

    return await import(modulePath) as OllamaModule;
}

test("requests a non-streaming summary from Ollama and returns the trimmed response", async () => {
    const { summarizeWithOllama } = await loadOllamaModule();
    const calls: FetchCall[] = [];
    const fetch = async (url: string, init: RequestInit): Promise<FetchResponse> => {
        calls.push({ url, init });

        return {
            ok: true,
            status: 200,
            async json() {
                return { response: "  Resumo final do chat.  " };
            },
        };
    };

    const summary = await summarizeWithOllama("Prompt do resumo", {
        endpoint: "http://localhost:11434",
        model: "gemma3:latest",
        fetch,
    });

    expect(summary).toBe("Resumo final do chat.");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://localhost:11434/api/generate");
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
        model: "gemma3:latest",
        prompt: "Prompt do resumo",
        stream: false,
    });
});

test("normalizes trailing slashes in the Ollama endpoint", async () => {
    const { summarizeWithOllama } = await loadOllamaModule();
    let requestedUrl = "";
    const fetch = async (url: string, _init: RequestInit): Promise<FetchResponse> => {
        requestedUrl = url;

        return {
            ok: true,
            status: 200,
            async json() {
                return { response: "Resumo" };
            },
        };
    };

    await summarizeWithOllama("Prompt", {
        endpoint: "http://localhost:11434/",
        model: "gemma3:latest",
        fetch,
    });

    expect(requestedUrl).toBe("http://localhost:11434/api/generate");
});

test("throws a useful error when Ollama returns a non-2xx response", async () => {
    const { summarizeWithOllama } = await loadOllamaModule();
    const fetch = async (_url: string, _init: RequestInit): Promise<FetchResponse> => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        async json() {
            return { error: "model failed" };
        },
        async text() {
            return "model failed";
        },
    });

    await expect(
        summarizeWithOllama("Prompt", {
            endpoint: "http://localhost:11434",
            model: "gemma3:latest",
            fetch,
        }),
    ).rejects.toThrow(/Ollama.*500.*model failed/i);
});

test("throws when Ollama returns an empty summary", async () => {
    const { summarizeWithOllama } = await loadOllamaModule();
    const fetch = async (_url: string, _init: RequestInit): Promise<FetchResponse> => ({
        ok: true,
        status: 200,
        async json() {
            return { response: "   " };
        },
    });

    await expect(
        summarizeWithOllama("Prompt", {
            endpoint: "http://localhost:11434",
            model: "gemma3:latest",
            fetch,
        }),
    ).rejects.toThrow(/empty|vazio|sem conteudo/i);
});
