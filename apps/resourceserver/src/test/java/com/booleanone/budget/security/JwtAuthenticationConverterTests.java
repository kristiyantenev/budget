package com.booleanone.budget.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

class JwtAuthenticationConverterTests {

  private final JwtAuthenticationConverter converter = new ResourceServerSecurityConfig()
      .jwtAuthenticationConverter(new TokenProperties(
          "https://issuer.example/realms/b1", "b1-budget-api", Duration.ofSeconds(60)));

  @Test
  void mapsClientRolesAndScopesWithoutUsingIdentityOrOtherClientsAsAuthority() {
    Jwt jwt = token()
        .claim("scope", "openid budget")
        .claim("resource_access", Map.of(
            "b1-budget-api", Map.of("roles", List.of("budget-user", "budget-user")),
            "openbao", Map.of("roles", List.of("admin"))))
        .claim("realm_access", Map.of("roles", List.of("realm-admin")))
        .claim("groups", List.of("administrators"))
        .build();

    assertThat(this.converter.convert(jwt).getAuthorities())
        .extracting(GrantedAuthority::getAuthority)
        .containsExactlyInAnyOrder("ROLE_budget-user", "SCOPE_openid", "SCOPE_budget",
            "FACTOR_BEARER");
  }

  @Test
  void principalNameIsSubjectEvenWhenUsernameAndEmailArePresent() {
    Jwt jwt = token()
        .claim("preferred_username", "username@example.test")
        .claim("email", "email@example.test")
        .build();

    assertThat(this.converter.convert(jwt).getName()).isEqualTo("person-123");
  }

  @Test
  void absentAuthorityClaimsGrantOnlyTheBearerFactor() {
    assertThat(this.converter.convert(token().build()).getAuthorities())
        .extracting(GrantedAuthority::getAuthority)
        .containsExactly("FACTOR_BEARER");
  }

  @ParameterizedTest
  @MethodSource("malformedResourceAccess")
  void malformedClientRolesDoNotGrantAuthority(Object resourceAccess) {
    Jwt jwt = token().claim("resource_access", resourceAccess).build();

    assertThat(new ClientRoleAuthoritiesConverter("b1-budget-api").convert(jwt)).isEmpty();
  }

  static Stream<Object> malformedResourceAccess() {
    return Stream.of(
        "not-an-object",
        List.of("budget-user"),
        Map.of(),
        Map.of("openbao", Map.of("roles", List.of("budget-user"))),
        Map.of("b1-budget-api", "not-an-object"),
        Map.of("b1-budget-api", Map.of()),
        Map.of("b1-budget-api", Map.of("roles", "budget-user")),
        Map.of("b1-budget-api", Map.of("roles", List.of(42, true, Map.of()))));
  }

  @Test
  void ignoresNonStringRolesInMixedCollection() {
    Jwt jwt = token().claim("resource_access", Map.of(
        "b1-budget-api", Map.of("roles", List.of(42, "budget-user", true)))).build();

    assertThat(new ClientRoleAuthoritiesConverter("b1-budget-api").convert(jwt))
        .extracting(GrantedAuthority::getAuthority)
        .containsExactly("ROLE_budget-user");
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = " ")
  void rejectsAnEmptyClientId(String clientId) {
    assertThatIllegalArgumentException()
        .isThrownBy(() -> new ClientRoleAuthoritiesConverter(clientId));
  }

  private static Jwt.Builder token() {
    return Jwt.withTokenValue("test-token").header("alg", "RS256").subject("person-123");
  }
}
