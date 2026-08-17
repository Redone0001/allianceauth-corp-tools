import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import CharacterDoctrine from "./Doctrines";

vi.mock("../../Components/EveImages/EveImages", () => ({
  CharacterAllegiancePortrait: () => <div data-testid="character-portrait" />,
}));

vi.mock("../../api/character", () => ({
  getAccountDoctrines: vi.fn(() =>
    Promise.resolve([
      {
        character: {
          character_id: 1,
          character_name: "Pilot One",
          corporation_id: 1,
          corporation_name: "Test Corp",
        },
        doctrines: {
          Tackle: {
            _meta: { total_sp: 100, trained_sp: 100, categories: ["Fleet", "PvP"] },
          },
          Logistics: {
            _meta: { total_sp: 100, trained_sp: 100, categories: ["Fleet"] },
          },
          Mining: {
            _meta: { total_sp: 100, trained_sp: 100, categories: ["Industry"] },
          },
          Magic: {
            _meta: { total_sp: 100, trained_sp: 100, categories: [] },
          },
        },
        skills: {},
      },
    ]),
  ),
}));

vi.mock("../../Components/Skills/DoctrineModal", () => ({
  DoctrineModal: () => <div data-testid="doctrine-modal" />,
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/1"]}>
        <Routes>
          <Route path="/:characterID" element={<CharacterDoctrine />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("CharacterDoctrine", () => {
  it("requires doctrines to match all selected categories", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Tackle")).toBeInTheDocument();
    expect(screen.getByText("Logistics")).toBeInTheDocument();
    expect(screen.getByText("Mining")).toBeInTheDocument();
    expect(screen.getByText("Magic")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Fleet"));

    await waitFor(() => {
      expect(screen.getByText("Tackle")).toBeInTheDocument();
      expect(screen.getByText("Logistics")).toBeInTheDocument();
      expect(screen.queryByText("Mining")).not.toBeInTheDocument();
      expect(screen.queryByText("Magic")).not.toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("PvP"));

    await waitFor(() => {
      expect(screen.getByText("Tackle")).toBeInTheDocument();
      expect(screen.queryByText("Logistics")).not.toBeInTheDocument();
      expect(screen.queryByText("Mining")).not.toBeInTheDocument();
      expect(screen.queryByText("Magic")).not.toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Fleet"));
    await user.click(screen.getByLabelText("PvP"));
    await user.click(screen.getByLabelText("Other"));

    await waitFor(() => {
      expect(screen.queryByText("Tackle")).not.toBeInTheDocument();
      expect(screen.queryByText("Logistics")).not.toBeInTheDocument();
      expect(screen.queryByText("Mining")).not.toBeInTheDocument();
      expect(screen.getByText("Magic")).toBeInTheDocument();
    });
  });
});
