package com.booleanone.budget.security;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import org.aopalliance.intercept.MethodInvocation;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.authorization.DefaultOAuth2AuthorizationManagerFactory;
import org.springframework.security.oauth2.core.authorization.OAuth2AuthorizationManagerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtAudienceValidator;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.SupplierJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

/**
 * Everything the resource server does before a request reaches a controller.
 */
@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties({TokenProperties.class, ResourceProperties.class})
public class ResourceServerSecurityConfig {

  // ADR-25: 60 seconds in every environment. A constant, not a property, because relaxed binding
  // would make a property overridable per environment. Changing it means revisiting the ADR.
  private static final Duration CLOCK_SKEW = Duration.ofSeconds(60);

  /**
   * Turns a validated token into authority and a principal.
   *
   * <p><a href="https://booleanone.atlassian.net/browse/ADR-27">ADR-27</a>: publishing this bean
   * makes Boot back off from every {@code spring.security.oauth2.resourceserver.jwt} property that
   * would otherwise do the same job, silently. Reach for this method rather than
   * {@code application.yaml}.
   *
   * @param token the audience doubles as the Keycloak client whose roles carry authority
   */
  @Bean
  public JwtAuthenticationConverter jwtAuthenticationConverter(TokenProperties token) {
    // ADR-27: every token in this architecture carries SCOPE_budget, so this check cannot fail
    // today and is not a control. It is mapped anyway, so the seam exists before a third-party
    // client or a mobile client holding less authority needs it. It is not clutter.
    JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
    ClientRoleAuthoritiesConverter roles = new ClientRoleAuthoritiesConverter(token.audience());

    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        jwt -> merge(scopes.convert(jwt), roles.convert(jwt)));
    // ADR-27: sub, explicitly.
    converter.setPrincipalClaimName(JwtClaimNames.SUB);
    return converter;
  }

  @Bean
  SecurityFilterChain apiSecurityFilterChain(HttpSecurity http,
                                             JwtAuthenticationConverter converter,
                                             TokenProperties token,
                                             ResourceProperties resource) {
    BearerTokenAuthenticationEntryPoint entryPoint = new BearerTokenAuthenticationEntryPoint();
    // ADR-30: the challenge uses the same configured address as the public metadata document.
    entryPoint.setResourceMetadataParameterResolver(_ -> resource.metadataUri());
    http
        .authorizeHttpRequests(requests -> requests.anyRequest().authenticated())
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        // ADR-39: the API serves no browser origin. Nothing here configures CORS for that reason,
        // and a bearer-only caller carries no cookie for CSRF to protect.
        .csrf(AbstractHttpConfigurer::disable)
        .oauth2ResourceServer(oauth2 -> oauth2
            // ADR-29: use Spring's refusal handlers and diagnostic descriptions.
            .authenticationEntryPoint(entryPoint)
            // ADR-30: publish our issuer and capabilities without trusting forwarded headers.
            .protectedResourceMetadata(metadata -> metadata.protectedResourceMetadataCustomizer(
                builder -> builder.resource(resource.uri().toString())
                    .authorizationServer(token.issuerUri())
                    .scopes(scopes -> EnumSet.allOf(Scope.class)
                        .forEach(scope -> scopes.add(scope.value())))
                    .tlsClientCertificateBoundAccessTokens(false)))
            .jwt(jwt -> jwt.jwtAuthenticationConverter(converter)));
    return http.build();
  }

  /**
   * The {@code @oauth2} handle that {@code @PreAuthorize} asks scope questions through.
   *
   * <p>The bean is named {@code oauth2} rather than after its type, because the name is what the
   * expression language sees.
   *
   * <p>It returns an {@link org.springframework.security.authorization.AuthorizationManager}, not
   * a boolean, so an expression using it cannot also call {@code hasRole}: mixing the two fails to
   * evaluate at runtime.
   */
  @Bean
  OAuth2AuthorizationManagerFactory<MethodInvocation> oauth2() {
    return new DefaultOAuth2AuthorizationManagerFactory<>();
  }

  /**
   * Decodes a bearer token from the JWKS realm {@code b1} advertises, and refuses it otherwise.
   *
   * <p><a href="https://booleanone.atlassian.net/browse/ADR-25">ADR-25</a>: the issuer is
   * configured and the JWKS location is discovered from it, never alongside it, so the two cannot
   * drift. {@link SupplierJwtDecoder} defers that discovery call to the first request, which is
   * what lets the pod boot while Keycloak is down.
   *
   * <p><a href="https://booleanone.atlassian.net/browse/ADR-26">ADR-26</a>: nothing here reaches
   * Keycloak per request. A signed-out user's access token keeps working until it expires, up to
   * the five minutes realm {@code b1} pins the lifespan to, and the API cannot tell. Closing that
   * window means giving the resource server a datastore, which is a decision, not a patch.
   */
  @Bean
  JwtDecoder jwtDecoder(TokenProperties token) {
    return new SupplierJwtDecoder(() -> {
      NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(token.issuerUri());
      decoder.setJwtValidator(jwtValidator(token, Clock.systemUTC()));
      return decoder;
    });
  }

  /**
   * The claims this product checks, added to the ones Spring checks for every resource
   * server.
   *
   * <p><a href="https://booleanone.atlassian.net/browse/ADR-25">ADR-25</a>: the audience is the
   * gate, and it is the whole gate. Every BooleanOne product shares realm {@code b1}, so a token
   * minted for {@code openbao} arrives with a good signature and a good issuer, and has to be
   * refused anyway. Nothing pins {@code azp}: native mobile is a public client with an {@code azp}
   * of its own, and it must not need this file edited.
   *
   * <p>These go through {@code createDefaultWithValidators} rather than into a
   * {@code DelegatingOAuth2TokenValidator} of their own. Building the chain by hand looks more
   * explicit and quietly drops what Spring adds: a {@code typ} check, and the thumbprint check
   * that is the only thing standing between a certificate-bound token and a caller holding no
   * certificate. The method replaces the defaults it duplicates, so the clock skew below is the
   * one that applies.
   */
  static OAuth2TokenValidator<Jwt> jwtValidator(TokenProperties token, Clock clock) {
    JwtTimestampValidator timestamps = new JwtTimestampValidator(CLOCK_SKEW);
    timestamps.setClock(clock);
    final List<OAuth2TokenValidator<Jwt>> tokenValidators = new ArrayList<>(Arrays.asList(
        timestamps,
        new JwtIssuerValidator(token.issuerUri()),
        new JwtAudienceValidator(token.audience()),
        // ADR-27: a request must identify a principal through sub before it gains authority.
        new JwtClaimValidator<String>(JwtClaimNames.SUB, StringUtils::hasText)));

    return JwtValidators.createDefaultWithValidators(tokenValidators);
  }

  private static Collection<GrantedAuthority> merge(
      Collection<GrantedAuthority> first, Collection<GrantedAuthority> second) {
    Collection<GrantedAuthority> merged = new LinkedHashSet<>(first);
    merged.addAll(second);
    return merged;
  }
}
