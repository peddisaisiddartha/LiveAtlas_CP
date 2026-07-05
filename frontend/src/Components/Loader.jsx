import React from "react";

const Loader = () => {

  return (

    <div
      style={{
        height: "100vh",
        width: "100%",
        background: "#020617",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        color: "white",
        fontFamily: "sans-serif"
      }}
    >

      <h1
        style={{
          fontSize: "42px",
          marginBottom: "10px"
        }}
      >
        LiveAtlas
      </h1>

      <p
        style={{
          opacity: 0.7
        }}
      >
        Initializing immersive connection...
      </p>

    </div>
  );
};

export default Loader;