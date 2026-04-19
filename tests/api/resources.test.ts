import request from "supertest";

const API = "http://localhost:8080";

// Seeded credentials
const ADMIN = { login: "admin", password: "admin1234" };
const USER = { login: "chefmari", password: "password123" };

describe("Resource API", () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const [adminRes, userRes] = await Promise.all([
      request(API).post("/api/auth/login").send(ADMIN),
      request(API).post("/api/auth/login").send(USER),
    ]);
    adminToken = adminRes.body.token;
    userToken = userRes.body.token;
  });

  // ── Health ───────────────────────────────────────────────

  describe("GET /api/health", () => {
    it("returns ok status with db info", async () => {
      const res = await request(API).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "ok", db: "ok" });
      expect(res.body).toHaveProperty("timestamp");
    });
  });

  // ── Categories (GET + POST) ──────────────────────────────

  describe("Categories", () => {
    it("GET /api/categories returns a list", async () => {
      const res = await request(API).get("/api/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThan(0);

      const cat = res.body.categories[0];
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("name");
    });

    it("GET /api/categories supports query filter", async () => {
      const res = await request(API).get("/api/categories?query=leves");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
    });

    it("POST /api/categories creates a category (admin)", async () => {
      const name = `TestCat_${Date.now()}`;
      const res = await request(API)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name, description: "Automated test category" });

      expect(res.status).toBe(201);
      expect(res.body.category).toMatchObject({ name });
      expect(res.body.category).toHaveProperty("id");
    });

    it("POST /api/categories returns 400 without name", async () => {
      const res = await request(API)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ description: "no name" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("name is required.");
    });

    it("POST /api/categories returns 403 for regular user", async () => {
      const res = await request(API)
        .post("/api/categories")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "Should fail" });

      expect(res.status).toBe(403);
    });
  });

  // ── Tags (GET + POST) ───────────────────────────────────

  describe("Tags", () => {
    it("GET /api/tags returns a list", async () => {
      const res = await request(API).get("/api/tags");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tags)).toBe(true);
      expect(res.body.tags.length).toBeGreaterThan(0);

      const tag = res.body.tags[0];
      expect(tag).toHaveProperty("id");
      expect(tag).toHaveProperty("name");
    });

    it("POST /api/tags creates a tag (admin)", async () => {
      const name = `testtag_${Date.now()}`;
      const res = await request(API)
        .post("/api/tags")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name });

      expect(res.status).toBe(201);
      expect(res.body.tag).toMatchObject({ name });
    });

    it("POST /api/tags returns 400 without name", async () => {
      const res = await request(API)
        .post("/api/tags")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("name is required.");
    });
  });

  // ── Recipes (GET + POST) ─────────────────────────────────

  describe("Recipes", () => {
    let createdRecipeId: number;

    it("GET /api/recipes returns paginated list", async () => {
      const res = await request(API).get("/api/recipes?limit=5");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.recipes)).toBe(true);
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.pagination).toHaveProperty("total");
      expect(res.body.pagination).toHaveProperty("page");
    });

    it("POST /api/recipes creates a recipe (authenticated)", async () => {
      const res = await request(API)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: `Test Recipe ${Date.now()}`,
          preparation_time: 30,
          difficulty: "easy",
          description: "Automated test recipe",
          ingredients: [{ name: "Test ingredient", quantity: 1, unit: "db" }],
          steps: [{ step_number: 1, description: "Test step one" }],
        });

      expect(res.status).toBe(201);
      expect(res.body.recipe).toHaveProperty("id");
      expect(res.body.recipe.title).toContain("Test Recipe");
      expect(res.body.recipe.difficulty).toBe("easy");
      expect(res.body.recipe.author).toMatchObject({ username: "chefmari" });

      createdRecipeId = res.body.recipe.id;
    });

    it("POST /api/recipes returns 400 for missing required fields", async () => {
      const res = await request(API)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ description: "Missing title and difficulty" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });

    it("POST /api/recipes returns 400 for invalid difficulty", async () => {
      const res = await request(API)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "Bad difficulty",
          preparation_time: 10,
          difficulty: "impossible",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid difficulty");
    });

    it("POST /api/recipes returns 401 without auth", async () => {
      const res = await request(API)
        .post("/api/recipes")
        .send({ title: "No auth", preparation_time: 10, difficulty: "easy" });

      expect(res.status).toBe(401);
    });

    it("GET /api/recipes/:id returns created recipe", async () => {
      const res = await request(API).get(`/api/recipes/${createdRecipeId}`);

      expect(res.status).toBe(200);
      expect(res.body.recipe).toHaveProperty("title");
      expect(res.body.recipe.id).toBe(createdRecipeId);
    });
  });

  // ── Meta endpoints ──────────────────────────────────────

  describe("GET /api/meta/difficulties", () => {
    it("returns difficulty options", async () => {
      const res = await request(API).get("/api/meta/difficulties");

      expect(res.status).toBe(200);
      expect(res.body.difficulties).toEqual(["easy", "medium", "hard"]);
    });
  });

  // ── Search suggestions ──────────────────────────────────

  describe("GET /api/search/suggestions", () => {
    it("returns suggestions for a query", async () => {
      const res = await request(API).get("/api/search/suggestions?q=lev");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("recipes");
      expect(res.body).toHaveProperty("categories");
      expect(res.body).toHaveProperty("tags");
    });

    it("returns empty results for empty query", async () => {
      const res = await request(API).get("/api/search/suggestions?q=");

      expect(res.status).toBe(200);
      expect(res.body.recipes).toEqual([]);
    });
  });
});
