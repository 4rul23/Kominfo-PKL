import { expect, test } from "@playwright/test";

import { loginAsAdmin, loginAsOperator, loginAsReceptionist } from "./helpers";

test("operator is redirected away from admin-only pages", async ({ page }) => {
  await loginAsOperator(page);
  await page.goto("/admin/users");
  await expect(page.getByText("Tidak punya akses")).toBeVisible();

  await page.goto("/admin/org-units");
  await expect(page.getByText("Tidak punya akses")).toBeVisible();
});

test("receptionist cannot access operator inbox page", async ({ page }) => {
  await loginAsReceptionist(page);
  await page.goto("/admin/inbox");
  await expect(page.getByText("Tidak punya akses")).toBeVisible();
});

test("public user cannot access admin-protected staff API", async ({ page }) => {
  const response = await page.request.get("http://127.0.0.1:3100/api/staff-users");
  expect(response.status()).toBe(401);
});

test("admin can still access admin-only users page", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users (Staff)" })).toBeVisible();
});
