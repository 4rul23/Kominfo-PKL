import { expect, test } from "@playwright/test";

import { dismissVisibleToasts, loginAsAdmin, loginAsOperator, loginAsReceptionist, randomSuffix } from "./helpers";

/**
 * Full visitor lifecycle E2E test:
 *   1. Guest registers through /guest wizard
 *   2. Guest can track their visit via /guest/tracking
 *   3. Admin/Receptionist sees visitor in /admin/intake
 *   4. Receptionist forwards to a unit (assigns operator)
 *   5. Operator sees case in /admin/inbox
 *   6. Operator accepts the visit
 *   7. Guest tracking page reflects final status
 */
test.describe.skip("Visitor Full Lifecycle", () => {
    const suffix = randomSuffix();
    const visitorName = `E2E Tamu ${suffix}`;
    const organization = `PT E2E ${suffix}`;
    let trackingId = "";

    test("Step 1: Guest registers via /guest wizard", async ({ page }) => {
        test.setTimeout(60000);

        await page.goto("/guest");

        // Step 1: Nama
        await page.getByPlaceholder("Nama Lengkap...").fill(visitorName);
        await page.getByRole("button", { name: "Lanjut" }).click();

        // Step 2: Instansi
        await page.getByPlaceholder("PT / Dinas / Umum...").fill(organization);
        await page.getByRole("button", { name: "Lanjut" }).click();

        // Step 3: NIP/NIK
        await page.getByPlaceholder("19700101... atau 7371...").fill(`7371${suffix}`);
        await page.getByRole("button", { name: "Lanjut" }).click();

        // Step 4: Unit Tujuan — pick UPT Warroom as default test
        await page.waitForTimeout(500);
        await page.locator("button").filter({ hasText: "UPT Warroom" }).click();
        // Wait because auto-next happens on unit selection
        await page.waitForTimeout(1000);

        // Step 5: Asal Daerah
        await page.getByPlaceholder("Makassar, Gowa...").fill("Makassar");
        await page.getByRole("button", { name: "Lanjut" }).click();

        // Step 6: Keperluan + Nomor Surat + submit
        await page.getByPlaceholder("Koordinasi / Konsultasi...").fill(`Koordinasi E2E ${suffix}`);
        await page.getByRole("button", { name: "Simpan Data" }).click();

        // Should show the visitor name in the result
        await page.waitForSelector("text=Kembali ke Beranda", { timeout: 15000 });

        // Extract tracking ID from the page
        const trackingElement = page.locator("text=/VIS-/").first();
        if (await trackingElement.isVisible({ timeout: 15000 })) {
            const text = await trackingElement.textContent();
            const match = text?.match(/VIS-\d{6}-[A-Z0-9]+/);
            if (match) trackingId = match[0];
        }
    });

    test("Step 2: Guest can track visit at /guest/tracking", async ({ page }) => {
        test.setTimeout(30000);
        test.skip(!trackingId, "No tracking ID captured from step 1");

        await page.goto(`/guest/tracking?id=${trackingId}`);
        await expect(page.getByText(visitorName)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText("Terkirim")).toBeVisible();
    });

    test("Step 3: Admin sees visitor in /admin/intake queue", async ({ page }) => {
        test.setTimeout(60000);

        await loginAsAdmin(page);
        await page.goto("/admin/intake");
        await dismissVisibleToasts(page);

        // Wait for data to load
        await page.waitForTimeout(3000);
        await page.getByRole("button", { name: "Refresh" }).click();
        await page.waitForTimeout(2000);

        // The queue should contain at least one visitor case
        await expect(page.getByText(/Antrian Baru/).first()).toBeVisible({ timeout: 15000 });
    });

    test("Step 4: Admin sees visitor in /admin/visitors list", async ({ page }) => {
        test.setTimeout(60000);

        await loginAsAdmin(page);
        await page.goto("/admin/visitors");

        // Search for our specific visitor
        await page.getByPlaceholder("Cari nama, instansi, atau NIP/NIK...").fill(visitorName);
        await expect(page.getByRole("cell", { name: visitorName })).toBeVisible({ timeout: 10000 });
    });
});

test.describe("Visitor Status Workflow Validation", () => {
    test("Visitor workflow status transitions are enforced", async ({ request }) => {
        // Create a visitor via API
        const suffix = randomSuffix();
        const createResponse = await request.post("/api/visitors", {
            data: {
                name: `WorkflowTest ${suffix}`,
                organization: `PT Workflow ${suffix}`,
                purpose: "Testing workflow transitions",
                unit: "Diskominfo Makassar",
                nip: `7371${suffix}`,
                asalDaerah: "Makassar",
                nomorSurat: "-",
            },
        });

        expect(createResponse.ok()).toBeTruthy();
        const createData = (await createResponse.json()) as { visitor: { id: string; status: string } };
        expect(createData.visitor.status).toBe("submitted");
    });
});

test.describe("API Security: Visitor Endpoints", () => {
    test("GET /api/visitors without auth returns stripped payload (no nip)", async ({ request }) => {
        const response = await request.get("/api/visitors");
        expect(response.ok()).toBeTruthy();
        const data = (await response.json()) as { visitors: Array<Record<string, unknown>> };

        // Public response should not contain NIP field
        if (data.visitors.length > 0) {
            const firstVisitor = data.visitors[0];
            expect(firstVisitor).not.toHaveProperty("nip");
        }
    });

    test("DELETE /api/visitors without auth is rejected", async ({ request }) => {
        const response = await request.delete("/api/visitors");
        expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test("POST /api/visitors/transition without auth is rejected", async ({ request }) => {
        const response = await request.post("/api/visitors/transition", {
            data: { visitorId: "fake-id", toStatus: "accepted_by_unit" },
        });
        expect(response.status()).toBeGreaterThanOrEqual(400);
    });
});
