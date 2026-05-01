import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object para a página de detalhe da solicitação cirúrgica.
 */
export class SurgeryRequestDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(id: number | string) {
    await this.page.goto(`/solicitacao/${id}`);
  }

  // ── Informações gerais ──────────────────────────────────────────────────────

  getProtocol() {
    return this.page.locator("text=/000001|Protocolo/i").first();
  }

  getStatusBadge() {
    return this.page
      .locator('[data-testid="status-badge"], .status-badge, [class*="status"]')
      .first();
  }

  getPatientName() {
    return this.page.locator("text=/João Silva/").first();
  }

  // ── Botões de ação ──────────────────────────────────────────────────────────

  getSendButton() {
    return this.page.getByRole("button", { name: /enviar solicitação|enviar/i }).first();
  }

  getConfirmSendButton() {
    // Botão de confirmação dentro do modal de confirmação
    return this.page.getByRole("button", { name: /confirmar|sim/i }).last();
  }

  getAddActivityButton() {
    return this.page.getByRole("button", { name: /comentário|adicionar comentário|atividade/i }).first();
  }

  // ── Abas (tabs) ──────────────────────────────────────────────────────────────

  getTab(name: string) {
    return this.page.getByRole("tab", { name: new RegExp(name, "i") });
  }

  // ── Comentários / Atividades ─────────────────────────────────────────────────

  getActivityInput() {
    return this.page
      .locator('textarea[placeholder*="comentário"], textarea[placeholder*="observação"], [contenteditable]')
      .first();
  }

  getActivitySaveButton() {
    return this.page.getByRole("button", { name: /salvar|adicionar/i }).last();
  }

  getActivityItem(text: string) {
    return this.page.locator(`text="${text}"`).first();
  }

  // ── Modal de confirmação genérico ────────────────────────────────────────────

  getConfirmModal() {
    return this.page.getByRole("dialog");
  }

  getConfirmModalButton(label: RegExp | string) {
    return this.getConfirmModal().getByRole("button", { name: label });
  }

  // ── Assertions ──────────────────────────────────────────────────────────────

  async expectPageLoaded(requestId: number | string) {
    await expect(this.page).toHaveURL(new RegExp(`/solicitacao/${requestId}`));
    await this.page.waitForLoadState("networkidle");
  }

  async expectStatusVisible(statusText: string) {
    await expect(this.page.locator(`text="${statusText}"`).first()).toBeVisible({ timeout: 5_000 });
  }
}
