import request from "supertest";

const API = "http://localhost:8080";

// Seeded test credentials (from data/mongo.bat)
const ADMIN = { login: "admin", password: "admin1234" };
const USER = { login: "chefmari", password: "password123" };

describe("Auth API", () => {
  let adminToken: string;
  let userToken: string;

  // ── Login ────────────────────────────────────────────────

  describe("POST /api/auth/login", () => {
    it("returns a token on valid admin credentials", async () => {
      const res = await request(API)
        .post("/api/auth/login")
        .send({ login: ADMIN.login, password: ADMIN.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(typeof res.body.token).toBe("string");
      expect(res.body.user).toMatchObject({
        username: "admin",
        role: "admin",
      });

      adminToken = res.body.token;
    });

    it("returns a token on valid user credentials", async () => {
      const res = await request(API)
        .post("/api/auth/login")
        .send({ login: USER.login, password: USER.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        username: "chefmari",
        role: "user",
      });

      userToken = res.body.token;
    });

    it("returns 401 for wrong password", async () => {
      const res = await request(API)
        .post("/api/auth/login")
        .send({ login: ADMIN.login, password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 401 for non-existent user", async () => {
      const res = await request(API)
        .post("/api/auth/login")
        .send({ login: "nonexistentuser", password: "whatever123" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials.");
    });

    it("returns 400 when login identifier is missing", async () => {
      const res = await request(API).post("/api/auth/login").send({ password: "something" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 400 when password is missing", async () => {
      const res = await request(API).post("/api/auth/login").send({ login: ADMIN.login });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ── Protected route: GET /api/auth/me ────────────────────

  describe("GET /api/auth/me", () => {
    it("returns user profile with a valid token", async () => {
      const res = await request(API)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        username: "chefmari",
        role: "user",
      });
      expect(res.body.user).toHaveProperty("email");
      expect(res.body.user).toHaveProperty("created_at");
    });

    it("returns 401 without Authorization header", async () => {
      const res = await request(API).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Missing or malformed Authorization header.");
    });

    it("returns 401 with an invalid token", async () => {
      const res = await request(API)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token.value");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ── Register ─────────────────────────────────────────────

  describe("POST /api/auth/register", () => {
    const unique = `testuser_${Date.now()}`;

    it("creates a new user and returns a token", async () => {
      const res = await request(API)
        .post("/api/auth/register")
        .send({
          username: unique,
          email: `${unique}@test.com`,
          password: "TestPass123",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        username: unique,
        email: `${unique}@test.com`,
        role: "user",
      });
    });

    it("returns 409 for duplicate username", async () => {
      const res = await request(API).post("/api/auth/register").send({
        username: unique,
        email: "other@test.com",
        password: "TestPass123",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("already in use");
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(API).post("/api/auth/register").send({ username: "incomplete" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 400 when password is too short", async () => {
      const res = await request(API)
        .post("/api/auth/register")
        .send({
          username: `short_${Date.now()}`,
          email: `short_${Date.now()}@test.com`,
          password: "abc",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("at least 8 characters");
    });
  });

  // ── Admin-only route: GET /api/meta/roles ────────────────

  describe("GET /api/meta/roles (admin-only)", () => {
    it("returns roles when authenticated as admin", async () => {
      const res = await request(API)
        .get("/api/meta/roles")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.roles).toEqual(expect.arrayContaining(["user", "admin"]));
    });

    it("returns 403 when authenticated as regular user", async () => {
      const res = await request(API)
        .get("/api/meta/roles")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Admin access required.");
    });

    it("returns 401 without token", async () => {
      const res = await request(API).get("/api/meta/roles");

      expect(res.status).toBe(401);
    });
  });
});
