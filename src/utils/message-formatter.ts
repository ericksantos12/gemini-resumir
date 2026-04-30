import type { TextBasedChannel } from "discord.js";

export async function getFormattedHistory(channel: TextBasedChannel): Promise<string> {
    const messages = await channel.messages.fetch({ limit: 100 });

    return Array.from(messages.values())
        .filter((m) => !m.author.bot && m.content.length > 0)
        .reverse()
        .map((m) => `${m.author.username}: ${m.content}`)
        .join("\n");
}
