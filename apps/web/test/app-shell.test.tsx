import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { renderApp } from "./app.tsx";

test("toggles between light and dark from the header button", async () => {
  const user = userEvent.setup();
  renderApp("/");
  const toggle = await screen.findByRole("button", { name: "Toggle theme" });
  const { classList } = document.documentElement;
  expect(classList.contains("light")).toBe(true);

  await user.click(toggle);
  expect(classList.contains("dark")).toBe(true);
  expect(localStorage.getItem("theme")).toBe("dark");

  await user.click(toggle);
  expect(classList.contains("light")).toBe(true);
});
