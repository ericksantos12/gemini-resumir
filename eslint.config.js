import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["build/**", "dist/**", "node_modules/**", "coverage/**"],
    },
    {
        ...js.configs.recommended,
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: {
            globals: globals.node,
        },
    },
    ...tseslint.configs.recommendedTypeChecked.map((config) => ({
        ...config,
        files: ["**/*.ts"],
    })),
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                projectService: {
                    allowDefaultProject: ["*.ts"],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/unbound-method": "off",
        },
    },
);
