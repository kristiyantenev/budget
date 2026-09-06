package com.booleanone.budget.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

class JwtValidatorTests {

  private static final String ISSUER = "https://issuer.example/realms/b1";
  private static final Instant NOW = Instant.parse("2026-01-01T12:00:00Z");
  private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

  private final OAuth2TokenValidator<Jwt> validator = ResourceServerSecurityConfig.jwtValidator(
      new TokenProperties(ISSUER, "b1-budget-api", Duration.ofSeconds(60)), CLOCK);

  @Test
  void acceptsBudgetClaimsWithoutAuthorizedParty() {
    assertThat(this.validator.validate(token().build()).hasErrors()).isFalse();
  }

  @Test
  void rejectsOpenbaoAudience() {
    // BUD-20: removing the audience check from the production validator must break this test.
    Jwt jwt = token().audience(List.of("openbao")).build();

    assertThat(this.validator.validate(jwt).getErrors())
        .extracting(OAuth2Error::getErrorCode)
        .containsExactly("invalid_token");
  }

  @ParameterizedTest
  @ValueSource(strings = {"aud", "iss", "sub"})
  void rejectsMissingRequiredClaim(String claim) {
    Jwt jwt = token().claims(claims -> claims.remove(claim)).build();

    assertThat(this.validator.validate(jwt).hasErrors()).isTrue();
  }

  @Test
  void acceptsBudgetAlongsideOtherAudiences() {
    Jwt jwt = token().audience(List.of("account", "b1-budget-api")).build();

    assertThat(this.validator.validate(jwt).hasErrors()).isFalse();
  }

  @Test
  void usesTheConfiguredAudience() {
    var configured = ResourceServerSecurityConfig.jwtValidator(
        new TokenProperties(ISSUER, "local-budget-api", Duration.ofSeconds(60)), CLOCK);

    assertThat(configured.validate(token().audience(List.of("local-budget-api")).build())
        .hasErrors()).isFalse();
    assertThat(configured.validate(token().build()).hasErrors()).isTrue();
  }

  @Test
  void rejectsWrongIssuer() {
    Jwt jwt = token().issuer("https://other.example/realms/b1").build();

    assertThat(this.validator.validate(jwt).hasErrors()).isTrue();
  }

  @ParameterizedTest
  @ValueSource(strings = {"", " "})
  void rejectsBlankSubject(String subject) {
    Jwt jwt = token().subject(subject).build();

    assertThat(this.validator.validate(jwt).hasErrors()).isTrue();
  }

  @ParameterizedTest
  @ValueSource(longs = {0, 59, 60})
  void acceptsExpiryWithinSixtySecondSkew(long secondsAgo) {
    Jwt jwt = token().expiresAt(NOW.minusSeconds(secondsAgo)).build();

    assertThat(this.validator.validate(jwt).hasErrors()).isFalse();
  }

  @Test
  void rejectsExpiryBeyondSixtySecondSkew() {
    Jwt jwt = token().expiresAt(NOW.minusSeconds(61)).build();

    assertThat(this.validator.validate(jwt).hasErrors()).isTrue();
  }

  @ParameterizedTest
  @ValueSource(longs = {0, 59, 60})
  void acceptsNotBeforeWithinSixtySecondSkew(long secondsAhead) {
    Jwt jwt = token().notBefore(NOW.plusSeconds(secondsAhead)).build();

    assertThat(this.validator.validate(jwt).hasErrors()).isFalse();
  }

  @Test
  void rejectsNotBeforeBeyondSixtySecondSkew() {
    Jwt jwt = token().notBefore(NOW.plusSeconds(61)).build();

    assertThat(this.validator.validate(jwt).hasErrors()).isTrue();
  }

  @Test
  void usesConfiguredSkewInsteadOfAddingAnotherDefaultTimestampValidator() {
    var configured = ResourceServerSecurityConfig.jwtValidator(
        new TokenProperties(ISSUER, "b1-budget-api", Duration.ofSeconds(90)), CLOCK);
    Jwt jwt = token().expiresAt(NOW.minusSeconds(75)).build();

    assertThat(configured.validate(jwt).hasErrors()).isFalse();
    assertThat(this.validator.validate(jwt).hasErrors()).isTrue();
  }

  @Test
  void acceptsAnotherAuthorizedParty() {
    Jwt jwt = token().claim("azp", "mobile-client").build();

    assertThat(this.validator.validate(jwt).hasErrors()).isFalse();
  }

  @Test
  void preservesTheDefaultTokenTypeCheck() {
    Jwt jwt = token().header("typ", "unexpected-type").build();

    assertThat(this.validator.validate(jwt).hasErrors()).isTrue();
  }

  @Test
  void preservesCertificateBindingValidation() {
    Jwt jwt = token().claim("cnf", Map.of("x5t#S256", "test-thumbprint")).build();

    assertThat(this.validator.validate(jwt).hasErrors()).isTrue();
  }

  private static Jwt.Builder token() {
    return Jwt.withTokenValue("test-token")
        .header("alg", "RS256")
        .header("typ", "JWT")
        .issuer(ISSUER)
        .audience(List.of("b1-budget-api"))
        .subject(UUID.randomUUID().toString())
        .issuedAt(NOW.minusSeconds(120))
        .expiresAt(NOW.plusSeconds(300));
  }
}
