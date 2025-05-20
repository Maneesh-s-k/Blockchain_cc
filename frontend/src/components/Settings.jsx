import React from "react";

const Settings = ({ darkMode, setDarkMode }) => (
  <div style={{ padding: "2rem" }}>
    <h2>Settings</h2>
    <label style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <input
        type="checkbox"
        checked={darkMode}
        onChange={() => setDarkMode((prev) => !prev)}
        style={{ width: "1.2rem", height: "1.2rem" }}
      />
      Dark Mode
    </label>
    <p style={{ marginTop: "2rem" }}>Settings page content goes here.</p>
  </div>
);

export default Settings;
