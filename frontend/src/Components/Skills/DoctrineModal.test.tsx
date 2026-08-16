import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DoctrineModal } from "./DoctrineModal";

describe("DoctrineModal", () => {
  it("can include trained skills alongside missing skills", async () => {
    const user = userEvent.setup();

    render(
      <DoctrineModal
        show
        setShow={() => undefined}
        name="Rifter"
        skill_reqs={{ Navigation: 5 }}
        all_skill_reqs={{ Navigation: 5, Afterburner: 4 }}
        skill_list={{
          Navigation: { active_level: 3, trained_level: 3 },
          Afterburner: { active_level: 4, trained_level: 4 },
        }}
      />,
    );

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.queryByText("Afterburner")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Show Trained Skills"));

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Afterburner")).toBeInTheDocument();
    expect(screen.getByText("Rifter - Required Skills")).toBeInTheDocument();
  });

  it("shows all requirements immediately for a completed skill list", () => {
    render(
      <DoctrineModal
        show
        setShow={() => undefined}
        name="Rifter"
        skill_reqs={{}}
        all_skill_reqs={{ Navigation: 5 }}
        skill_list={{ Navigation: { active_level: 5, trained_level: 5 } }}
      />,
    );

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Rifter - Required Skills")).toBeInTheDocument();
    expect(screen.getByLabelText("Show Trained Skills")).toBeChecked();
  });

  it("shows a disabled switch when there are no trained requirements to reveal", () => {
    render(
      <DoctrineModal
        show
        setShow={() => undefined}
        name="Rifter"
        skill_reqs={{ Navigation: 5 }}
        all_skill_reqs={{ Navigation: 5 }}
        skill_list={{ Navigation: { active_level: 0, trained_level: 0 } }}
      />,
    );

    expect(screen.getByLabelText("Show Trained Skills")).toBeDisabled();
  });
});
