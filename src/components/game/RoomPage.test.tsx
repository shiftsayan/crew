import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MissionlessRoomFallback } from "./RoomPage";

describe("MissionlessRoomFallback", () => {
  it("asks the player to have an admin assign a mission", () => {
    const markup = renderToStaticMarkup(<MissionlessRoomFallback />);

    expect(markup).toContain("Mission needed");
    expect(markup).toContain("Ask the room admin to set a mission.");
    expect(markup).toContain('role="status"');
  });
});
