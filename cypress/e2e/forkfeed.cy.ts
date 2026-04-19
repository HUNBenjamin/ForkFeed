const BASE_URL = "https://forkfeed.vercel.app";

describe("Authentication", () => {
  beforeEach(() => {
    cy.visit(`${BASE_URL}/pages/login`);
  });

  it("shows validation errors for empty fields", () => {
    cy.get('button[type="submit"]').contains("Bejelentkezés").click();
    cy.get(".text-error").should("have.length.at.least", 2);
    cy.get("#login").should("have.class", "input-error");
    cy.get("#password").should("have.class", "input-error");
  });

  it("shows error message for invalid credentials", () => {
    cy.get("#login").type("nonexistent@test.com");
    cy.get("#password").type("WrongPassword123!");
    cy.get('button[type="submit"]').contains("Bejelentkezés").click();
    cy.get(".alert-error", { timeout: 10000 }).should("be.visible");
  });
});

describe("Main Feed", () => {
  beforeEach(() => {
    cy.visit(`${BASE_URL}/pages/main`);
  });

  it("loads the main page with header and recipe cards", () => {
    cy.contains("h1", "🍴 ForkFeed").should("be.visible");
    cy.get(".card", { timeout: 15000 }).should("have.length.at.least", 1);
    cy.get(".card .card-title").first().should("not.be.empty");
  });

  it("displays search input and filter controls", () => {
    cy.get('input[placeholder*="Keresés"]').should("be.visible");
    cy.get("select.select-bordered").should("exist");
  });

  it("can filter recipes by search term", () => {
    cy.get('input[placeholder*="Keresés"]').type("sajt");
    cy.get(".card", { timeout: 10000 }).should("have.length.at.least", 1);
    cy.get(".card .card-title").first().invoke("text").should("match", /sajt/i);
  });
});

describe("Navigation", () => {
  it("navigates from main page to login page", () => {
    cy.visit(`${BASE_URL}/pages/main`);
    cy.contains("a", "Bejelentkezés").click();
    cy.url().should("include", "/pages/login");
    cy.contains("h2", "Bejelentkezés").should("be.visible");
  });

  it("navigates from login page back to main page", () => {
    cy.visit(`${BASE_URL}/pages/login`);
    cy.contains("a", "Vissza a főoldalra").click();
    cy.url().should("include", "/pages/main");
    cy.contains("h1", "🍴 ForkFeed").should("be.visible");
  });

  it("navigates to a recipe detail page", () => {
    cy.visit(`${BASE_URL}/pages/main`);
    cy.get(".card", { timeout: 15000 }).first().click();
    cy.url().should("include", "/pages/recipe/");
  });
});
