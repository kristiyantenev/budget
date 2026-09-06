package com.booleanone.budget.security;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.Assert;

/**
 * Reads client roles out of {@code resource_access.<client>.roles} and prefixes them {@code ROLE_}.
 *
 * <p><a href="https://booleanone.atlassian.net/browse/ADR-27">ADR-27</a> puts the role vocabulary
 * on the {@code b1-budget-api} client rather than on realm {@code b1}, which belongs to the
 * platform and not to this product. Realm roles, groups and {@code sub} deliberately grant nothing
 * here: a claim naming one person cannot become the authority.
 */
public final class ClientRoleAuthoritiesConverter
    implements Converter<Jwt, Collection<GrantedAuthority>> {

  private static final String RESOURCE_ACCESS_CLAIM = "resource_access";
  private static final String ROLES_KEY = "roles";
  private static final String AUTHORITY_PREFIX = "ROLE_";

  private final String clientId;

  public ClientRoleAuthoritiesConverter(String clientId) {
    Assert.hasText(clientId, "clientId cannot be empty");
    this.clientId = clientId;
  }

  @Override
  public Collection<GrantedAuthority> convert(Jwt jwt) {
    if (!(jwt.getClaim(RESOURCE_ACCESS_CLAIM) instanceof Map<?, ?> resourceAccess)
        || !(resourceAccess.get(this.clientId) instanceof Map<?, ?> client)
        || !(client.get(ROLES_KEY) instanceof Collection<?> roles)) {
      return List.of();
    }
    return roles.stream()
        .filter(String.class::isInstance)
        .map(role -> (GrantedAuthority) new SimpleGrantedAuthority(AUTHORITY_PREFIX + role))
        .toList();
  }
}
