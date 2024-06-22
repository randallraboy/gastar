/***************************
 ** Randall Raboy ©️ 2024 **
 ***************************/
package com.randallraboy.gastar.security;

import com.google.common.collect.ImmutableList;
import java.util.Collection;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

public class DelegatedOidcUser implements OidcUser {
    private final OidcUser delegate;
    private final Collection<? extends GrantedAuthority> authorities;

    DelegatedOidcUser(final OidcUser delegate) {
        this(delegate, delegate.getAuthorities());
    }

    DelegatedOidcUser(
            final OidcUser delegate, Collection<? extends GrantedAuthority> additionalAuthorities) {
        this.delegate = delegate;
        this.authorities =
                ImmutableList.<GrantedAuthority>builder()
                        .addAll(delegate.getAuthorities())
                        .addAll(additionalAuthorities)
                        .build();
    }

    @Override
    public Map<String, Object> getClaims() {
        return delegate.getClaims();
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return delegate.getUserInfo();
    }

    @Override
    public OidcIdToken getIdToken() {
        return delegate.getIdToken();
    }

    @Override
    public Map<String, Object> getAttributes() {
        return delegate.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getName() {
        return delegate.getName();
    }
}
