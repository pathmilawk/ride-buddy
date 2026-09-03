# Frontend Components - Unit 1 Foundation

**Phase**: CONSTRUCTION - Unit 1, Functional Design, Phase 4
**Decisions applied**: AQ2=A (Server Components read, Server Actions write), AQ4=A (shared Zod
schemas), FQ6=A (gate redirects to profile page), TC-3 (Tailwind + shadcn/ui)

---

## Component Hierarchy

```
app/
├── layout.tsx                    Server  - root shell, theme, viewport
├── page.tsx                      Server  - entry; redirects by session state
├── (auth)/
│   ├── sign-in/page.tsx          Server  - renders SignInForm
│   └── register/page.tsx         Server  - renders RegisterForm
└── (app)/
    ├── layout.tsx                Server  - authenticated shell with AppNav
    └── profile/page.tsx          Server  - loads profile + areas, renders ProfileForm

features/auth/
├── components/SignInForm.tsx     Client  - email + password
├── components/RegisterForm.tsx   Client  - email + password
├── components/SignOutButton.tsx  Client  - single action
└── actions.ts                    Server Actions - signIn, register, signOut

features/profile/
├── components/ProfileForm.tsx    Client  - name, phone, area, role
├── components/AreaSelect.tsx     Client  - reusable area selection
├── components/IncompleteBanner.tsx Server - explains why the gate redirected
└── actions.ts                    Server Action - updateProfile

components/
├── AppNav.tsx                    Server  - navigation, current user name
└── ui/                                   - shadcn/ui primitives
```

**Server or Client**: a component is a Client Component only when it needs form state or an
event handler. Everything that merely fetches and renders stays a Server Component, per
AQ2=A. `AreaSelect` is a Client Component that receives its options as props from a Server
Component - it never fetches.

---

## Props and State

### SignInForm (Client)
| | |
|---|---|
| Props | none |
| State | `email`, `password`, `pending`, `formError` |
| Action | `signInAction` |
| Renders | Email, password, submit, link to register |

`formError` holds the generic message from BR-1.3. The component must not attempt to
distinguish "no such account" from "wrong password" - it is not given that information.

### RegisterForm (Client)
| | |
|---|---|
| Props | none |
| State | `email`, `password`, `pending`, `formError` |
| Action | `registerAction` |
| Renders | Email, password, submit, link to sign-in |

**No company-domain hint, and no domain validation.** Per BR-1.2 any address is accepted.
Adding a "must be a company address" message here would misrepresent the system's behaviour.

### ProfileForm (Client)
| | |
|---|---|
| Props | `profile` (current values), `areas` (selection options) |
| State | `displayName`, `phone`, `homeAreaId`, `role`, `pending`, `fieldErrors` |
| Action | `updateProfileAction` |
| Renders | Read-only email, name, phone, `AreaSelect`, role radio group, submit |

Email renders as read-only text, not a disabled input, so it cannot be submitted at all
(US-02). Role defaults to `both` when unset (FQ4=A).

### AreaSelect (Client)
| | |
|---|---|
| Props | `areas`, `value`, `onChange`, `label`, `testId` |
| State | none - controlled |
| Renders | A select grouped by `kind`, offices and residential areas separated |

**Reused unchanged by Unit 2** for ride origin and destination. The `testId` prop exists so
each usage gets a distinct stable identifier.

### IncompleteBanner (Server)
| | |
|---|---|
| Props | `missingFields` |
| State | none |
| Renders | A message naming the missing fields and why they are needed |

Shown when the profile page is reached via a gate redirect (BR-1.11, FQ6=A).

### AppNav (Server)
| | |
|---|---|
| Props | none - reads session and profile itself |
| Renders | Product name, profile link, `SignOutButton` |

Shows `display_name` when set, otherwise the email. Never shows a phone number.

---

## User Interaction Flows

| Flow | Steps |
|---|---|
| **Register** | `/register` → fill email and password → submit → account and profile created → redirected into the app |
| **Sign in** | `/sign-in` → fill credentials → submit → redirected into the app, or a generic error shown |
| **Complete profile after a gate refusal** | Gated action refused → redirected to `/profile` with `IncompleteBanner` → fill missing fields → save → navigate back and retry (BR-1.11) |
| **Update profile** | `/profile` from nav → edit → save → confirmation |
| **Sign out** | Sign-out in nav → session cleared → `/sign-in` |

---

## Form Validation

Per AQ4=A, one schema per form serves both sides. **The server-side parse is authoritative**;
the client parse exists only for immediate feedback.

| Form | Schema | Client | Server |
|---|---|---|---|
| SignInForm | `credentialsSchema` | Email shape, password non-empty | Same schema, then auth |
| RegisterForm | `credentialsSchema` | Email shape, password minimum length | Same schema, then account creation |
| ProfileForm | `profileUpdateSchema` | All rules from BR-1.7 | Same schema, then area existence and ownership |

Field rules are BR-1.7's. Notably the phone field enforces no format (FQ3=A), so the client
must not add a stricter mask than the schema - a mask that rejects what the schema accepts
would block valid input with no server-side justification.

---

## API Integration Points

| Component | Reaches server via | Target |
|---|---|---|
| `sign-in/page.tsx` | Server Component render | session check only |
| `profile/page.tsx` | Server Component render | `C6.getOrCreateMyProfile`, `C7.listAreas` |
| SignInForm | Server Action | `signInAction` → `C5.signIn` |
| RegisterForm | Server Action | `registerAction` → `C5.signUp` |
| SignOutButton | Server Action | `signOutAction` → `C5.signOut` |
| ProfileForm | Server Action | `updateProfileAction` → `C6.updateMyProfile` |
| AppNav | Server Component render | `C6.getOrCreateMyProfile` |

**No component fetches from a REST endpoint**, because none exists (AQ2=A). Reads happen
during server render; writes go through actions.

---

## data-testid Naming

Required by the code-generation automation rules. Pattern `{component}-{element-role}`,
stable across changes, never dynamically generated.

| Element | testid |
|---|---|
| Sign-in email | `sign-in-form-email-input` |
| Sign-in password | `sign-in-form-password-input` |
| Sign-in submit | `sign-in-form-submit-button` |
| Sign-in error | `sign-in-form-error-message` |
| Register email | `register-form-email-input` |
| Register password | `register-form-password-input` |
| Register submit | `register-form-submit-button` |
| Profile name | `profile-form-name-input` |
| Profile phone | `profile-form-phone-input` |
| Profile home area | `profile-form-home-area-select` |
| Profile role | `profile-form-role-radiogroup` |
| Profile submit | `profile-form-submit-button` |
| Profile field error | `profile-form-{field}-error` |
| Incomplete banner | `profile-incomplete-banner` |
| Nav profile link | `app-nav-profile-link` |
| Sign out | `app-nav-sign-out-button` |

`AreaSelect` takes its testid from the `testId` prop so Unit 2's origin and destination
selects get `ride-form-origin-area-select` and `ride-form-destination-area-select` without
colliding with the profile one.

---

## Responsive Behaviour (NFR-5, US-28)

Mobile-first. Base styles target a phone viewport; wider layouts are additive.

| Aspect | Rule |
|---|---|
| Base viewport | 360px, no horizontal scrolling at any width |
| Forms | Single column throughout; full-width inputs on mobile, constrained to a readable measure on desktop |
| Tap targets | Minimum 44px on interactive elements |
| Navigation | Compact header on mobile; the same header inline on desktop - no drawer needed, there are only two links |
| Typography | 16px minimum on inputs, which prevents iOS Safari zooming on focus |
| Viewport meta | Set in the root layout |

**This unit establishes the shell that Units 2 and 3 inherit.** US-28's criteria apply to
every screen in every unit, so later units add screens into this layout rather than restating
the responsive rules.

---

## Story Coverage

| Story | Components |
|---|---|
| US-01 | SignInForm, RegisterForm, SignOutButton, AppNav, auth pages |
| US-02 | ProfileForm, AreaSelect, profile page |
| US-03 | ProfileForm, AppNav profile link |
| US-04 | IncompleteBanner, plus the redirect target |
| US-05 | AreaSelect |
| US-28 | Root layout and all components above |
