module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      function({ types: t }) {
        return {
          visitor: {
            MemberExpression(path) {
              if (path.get("object").matchesPattern("process.env")) {
                const propName = path.node.property.name;
                if (propName === "EXPO_ROUTER_APP_ROOT") {
                  path.replaceWith(t.stringLiteral("../../app"));
                } else if (propName.startsWith("EXPO_ROUTER_IMPORT_MODE")) {
                  path.replaceWith(t.stringLiteral("sync"));
                }
              }
            }
          }
        };
      }
    ]
  };
};
