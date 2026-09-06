package com.booleanone.budget.security;

/** OAuth scopes supported by the B1 Budget API. */
public enum Scope {
  BUDGET("budget");

  private final String value;

  Scope(String value) {
    this.value = value;
  }

  public String value() {
    return this.value;
  }
}
