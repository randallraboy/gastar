/***************************
 ** Randall Raboy ©️ 2024 **
 ***************************/
package com.randallraboy.gastar.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
        return httpSecurity
                .authorizeHttpRequests(
                        customizer -> {
                            customizer.requestMatchers("/").permitAll();
                            customizer.anyRequest().authenticated();
                        })
                .formLogin(Customizer.withDefaults())
                .build();
    }
}
