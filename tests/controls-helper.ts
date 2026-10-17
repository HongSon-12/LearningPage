import { expect, type Page, type Locator } from "@playwright/test";
export async function chooseSelect(
  page: Page,
  trigger: Locator,
  value: string,
) {
  await trigger.click();
  await page
    .getByRole("listbox")
    .locator(`[role="option"][data-value=${JSON.stringify(value)}]`)
    .click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}
