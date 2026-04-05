import React, { useState } from "react";
import { supabase } from "../lib/supabase";

const IntentTest = () => {
  const [intent, setIntent] = useState("Explore");

  const saveIntent = async () => {
    await supabase.from("session_intents").insert([
      { room_id: "test-room", intent }
    ]);

    console.log("Saved:", intent);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Intent Test</h2>

      <select
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
      >
        <option value="Explore">Explore</option>
        <option value="Talk">Talk</option>
        <option value="Learn">Learn</option>
      </select>

      <button onClick={saveIntent} style={{ marginLeft: "10px" }}>
        Save Intent
      </button>
    </div>
  );
};

export default IntentTest;