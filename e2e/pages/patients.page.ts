import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object para a tela de pacientes.
 */
export class PatientsPage {
  readonly page: Page;
  readonly newPatientButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newPatientButton = page.getByRole("button", { name: /novo paciente|adicionar paciente/i });
    this.searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="pesquisar"]').first();
  }

  async goto() {
    await this.page.goto("/pacientes");
  }

  getPatientRow(name: string) {
    return this.page.locator(`text="${name}"`).first();
  }

  getDeleteButton(name: string) {
    return this.getPatientRow(name).locator("..").getByRole("button", { name: /excluir|deletar/i });
  }

  getEditButton(name: string) {
    return this.getPatientRow(name).locator("..").getByRole("button", { name: /editar/i });
  }

  async openNewPatientModal() {
    await this.newPatientButton.click();
    await expect(this.page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  }

  async fillPatientForm(data: { name: string; cpf?: string; email?: string }) {
    const dialog = this.page.getByRole("dialog");
    await dialog.locator('input[name="name"], input[placeholder*="nome"]').first().fill(data.name);
    if (data.cpf) {
      await dialog.locator('input[name="cpf"], input[placeholder*="CPF"]').first().fill(data.cpf);
    }
    if (data.email) {
      await dialog.locator('input[name="email"], input[type="email"]').first().fill(data.email);
    }
  }

  async saveForm() {
    const dialog = this.page.getByRole("dialog");
    await dialog.getByRole("button", { name: /salvar|cadastrar|confirmar/i }).click();
  }

  async confirmDelete() {
    const confirmModal = this.page.getByRole("dialog");
    await confirmModal.getByRole("button", { name: /confirmar|excluir|sim/i }).click();
  }

  async expectPatientVisible(name: string) {
    await expect(this.getPatientRow(name)).toBeVisible({ timeout: 5_000 });
  }

  async expectPatientNotVisible(name: string) {
    await expect(this.getPatientRow(name)).not.toBeVisible({ timeout: 5_000 });
  }
}
