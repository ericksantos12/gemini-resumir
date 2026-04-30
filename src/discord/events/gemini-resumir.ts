import { createEvent } from "#base";
import { summarizeText } from "../../services/gemini-service.js";
import { getFormattedHistory } from "../../utils/message-formatter.js";

createEvent({
    name: "gemini-resumir",
    event: "messageCreate",
    async run(message) {
        if (message.content.toLowerCase().includes("gemini resumir")) {
            const history = await getFormattedHistory(message.channel);
            const summary = await summarizeText(history);

            const finalText = summary.slice(0, 1900);

            await message.reply(`${finalText}`);
        }
    },
});
