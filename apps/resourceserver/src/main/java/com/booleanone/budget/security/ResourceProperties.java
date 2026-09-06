package com.booleanone.budget.security;

import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * <a href="https://booleanone.atlassian.net/browse/ADR-30">ADR-30</a>: the public resource
 * identifier comes from configuration, never request headers.
 * */
@Validated
@ConfigurationProperties(prefix = "budget.resource")
public record ResourceProperties(@NotNull URI uri) {

  String metadataUri() {
    return this.uri.resolve("/.well-known/oauth-protected-resource").toString();
  }
}
