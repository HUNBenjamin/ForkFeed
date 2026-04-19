import { scryptSync } from "crypto";
import fixture from "../fixtures/login.json";

// ── jest.mock: replace prisma (external dependency) with controlled fakes ──

jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    denylistedToken: { findUnique: jest.fn() },
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ── jest.mock (partial): keep real auth helpers but replace signToken with a spy ──

jest.mock("../../lib/auth", () => {
  const actual = jest.requireActual("../../lib/auth") as Record<string, unknown>;
  return {
    __esModule: true,
    ...actual,
    signToken: jest.fn().mockReturnValue("mocked-jwt-token"),
  };
});

import prisma from "../../lib/prisma";
import { signToken } from "../../lib/auth";
import { POST } from "../../app/api/auth/login/route";

const mockedFindFirst = prisma.user.findFirst as jest.Mock;
const mockedUpdate = prisma.user.update as jest.Mock;
const signTokenSpy = signToken as unknown as jest.Mock; // spy: tracks calls & arguments

// ── Helpers ────────────────────────────────────────────────

/** Build a password hash in the same format the app stores ($salt$hex). */
function hashPassword(password: string, salt = "testsalt"): string {
  return `$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

/** Create a minimal login Request from a body object. */
function loginRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Return a DB-row-shaped object from a fixture user (adds password_hash). */
function dbRow(user: (typeof fixture.users)[number]) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password_hash: hashPassword(user.password),
    role: user.role,
    is_active: user.is_active,
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    mockedFindFirst.mockReset();
    mockedUpdate.mockReset();
    signTokenSpy.mockClear();
    signTokenSpy.mockReturnValue("mocked-jwt-token");
  });

  // ─── Valid credentials (fixture: admin) ───────────────

  describe("valid credentials", () => {
    const user = fixture.users[0]; // admin

    it("returns 200 with token and user data", async () => {
      mockedFindFirst.mockResolvedValue(dbRow(user));
      mockedUpdate.mockResolvedValue({});

      const res = await POST(loginRequest({ login: user.username, password: user.password }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.token).toBe("mocked-jwt-token");
      expect(body.user).toMatchObject({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    });

    it("calls signToken with correct user data (spy verification)", async () => {
      mockedFindFirst.mockResolvedValue(dbRow(user));
      mockedUpdate.mockResolvedValue({});

      await POST(loginRequest({ login: user.username, password: user.password }));

      expect(signTokenSpy).toHaveBeenCalledTimes(1);
      expect(signTokenSpy).toHaveBeenCalledWith({
        id: user.id,
        username: user.username,
        role: user.role,
      });
    });

    it("updates last_login after successful authentication", async () => {
      mockedFindFirst.mockResolvedValue(dbRow(user));
      mockedUpdate.mockResolvedValue({});

      await POST(loginRequest({ login: user.username, password: user.password }));

      expect(mockedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: user.id },
          data: { last_login: expect.any(Date) },
        }),
      );
    });

    it("accepts email as login identifier", async () => {
      mockedFindFirst.mockResolvedValue(dbRow(user));
      mockedUpdate.mockResolvedValue({});

      const res = await POST(loginRequest({ login: user.email, password: user.password }));
      expect(res.status).toBe(200);
    });
  });

  // ─── Invalid credentials (fixture: regular user) ─────

  describe("invalid credentials", () => {
    const user = fixture.users[1]; // regular user

    it("returns 401 for wrong password", async () => {
      mockedFindFirst.mockResolvedValue(dbRow(user));

      const res = await POST(loginRequest({ login: user.username, password: "wrongpassword" }));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Invalid credentials.");
      expect(signTokenSpy).not.toHaveBeenCalled();
    });

    it("returns 401 for non-existent user", async () => {
      mockedFindFirst.mockResolvedValue(null); // mock: user not found

      const res = await POST(loginRequest({ login: "nobody", password: "anything" }));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe("Invalid credentials.");
    });
  });

  // ─── Inactive account (fixture: inactive user) ───────

  describe("inactive account", () => {
    const user = fixture.users[2]; // is_active: false

    it("returns 403 for deactivated account", async () => {
      mockedFindFirst.mockResolvedValue(dbRow(user));

      const res = await POST(loginRequest({ login: user.username, password: user.password }));
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe("Account is deactivated.");
      expect(signTokenSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Edge cases ──────────────────────────────────────

  describe("edge cases", () => {
    it("returns 400 when login identifier is missing", async () => {
      const res = await POST(loginRequest({ password: "something" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("required");
    });

    it("returns 400 when password is missing", async () => {
      const res = await POST(loginRequest({ login: "someone" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("required");
    });

    it("returns 400 when body is empty object", async () => {
      const res = await POST(loginRequest({}));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("required");
    });

    it("returns 400 for malformed JSON body", async () => {
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-valid-json",
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("Invalid JSON");
    });

    it("returns 400 when both fields are empty strings", async () => {
      const res = await POST(loginRequest({ login: "", password: "" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("required");
    });

    it("returns 400 when both fields are null", async () => {
      const res = await POST(loginRequest({ login: null, password: null }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain("required");
    });

    it("trims whitespace from login identifier", async () => {
      const user = fixture.users[0];
      mockedFindFirst.mockResolvedValue(dbRow(user));
      mockedUpdate.mockResolvedValue({});

      const res = await POST(
        loginRequest({ login: `  ${user.username}  `, password: user.password }),
      );

      expect(res.status).toBe(200);
      // Verify trimmed username was passed to prisma
      expect(mockedFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([expect.objectContaining({ username: user.username })]),
          }),
        }),
      );
    });

    it("does not call prisma.user.update on failed login", async () => {
      mockedFindFirst.mockResolvedValue(null);

      await POST(loginRequest({ login: "ghost", password: "nope" }));

      expect(mockedUpdate).not.toHaveBeenCalled();
    });
  });
});
