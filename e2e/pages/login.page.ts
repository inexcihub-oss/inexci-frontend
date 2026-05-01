import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object para a tela de login (/login).
 * Encapsula todos os seletores e ações da página.
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    // Botão de submit — busca pelo tipo e texto
    this.submitButton = page.getByRole("button", { name: /entrar/i });
    // Mensagem de erro (texto vermelho inline no formulário)
    this.errorMessage = page.locator("text=/erro|credenciais|inválid/i").first();
    this.successMessage = page.locator("text=/sucesso|criada/i").first();
    this.forgotPasswordLink = page.getByRole("link", { name: /esqueci|recuperar/i });
    this.registerLink = page.getByRole("link", { name: /cadastro|criar conta/i });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible({ timeout: 5_000 });
  }

  async expectRedirectedToDashboard() {
    await expect(this.page).toHaveURL(/solicitacoes-cirurgicas/, { timeout: 10_000 });
  }

  async expectStillOnLogin() {
    await expect(this.page).toHaveURL(/login/, { timeout: 5_000 });
  }
}
