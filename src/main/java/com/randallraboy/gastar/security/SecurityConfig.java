/***************************
 ** Randall Raboy ©️ 2024 **
 ***************************/
package com.randallraboy.gastar.security;

import com.google.common.collect.ImmutableList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@Slf4j
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity httpSecurity, UsersProperties usersProperties) throws Exception {
        return httpSecurity
                .authorizeHttpRequests(
                        customizer -> {
                            customizer.anyRequest().hasRole("ADMIN");
                        })
                .oauth2Login(
                        oauth2LoginCustomizer -> {
                            oauth2LoginCustomizer.userInfoEndpoint(
                                    userInfoEndpointCustomizer -> {
                                        userInfoEndpointCustomizer.oidcUserService(
                                                oidcAuth2UserService(usersProperties));
                                    });
                        })
                .formLogin(Customizer.withDefaults())
                .build();
    }

    // could be @Bean
    OAuth2UserService<OidcUserRequest, OidcUser> oidcAuth2UserService(
            UsersProperties usersProperties) {
        return new OidcUserService() {
            @Override
            public OidcUser loadUser(OidcUserRequest userRequest)
                    throws OAuth2AuthenticationException {
                var user = super.loadUser(userRequest);
                log.info("email '{}' is trying to login", user.getEmail());

                for (var adminEmail : usersProperties.adminEmails()) {
                    if (adminEmail.equalsIgnoreCase(user.getEmail())) {
                        return new DelegatedOidcUser(
                                user, ImmutableList.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
                    }
                }

                return user;
            }
        };
    }
}
