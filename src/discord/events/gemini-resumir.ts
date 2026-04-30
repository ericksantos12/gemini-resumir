import { createEvent } from "#base";
import emojis from "#emojis" with { type: "json" };
import { formatEmoji } from "discord.js";
import { summarizeText } from "../../services/gemini-service.js";
import { getFormattedHistory } from "../../utils/message-formatter.js";

createEvent({
    name: "gemini-resumir",
    event: "messageCreate",
    async run(message) {
        if (message.content.toLowerCase().includes("gemini resumir")) {
            await message.reply(`${formatEmoji(emojis.animated.loading_gemini, true)} Resumindo...`);

            try {
                const history = await getFormattedHistory(message.channel);
                const summary = await summarizeText(history);

                const finalText = summary.slice(0, 1900);

                await message.reply(`${finalText}`);
            } catch (error) {
                console.error("Error summarizing conversation:", error);
                await message.reply("Desculpe, ocorreu um erro ao resumir a conversa.");
            }
        }
    },
});
