import React from "react";

class ErrorBoundary extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError() {

    return {
      hasError: true
    };
  }

  componentDidCatch(error, errorInfo) {

    console.error("LiveAtlas Error:", error, errorInfo);
  }

  render() {

    if (this.state.hasError) {

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
            fontFamily: "sans-serif",
            textAlign: "center",
            padding: "20px"
          }}
        >

          <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
            LiveAtlas
          </h1>

          <p style={{ opacity: 0.8 }}>
            Something went wrong.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              border: "none",
              borderRadius: "10px",
              background: "#2563eb",
              color: "white",
              cursor: "pointer"
            }}
          >
            Reload
          </button>

        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;