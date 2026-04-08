// Re-export the messages handler at /v1/messages path.
// The Claude Agent SDK calls /v1/messages (Anthropic standard path)
// but our handler lives at /messages. This re-export makes both work.
export { default } from "../messages";
