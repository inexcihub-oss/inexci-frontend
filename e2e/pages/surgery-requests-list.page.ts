import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object para a listagem/kanban de solicitações cirúrgicas.
 */
export class SurgeryRequestsListPage {
  readonly page: Page;
  readonly kanbanBoard: Locator;
  readonly listViewButton: Locator;
  readonly kanbanViewButton: Locator;
  readonly newRequestButton: Locator;
  readonly filterDoctorSelect: Locator;
  readonly filterHealthPlanSelect: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    // O kanban board — container principal
    this.kanbanBoard = page.locator('[data-testid="kanban-board"], .kanban-board').first();
    // Botões de alternância de visão
    this.listViewButton = page.getByRole("button", { name: /lista/i });
    this.kanbanViewButton = page.getByRole("button", { name: /kanban/i });
    // Botão de nova solicitação
    this.newRequestButton = page.getByRole("button", { name: /nova solicitação/i });
    // Filtros
    this.filterDoctorSelect = page.locator('[data-testid="filter-doctor"], select[name="doctor"]').first();
    this.filterHealthPlanSelect = page.locator('[data-testid="filter-health-plan"]').first();
    this.searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="pesquisar"]').first();
  }

  async goto() {
    await this.page.goto("/solicitacoes-cirurgicas");
  }

  /** Retorna todos os cards de solicitação visíveis */
  getSurgeryCards() {
    return this.page.locator('[data-testid="surgery-card"], .surgery-card, .kanban-card');
  }

  /** Retorna card por texto de paciente */
  getCardByPatient(patientName: string) {
    return this.page.locator(`text="${patientName}"`).first();
  }

  /** Retorna colunas do kanban */
  getKanbanColumns() {
    return this.page.locator('[data-testid="kanban-column"], .kanban-column');
  }

  async switchToListView() {
    await this.listViewButton.click();
  }

  async switchToKanbanView() {
    await this.kanbanViewButton.click();
  }

  async openNewRequestModal() {
    await this.newRequestButton.click();
    await expect(this.page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  }

  async clickCard(patientName: string) {
    await this.getCardByPatient(patientName).click();
  }

  async expectPageLoaded() {
    await expect(this.page).toHaveURL(/solicitacoes-cirurgicas/);
    // Aguarda o spinner/loading sumir
    await this.page.waitForLoadState("networkidle");
  }

  /** Aguarda que pelo menos um card de solicitação apareça */
  async expectCardsVisible(minCount = 1) {
    const cards = this.getSurgeryCards();
    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }
}
