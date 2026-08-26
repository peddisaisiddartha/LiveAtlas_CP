const spatialConfig = {
    enabled: true,

    webXR: {
        enabled: true,
        requiredFeatures: [],
        optionalFeatures: [
            "local-floor",
            "bounded-floor"
        ]
    },

    debug: {
        enabled: true,
        showPose: true
    }
};

export default spatialConfig;