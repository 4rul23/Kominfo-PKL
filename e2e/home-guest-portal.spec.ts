import { expect, test } from "@playwright/test";

test("homepage portal lobi opens guest registration wizard instead of event flow", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Masuk ke Portal Lobi" }).click();

  await expect(page).toHaveURL(/\/guest$/);
  await expect(page.getByText("Buku Tamu")).toBeVisible();
  await expect(page.getByText("Siapa nama Anda?")).toBeVisible();
  await expect(page.getByPlaceholder("Nama Lengkap...")).toBeVisible();
  await expect(page.getByText(/Langkah 1 dari 8/)).toBeVisible();
});
