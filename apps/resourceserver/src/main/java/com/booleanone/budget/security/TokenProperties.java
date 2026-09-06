package com.booleanone.budget.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * How the resource server decides a bearer token is one of ours.
 *
 * <p>The three values are the whole gate, so they are bound and validated at boot rather than
 * written as literals wherever they happen to be needed.
 *
 * @param issuerUri the issuer alone.
 *     <p><a href="https://booleanone.atlassian.net/browse/ADR-25">ADR-25</a>: Discovery derives
 *     the JWKS location from it, so the two cannot drift apart, and the decoder defers that call
 *     until the first request rather than at boot.</p>
 * @param audience the Keycloak client a token must be minted for.
 *     <p><a href="https://booleanone.atlassian.net/browse/ADR-25">ADR-25</a>: realm b1 is shared
 *     by every BooleanOne product, so this is the only claim that says a token was minted to be
 *     spent here.</p>
 * @param clockSkew how far out of step the two clocks may be before a token is refused
 *     <p><a href="https://booleanone.atlassian.net/browse/ADR-25">ADR-25</a>: 60 seconds, and not
 *     per-environment. Typed here rather than left implicit, but not exposed as an override.
 *     Tightening it needs the ADR revisited, not a variable set.</p>
 */
@Validated
@ConfigurationProperties(prefix = "budget.token")
public record TokenProperties(
    @NotBlank String issuerUri,
    @NotBlank String audience,
    @NotNull Duration clockSkew) {
}
