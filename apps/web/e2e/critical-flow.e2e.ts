import { expect, test } from "@playwright/test";

const AUTHOR_NAME = "Ada Lovelace";
const POST_TITLE = "Hello from Playwright";

test("creates an author, posts for it, and lists the post", async ({
  page,
}) => {
  await page.goto("/authors");
  await page.getByRole("button", { exact: true, name: "New" }).click();

  const authorDialog = page.getByRole("dialog", { name: "New author" });
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
  await authorField.fill("Ada");
  await page.getByRole("option", { name: AUTHOR_NAME }).click();
  await postDialog.getByLabel("Title").fill(POST_TITLE);
  await postDialog.getByRole("button", { name: "Create post" }).click();

  await expect(postDialog).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: POST_TITLE });
  await expect(row).toContainText(AUTHOR_NAME);

  // A reload reads the row back from the host, not from the query cache.
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: POST_TITLE })
  ).toContainText(AUTHOR_NAME);
});
