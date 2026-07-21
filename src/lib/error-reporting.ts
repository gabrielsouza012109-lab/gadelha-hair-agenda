type RuntimeErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportRuntimeError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("Runtime error:", message, context);

  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("app:error", {
        detail: {
          message,
          stack: error instanceof Error ? error.stack : undefined,
          context,
        },
      }),
    );
  }
}
