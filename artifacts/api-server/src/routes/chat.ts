import { Router, type IRouter } from "express";
import { StreamChatBody as ChatBodySchema } from "@workspace/api-zod";
import { db, chatTurnsTable } from "@workspace/db";
import { fetchConditions, type ConditionsSnapshot } from "../lib/conditions";
import { rateLimit, getClientIp } from "../lib/rate-limit";
import { logger } from "../lib/logger";
import {
  buildSystemPrompt,
  emergencyReply,
  getOpenAI,
  isEmergency,
} from "../lib/copilot";

const router: IRouter = Router();

const chatLimiter = rateLimit({ scope: "chat", max: 10, windowMs: 60 * 60 * 1000 });

router.post("/chat", chatLimiter, async (req, res) => {
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_body",
      message: parsed.error.issues[0]?.message ?? "Invalid chat body.",
    });
    return;
  }

  const { messages, locale, location, profile, sessionId } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  // Set up SSE response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (payload: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Emergency short-circuit — never send to the model.
  if (lastUser && isEmergency(lastUser.content)) {
    const reply = emergencyReply(locale);
    send({ content: reply });
    send({ done: true, emergency: true });
    res.end();
    return;
  }

  let conditions: ConditionsSnapshot | null = null;
  if (location) {
    try {
      conditions = await fetchConditions(
        location.lat,
        location.lon,
        location.city ?? null,
        location.country ?? null,
      );
    } catch (err) {
      logger.warn({ err }, "conditions lookup failed inside chat; continuing without");
    }
  }

  const system = buildSystemPrompt({
    locale,
    conditions,
    audience: profile?.audience ?? null,
    channel: "web",
  });

  let openai;
  try {
    openai = await getOpenAI();
  } catch (err) {
    logger.error({ err }, "openai integration unavailable");
    res.statusCode = 503;
    send({
      error: "ai_unavailable",
      message: "The AI copilot is not configured. Please try again later.",
    });
    res.end();
    return;
  }

  let assistantText = "";
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 2000,
      reasoning_effort: "minimal",
      stream: true,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        assistantText += content;
        send({ content });
      }
    }

    send({ done: true });
    res.end();
  } catch (err) {
    logger.error({ err }, "openai chat stream failed");
    send({
      error: "model_error",
      message: "The copilot is unavailable right now. Please try again in a moment.",
    });
    res.end();
    return;
  }

  // Best-effort persistence — never block the response on the DB write.
  if (lastUser && assistantText) {
    db.insert(chatTurnsTable)
      .values({
        sessionId: sessionId ?? "anon",
        ipAddress: getClientIp(req),
        locale,
        question: lastUser.content,
        answer: assistantText,
        conditions: conditions ?? null,
      })
      .catch((err: unknown) => {
        logger.warn({ err }, "chat_turns persist failed");
      });
  }
});

export default router;
