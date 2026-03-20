import { useState } from "react";
import { HomePage } from "./pages/HomePage";
import { RoomPage } from "./pages/RoomPage";
import { RetroPage } from "./pages/RetroPage";
import type { JoinRoomPayload } from "../../server/src/types";

type Screen =
  | { name: "home" }
  | { name: "room"; payload: JoinRoomPayload }
  | { name: "retro"; retroId: string; userName: string; userEmail: string };

function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  if (screen.name === "room") {
    return (
      <RoomPage
        joinPayload={screen.payload}
        onLeave={() => setScreen({ name: "home" })}
      />
    );
  }

  if (screen.name === "retro") {
    return (
      <RetroPage
        retroId={screen.retroId}
        name={screen.userName}
        email={screen.userEmail}
        onLeave={() => setScreen({ name: "home" })}
      />
    );
  }

  return (
    <HomePage
      onJoin={(params) =>
        setScreen({ name: "room", payload: params })
      }
      onJoinRetro={(params) =>
        setScreen({ name: "retro", retroId: params.retroId, userName: params.name, userEmail: params.email })
      }
    />
  );
}

export default App;
