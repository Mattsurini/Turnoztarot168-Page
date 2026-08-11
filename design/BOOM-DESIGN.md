---
version: alpha
name: BooM Reading Studio
description: Warm editorial astrology booking studio with a visual package menu and LINE OA-first booking flow.
colors:
  primary: "#292522"
  secondary: "#766E67"
  tertiary: "#BD684A"
  neutral: "#F6F1E8"
  surface: "#FFFDF8"
  clay: "#E8B39C"
  sage: "#A7B09D"
  yellow: "#E5C46B"
  blue: "#B9CBD0"
typography:
  display:
    fontFamily: Georgia, "Times New Roman", serif
    fontSize: 5.5rem
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Leelawadee UI", "Noto Sans Thai", Tahoma, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: 12px
  md: 18px
  lg: 28px
spacing:
  sm: 8px
  md: 16px
  lg: 28px
  xl: 58px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFDF8"
    rounded: "999px"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.tertiary}"
    textColor: "#FFFDF8"
  package-card:
    rounded: "{rounded.lg}"
    padding: "26px"
  booking-cta:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFDF8"
    rounded: "{rounded.lg}"
    padding: "42px"
---

## Overview

BooM Reading Studio is a warm, editorial booking surface for tarot and astrology readings. The primary job is to help a visitor choose the right package, understand the reading agreement, and continue in LINE OA.

The composition combines a colorful package grid inspired by the supplied Astro Oui reference with restrained editorial typography and warm neutrals inspired by the supplied Claude DESIGN.md reference. It is an original BooM identity, not a copy of either source.

## Colors

- Warm ivory is the page canvas.
- Ink is reserved for readable text and the main CTA.
- Terracotta is the interaction accent.
- Clay, sage, yellow, and blue separate package categories without becoming a rainbow UI.

## Typography

Use an editorial serif for display headings and a Thai-readable sans for body copy, controls, and labels. Keep copy plain, specific, and human.

## Layout

The homepage is a Decide/Learn surface with a package comparison sub-surface. The primary path is package → agreement → LINE OA. The website does not implement payment or a full booking database.

## Components

- Package cards must expose what the package is for before the price.
- The primary CTA is always LINE OA booking.
- Add-ons such as rush queue and video delivery stay separate from the base package.
- Reading Status is a secondary utility, not the hero action.

## Do's and Don'ts

- Do show the agreement before asking the visitor to book.
- Do mark unconfirmed prices and waiting times as draft placeholders.
- Do keep package cards scannable on mobile.
- Don't invent prices, testimonials, delivery times, or payment claims.
- Don't turn the page into a generic purple fortune-teller template.
