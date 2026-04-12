/** Parse fetch Response body as JSON; throw clear errors on HTML/empty bodies. */
export async function readJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.ok
        ? "Empty response from server."
        : `Request failed (${res.status}) with an empty body — check the server console or database migrations.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Server returned non-JSON. Check the dev server console."
        : `Request failed (${res.status}). Server returned non-JSON (often an HTML error page).`,
    );
  }
}
