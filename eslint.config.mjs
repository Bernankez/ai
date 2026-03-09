import bernankez from "@bernankez/eslint-config";

export default bernankez({
  type: "lib",
  ignores: ["skills/**"],
}, {
  files: ["src/**/*.ts"],
  rules: {
    "no-console": "off",
  },
});
