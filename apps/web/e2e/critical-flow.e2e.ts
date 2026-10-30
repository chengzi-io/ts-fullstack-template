import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const AUTHOR_NAME = "Ada Lovelace";
const POST_TITLE = "Hello from Playwright";
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** axe on the rendered page: WCAG 2.1 A/AA, including contrast. */
async function expectAccessible(page: Page) {
  // Mid fade-in, a dialog blends with the backdrop and fails contrast.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getTiming().iterations !==
            Number.POSITIVE_INFINITY
        )
        .map((animation) => animation.finished)
    )
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  expect(
    violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target).join(", ")}`
    )
  ).toEqual([]);
}

test("creates an author, posts for it, and lists the post", async ({
  page,
}) => {
  await page.goto("/authors");
  await expect(page.getByText("No authors yet")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { exact: true, name: "New" }).click();

  const authorDialog = page.getByRole("dialog", { name: "New author" });
  await expect(authorDialog.getByLabel("Name")).toBeVisible();
  await expectAccessible(page);
  await authorDialog.getByLabel("Name").fill(AUTHOR_NAME);
  await authorDialog.getByRole("button", { name: "Create author" }).click();

  await expect(authorDialog).toBeHidden();
  await expect(
    page.getByRole("row").filter({ hasText: AUTHOR_NAME })
  ).toBeVisible();

  await page.getByRole("link", { name: "Posts" }).click();
  await page.getByRole("button", { exact: true, name: "New" }).click();

  const postDialog = page.getByRole("dialog", { name: "New post" });
  const authorField = postDialog.getByLabel("Author");
  await expect(authorField).toBeVisible();
  await expectAccessible(page);
  await authorField.fill("Ada");
  await page.getByRole("option", { name: AUTHOR_NAME }).click();
  await postDialog.getByLabel("Title").fill(POST_TITLE);
  await postDialog.getByRole("button", { name: "Create post" }).click();

  await expect(postDialog).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: POST_TITLE });
  await expect(row).toContainText(AUTHOR_NAME);
  await expectAccessible(page);

  // A reload reads the row back from the host, not from the query cache.
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: POST_TITLE })
  ).toContainText(AUTHOR_NAME);
});
