import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { GroupedCharacters } from "./GroupedCharacters";
import { getCharacterGroups } from "../../api/characterGroups";

vi.mock("../../api/characterGroups", () => ({
  groupQueryKey: () => ["groups"],
  getCharacterGroups: vi.fn(),
}));
const items = [1, 2, 3].map((id) => ({ character: { character_id: id }, name: `Pilot ${id}` }));
const renderView = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <GroupedCharacters items={items}>
          {(characters) => (
            <div>
              {characters.map((char) => (
                <p key={char.name}>{char.name}</p>
              ))}
            </div>
          )}
        </GroupedCharacters>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("GroupedCharacters", () => {
  it("switches views, keeps ungrouped characters, and supports overlapping groups", async () => {
    vi.mocked(getCharacterGroups).mockResolvedValue({
      can_edit: true,
      characters: [],
      groups: [
        { id: 1, name: "Miners", character_ids: [1, 2] },
        { id: 2, name: "Scouts", character_ids: [2] },
      ],
    });
    renderView();
    expect(screen.queryByText("Miners")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    const miners = (await screen.findByRole("heading", { name: "Miners" })).parentElement!;
    expect(within(miners).getByText("Pilot 1")).toBeInTheDocument();
    expect(screen.getAllByText("Pilot 2")).toHaveLength(2);
    const ungrouped = screen.getByRole("heading", { name: "Ungrouped" }).parentElement!;
    expect(within(ungrouped).getByText("Pilot 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    expect(screen.queryByText("Miners")).not.toBeInTheDocument();
    expect(screen.getAllByText("Pilot 2")).toHaveLength(1);
  });
  it("keeps regular view available when groups fail to load", async () => {
    vi.mocked(getCharacterGroups).mockRejectedValue(new Error("Unavailable"));
    renderView();
    await userEvent.click(screen.getByRole("switch"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load groups");
    expect(screen.getByText("Pilot 3")).toBeInTheDocument();
  });
});
