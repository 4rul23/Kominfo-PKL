import { expect, test } from "@playwright/test";

import { dismissVisibleToasts, loginAsAdmin, randomSuffix } from "./helpers";

test("admin notifications page can read and clear notifications", async ({ page }) => {
  const suffix = randomSuffix();
  const title = `QA Notification ${suffix}`;

  await loginAsAdmin(page);

  await page.evaluate(async (notificationTitle) => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const me = await response.json();
    const user = me.user;
    if (!user) throw new Error("No auth user");
    const create = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId: user.id,
        type: "note",
        title: notificationTitle,
        body: "Notification for QA test",
        link: "/admin",
      }),
    });
    if (!create.ok) throw new Error("Failed to create notification");
  }, title);

  await page.goto("/admin/notifications");
  await dismissVisibleToasts(page);
  await page.getByRole("button", { name: /Refresh/i }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Read/i }).first().click();
  await expect(page.getByText(/read/i).first()).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Hapus/i }).click();
  await expect(page.getByText(/Tidak ada notifikasi/i)).toBeVisible({ timeout: 15000 });
});
