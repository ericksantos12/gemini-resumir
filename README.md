# Awesome Bot Base

> [!NOTE]
> This project **base** can be generated using the [Constant CLI](https://github.com/rinckodev/constatic/tree/master/tools/cli#readme)
> See the full documentation for this base by accessing: https://constatic-docs.vercel.app/docs/discord/start

This is the most complete discord bot base you've ever seen! Developed by [@rinckodev](https://github.com/rinckodev), this project uses typescript in an incredible way to provide complete structures and facilitate the development of your discord bot.

> [!WARNING]
> [NodeJs](https://nodejs.org/en) version required: 20.12 or higher

## Scripts

- `dev`: running bot in development
- `build`: build the project
- `watch`: running in watch mode
- `start`: running the compiled bot

## Structures

- [Commands](https://constatic-docs.vercel.app/docs/discord/commands)
- [Responder](https://constatic-docs.vercel.app/docs/discord/responders)
- [Events](https://constatic-docs.vercel.app/docs/discord/events)

## Gemini Flash setup (free tier)

1. Create an API key in Google AI Studio: https://aistudio.google.com/apikey
2. Set these variables in your `.env`:
   - `GEMINI_API_KEY=your_key_here`
   - `GEMINI_MODEL=gemini-flash-latest` (default in this project)
3. Run the bot with `npm run dev`.
