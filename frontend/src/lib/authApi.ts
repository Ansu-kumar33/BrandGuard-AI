import type { AuthenticatedUser, AuthSession } from "../types/auth";
import { apiUrl } from "./apiConfig";

interface ApiError {
  detail?: string | Array<{ msg?: string }>;
}

export class AuthenticationApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AuthenticationApiError";
  }
}

export const authApi = {
  register(name: string, email: string, password: string): Promise<AuthenticatedUser> {
    return request<AuthenticatedUser>("/api/auth/register", {
      name,
      email,
      password,
    });
  },

  login(email: string, password: string): Promise<AuthSession> {
    return request<AuthSession>("/api/auth/login", { email, password });
  },

  async me(token: string): Promise<AuthenticatedUser> {
    return request<AuthenticatedUser>("/api/auth/me", undefined, token);
  },
};

async function request<T>(
  path: string,
  body?: Record<string, string>,
  token?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new AuthenticationApiError(
      "Could not reach the FastAPI backend. Check that it is running and try again.",
    );
  }

  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AuthenticationApiError(
      errorMessage(responseBody, response.status),
      response.status,
    );
  }
  return responseBody as T;
}

function errorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as ApiError).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg ?? "Invalid request.").join(" ");
    }
  }
  return `Authentication request failed (HTTP ${status}).`;
}
