import { expect, test } from "@playwright/test";

test("brand review journey, reviewer decisions, history, and refresh", async ({
  page,
}) => {
  const brandName = `E2E Brand ${Date.now()}`;
  const email = `e2e-${Date.now()}@example.com`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Name").fill("E2E Reviewer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("playwright-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Account created.*Please sign in/)).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("playwright-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Good morning" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Content Checker", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Brand Guidelines", exact: true }).click();
  await page.getByLabel("Brand name").fill(brandName);
  await page.getByLabel("Preferred tone").fill("Friendly and professional");
  await page.getByLabel("Target audience").fill("Customers");
  await page.getByLabel("Preferred words").fill("Customer\nhelpful");
  await page.getByLabel("Restricted words").fill("Cheapest\nguaranteed");
  await page
    .getByLabel("Approved brand facts")
    .fill("Serving customers since 2015");
  await page.getByRole("button", { name: "Save guidelines" }).click();
  await expect(
    page.getByText(`${brandName} guidelines saved to the backend.`),
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("Preferred tone").fill("Warm, friendly, and professional");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Warm, friendly, and professional", { exact: true }).last(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Content Checker", exact: true }).click();
  await page.getByRole("button", { name: "Check Content" }).click();
  await expect(page.getByText("Enter a title for this content.")).toBeVisible();
  await page.getByLabel("Content title").fill("E2E homepage claim check");
  await page
    .getByLabel("Marketing content")
    .fill(
      "We are the cheapest company in India and guarantee 100% customer satisfaction. We have been serving customers since 2015.",
    );
  await page.getByRole("button", { name: "Check Content" }).click();

  await expect(
    page.getByRole("heading", { name: "E2E homepage claim check" }),
  ).toBeVisible();
  await expect(page.getByText("Approved facts found in content")).toBeVisible();
  await expect(page.getByText("“cheapest”", { exact: true })).toBeVisible();
  await expect(page.getByText("“guarantee”", { exact: true })).toBeVisible();
  await expect(page.getByText("“100%”", { exact: true })).toBeVisible();

  const cheapestIssue = page.locator("article").filter({ hasText: "cheapest" }).last();
  await cheapestIssue.getByRole("button", { name: "Accept suggestion" }).click();
  await expect(
    cheapestIssue.getByRole("button", { name: "Suggestion accepted" }),
  ).toBeVisible();

  const guaranteeIssue = page.locator("article").filter({ hasText: "guarantee" }).last();
  await guaranteeIssue.getByRole("button", { name: "Reject suggestion" }).click();
  await expect(
    guaranteeIssue.getByRole("button", { name: "Suggestion rejected" }),
  ).toBeVisible();

  const preferredIssue = page
    .locator("article")
    .filter({ hasText: "Not present: helpful" })
    .last();
  await preferredIssue.getByRole("button", { name: "Edit suggestion" }).click();
  await preferredIssue
    .getByLabel("Your suggested correction")
    .fill("Use helpful language and verify each customer claim.");
  await preferredIssue.getByRole("button", { name: "Save edited suggestion" }).click();
  await expect(
    preferredIssue.getByText("Use helpful language and verify each customer claim."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Mark as reviewed" }).last().click();
  await expect(page.getByText("You marked this check as reviewed")).toBeVisible();
  await page.getByRole("button", { name: "Approve content" }).click();
  await expect(
    page.getByText("You approved this content. It has not been published."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  const dashboardMetrics = page.getByRole("region", { name: "Review metrics" });
  await expect(
    dashboardMetrics.locator("article").filter({ hasText: "Total reviews" }),
  ).toContainText("1");
  await expect(
    dashboardMetrics.locator("article").filter({ hasText: "Approved content" }),
  ).toContainText("1");
  await expect(
    dashboardMetrics.locator("article").filter({ hasText: "Pending reviews" }),
  ).toContainText("0");

  await page.getByRole("button", { name: "Content Checker", exact: true }).click();
  await page.getByRole("button", { name: "Reopen as pending" }).click();
  await page.getByRole("button", { name: "Reject content" }).click();
  await expect(
    page.getByText("You rejected this content. It has not been published."),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Review History", exact: true }).click();
  const historyRow = page.getByRole("button", { name: new RegExp(brandName) });
  await expect(historyRow).toBeVisible();
  await expect(historyRow).toContainText("Rejected");
  await historyRow.click();
  await expect(
    page.getByRole("heading", { name: "E2E homepage claim check" }),
  ).toBeVisible();
  await expect(
    page.getByText("You rejected this content. It has not been published."),
  ).toBeVisible();

  await page.getByRole("button", { name: "AI Analysis" }).click();
  await page.getByLabel("Content title").fill("AI missing key check");
  await page.getByLabel("Marketing content").fill("A sentence for analysis.");
  await page.getByRole("button", { name: "Run AI Analysis" }).click();
  await expect(page.getByText(/AI analysis is not configured/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI missing key check" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByText("Sign in to your private review workspace"),
  ).toBeVisible();
});
