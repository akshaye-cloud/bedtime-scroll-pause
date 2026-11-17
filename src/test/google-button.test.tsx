// @vitest-environment-options { "url": "https://pause-clone.vercel.app/" }
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn() } },
}));

import { lovable } from "@/integrations/lovable/index";
import { GoogleButton } from "@/components/GoogleButton";

afterEach(cleanup);

describe("GoogleButton on a non-Lovable host", () => {
  it("shows a clear message and never starts Google sign-in", async () => {
    const errors: string[] = [];
    render(<GoogleButton label="Sign in with Google" onError={(m) => errors.push(m)} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(lovable.auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("bedtime-scroll-pause.lovable.app");
  });
});
