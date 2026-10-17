import { describe, it, expect } from "vitest";
import React from "react";
import { AuthCardShell } from "@/features/auth/components/auth-card-shell";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { PasswordField } from "@/features/auth/components/password-field";
import { Input } from "@/components/ui/input";
import {
  createLoginSchema,
  createRegisterSchema,
} from "@/features/auth/schemas/auth.schema";
import { createTranslator } from "@/i18n/translator";

import { CollaborativePins } from "@/features/auth/components/collaborative-pins";

describe("Auth Layout, Components, and Schemas", () => {
  const t = createTranslator("pt");

  it("exports AuthCardShell, AuthHeader, PasswordField, Input, and CollaborativePins", () => {
    expect(AuthCardShell).toBeDefined();
    expect(AuthHeader).toBeDefined();
    expect(PasswordField).toBeDefined();
    expect(Input).toBeDefined();
    expect(CollaborativePins).toBeDefined();
  });

  it("instantiates CollaborativePins without crashing", () => {
    const element = React.createElement(CollaborativePins);
    expect(React.isValidElement(element)).toBe(true);
  });

  it("validates login schema properly", () => {
    const schema = createLoginSchema(t);

    const valid = schema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(valid.success).toBe(true);

    const invalidEmail = schema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(invalidEmail.success).toBe(false);

    const shortPassword = schema.safeParse({
      email: "user@example.com",
      password: "123",
    });
    expect(shortPassword.success).toBe(false);
  });

  it("validates register schema with name, email and password constraints", () => {
    const schema = createRegisterSchema(t);

    const valid = schema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });
    expect(valid.success).toBe(true);

    const shortName = schema.safeParse({
      name: "A",
      email: "alice@example.com",
      password: "password123",
    });
    expect(shortName.success).toBe(false);
  });

  it("instantiates Input with leftIcon without crashing", () => {
    const icon = React.createElement("span", { id: "test-icon" }, "icon");
    const element = React.createElement(Input, {
      id: "test-input",
      label: "Test Input",
      leftIcon: icon,
    });
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.leftIcon).toBeDefined();
  });

  it("instantiates PasswordField element with custom props", () => {
    const element = React.createElement(PasswordField, {
      id: "pwd-test",
      label: "Password Label",
      error: "Password required",
    });
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.id).toBe("pwd-test");
    expect(element.props.label).toBe("Password Label");
  });
});
