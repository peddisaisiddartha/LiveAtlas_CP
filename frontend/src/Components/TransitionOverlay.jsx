import React from "react";
import "./TransitionOverlay.css";

const TransitionOverlay = ({
  active,
  message,
}) => {

  return (

    <div
      className={`transition-overlay ${
        active ? "active" : ""
      }`}
    >

      <div className="transition-world"></div>

      <div className="transition-content">

        <div className="transition-ring"></div>

        <div className="transition-text">
          {message}
        </div>

      </div>

    </div>
  );
};

export default TransitionOverlay;