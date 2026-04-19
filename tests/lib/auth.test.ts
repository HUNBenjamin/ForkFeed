import {
  signToken,
  verifyToken,
  extractBearerToken,
  authenticateRequest,
  requireAdmin,
} from "../../lib/auth";
import fixture from "../fixtures/users.json";

// Mock prisma so DB-dependent functions can be tested
jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    denylistedToken: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from "../../lib/prisma";

const mockedFindUnique = prisma.denylistedToken.findUnique as jest.Mock;

// --- extractBearerToken (pure) ---

describe("extractBearerToken", () => {
  it("extracts token from a valid Bearer header", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("returns null when header is null", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });
});

// --- signToken / verifyToken (pure crypto, no DB) ---

describe("signToken / verifyToken", () => {
  const user = fixture.users[0]; // admin

  it("produces a JWT that verifyToken can decode", () => {
    const token = signToken(user);
    const payload = verifyToken(token);

    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe(user.id);
    expect(payload!.username).toBe(user.username);
    expect(payload!.role).toBe(user.role);
    expect(typeof payload!.jti).toBe("string");
  });

  it("returns null for a garbage string", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
  });

  it("returns null for a tampered token", () => {
    const token = signToken(user);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyToken(tampered)).toBeNull();
  });
});

// --- authenticateRequest (needs prisma mock) ---

describe("authenticateRequest", () => {
  const user = fixture.users[1]; // regular user

  beforeEach(() => mockedFindUnique.mockReset());

  it("returns payload for a valid, non-denylisted token", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const token = signToken(user);
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await authenticateRequest(req);
    expect("sub" in result).toBe(true);
    expect((result as { sub: number }).sub).toBe(user.id);
  });

  it("returns 401 error when Authorization header is missing", async () => {
    const req = new Request("http://localhost/api/test");
    const result = await authenticateRequest(req);
    expect(result).toEqual({
      error: "Missing or malformed Authorization header.",
      status: 401,
    });
  });

  it("returns 401 error when token is denylisted", async () => {
    mockedFindUnique.mockResolvedValue({ jti: "x", expires_at: new Date() });

    const token = signToken(user);
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await authenticateRequest(req);
    expect(result).toEqual({ error: "Token has been invalidated.", status: 401 });
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });

  it("returns 401 error for an invalid token", async () => {
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer bad.token.value" },
    });

    const result = await authenticateRequest(req);
    expect(result).toEqual({ error: "Invalid or expired token.", status: 401 });
  });
});

// --- requireAdmin (needs prisma mock) ---

describe("requireAdmin", () => {
  beforeEach(() => mockedFindUnique.mockReset());

  it("returns payload when user is admin", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const token = signToken(fixture.users[0]); // admin
    const req = new Request("http://localhost/api/admin", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await requireAdmin(req);
    expect("sub" in result).toBe(true);
    expect((result as { role: string }).role).toBe("admin");
  });

  it("returns 403 when user is not admin", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const token = signToken(fixture.users[1]); // regular user
    const req = new Request("http://localhost/api/admin", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await requireAdmin(req);
    expect(result).toEqual({ error: "Admin access required.", status: 403 });
  });
});

// --- additional tests ---

describe("signToken", () => {
  it("generates unique jti for each token", () => {
    const user = fixture.users[0];
    const token1 = signToken(user);
    const token2 = signToken(user);
    const p1 = verifyToken(token1)!;
    const p2 = verifyToken(token2)!;
    expect(p1.jti).not.toBe(p2.jti);
  });

  it("includes iat and exp claims", () => {
    const token = signToken(fixture.users[0]);
    const payload = verifyToken(token)!;
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
});

describe("extractBearerToken edge cases", () => {
  it("returns empty string when header is 'Bearer ' with no token", () => {
    expect(extractBearerToken("Bearer ")).toBe("");
  });
});
