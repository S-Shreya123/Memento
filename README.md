
# [Project Name]

**Personalized Cognitive Gaming and Memory Assistance for Elderly Dementia Patients in Northeast India**

## Overview

[Project Name] is a multilingual web platform designed to support cognitive engagement and everyday assistance for elderly people living with dementia, with a particular focus on Northeast India.

The platform uses caregiver-provided family photographs, relationships and personal memories to create familiar, personalized cognitive activities. It also offers daily reminders, performance-based difficulty adjustment and caregiver monitoring.

Our goal is to make cognitive engagement more personally meaningful while helping caregivers manage everyday support.

> **Medical disclaimer:** This platform is a supportive tool, not a diagnostic system, medical treatment or replacement for professional healthcare.

## Problem Statement

Elderly dementia patients in Northeast India, particularly those in rural and remote communities, face several challenges:

- **Limited access to specialized care:** Geographical barriers and limited availability of neurological and cognitive support services can make continuous care difficult.
- **High caregiver burden:** Family caregivers must manage daily routines, provide supervision and maintain regular cognitive and emotional engagement.
- **Lack of personalized cognitive activities:** Generic cognitive exercises may not reflect patients' personal experiences, familiar relationships or individual abilities.
- **Language and accessibility barriers:** Limited regional-language support and complicated interfaces can make existing digital solutions difficult for elderly users.

Our platform aims to address these challenges by combining personalized cognitive activities, memory assistance and caregiver involvement in one accessible website.

## Key Features

### 1. Personalized Cognitive Games

**Family Recognition and Family Tree**

- Uses actual family photographs uploaded by caregivers.
- Incorporates familiar names and family relationships.
- Encourages engagement with personally meaningful information.
- Provides supportive interactions, including an "I don't remember" option.

**Family Photo Jigsaw**

- Creates puzzles using patients' personal family photographs.
- Encourages visual recognition, attention and cognitive engagement.
- Uses familiar images rather than generic puzzle content.

**Adaptive Difficulty**

- Adjusts activity difficulty according to individual performance.
- Uses recorded activity results to guide subsequent activities.
- Supports patients with different abilities without requiring everyone to follow the same fixed progression.

Performance-based adaptation is not intended to serve as a clinical cognitive assessment.

### 2. Personalized Memory Assistance

- Personal memory cues based on caregiver-provided information.
- Medication reminders.
- Hydration reminders.
- Appointment and daily-activity reminders.
- User-selectable background music.

### 3. Multilingual Accessibility

The platform supports four languages:

- English
- Hindi
- Assamese
- Bengali

The interface emphasizes simple navigation, readable typography, accessible controls and responsive layouts suitable for mobile and tablet devices.

### 4. Caregiver Dashboard

Caregivers can:

- Create and manage patient profiles.
- Upload family photographs and personal information.
- Manage family relationships and patient preferences.
- Configure reminders.
- Monitor cognitive game participation.
- Review activity records and performance.

### 5. Community Assistance

The platform includes community-support functionality involving volunteers, local-language helpers and healthcare professionals.

This aims to help patients and caregivers access additional assistance, particularly in communities where specialized services may be difficult to reach.

*Note: Confirm which community-support workflows are functional in the deployed version before publishing.*

## What Makes Our Solution Different?

### Personal Memory-Based Engagement

Instead of relying exclusively on generic cognitive exercises, our activities incorporate real family photographs, relationships and personal memories supplied by caregivers.

### Adaptive Cognitive Activities

Activity difficulty is adjusted according to individual performance rather than requiring every patient to follow the same fixed progression.

### Regional Accessibility

The platform supports Assamese and Bengali alongside Hindi and English, with a focus on the needs of dementia patients and caregivers in Northeast India.

### Integrated Patient and Caregiver Support

Cognitive activities, personal memory assistance, reminders, activity monitoring and community support are brought together in a single platform.

## How It Works

1. **Caregiver Setup:** A caregiver creates a patient profile and adds family photographs, relationships, personal memories and preferences.
2. **Personalized Activities:** The application uses this information to provide familiar cognitive games and memory cues.
3. **Patient Interaction:** The patient participates in activities and receives daily reminders through the multilingual interface.
4. **Performance Tracking:** Relevant activity results and engagement information are recorded.
5. **Adaptive Engagement:** Performance information is used to adjust subsequent activities.
6. **Caregiver Monitoring:** The caregiver reviews activity information and updates the patient's profile and reminders as needed.

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Icons | Lucide |
| Animations | Framer Motion |
| 3D Capabilities | Three.js |
| Backend and Database | Convex |
| Authentication | Convex Auth |
| Package Manager | Bun |

**AI and personalization:** The existing project documentation does not identify a specific trained ML model or external AI service. Performance-based adaptation should be described according to its actual implementation. Add any verified AI integrations here.

Three.js is included in the project dependencies; confirm whether it is used in the final application.

## System Architecture

The platform consists of five main components.

**1. Patient Interface**

Provides access to cognitive games, memory assistance, reminders and personal preferences.

**2. Caregiver Interface**

Enables profile management, family photograph uploads, reminder configuration and activity monitoring.

**3. Application Layer**

Handles authentication, game logic, reminders, activity tracking and multilingual functionality.

**4. Convex Backend and Database**

Stores patient profiles, personal information, family photographs, reminder schedules and activity records.

**5. Personalization Logic**

Uses patient information and recorded performance to adjust subsequent cognitive activities.

### Architecture Diagram

```text
       Patient Interface          Caregiver Interface
       Games & Reminders          Profiles & Monitoring
                \                       /
                 \                     /
                  React + TypeScript
                          |
                 Application Logic
                          |
                Convex Backend
                          |
                 Convex Database
                    /          \
             Patient Data    Activity Data
                    \          /
                     \        /
                Personalization
                          |
              Subsequent Activities
```

Convex Auth handles authentication. Access to patient records and uploaded photographs should be restricted through backend authorization checks, not only frontend route protection.

## Getting Started

### Prerequisites

Ensure you have:

- [Bun](https://bun.sh/) installed.
- A configured [Convex](https://www.convex.dev/) project.
- The required authentication configuration.
- Any additional services required by your application.

### Installation

Clone the repository:

```bash
git clone <REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>
```

Install dependencies:

```bash
bun install
```

### Environment Variables

Configure the following project environment variables:

```dotenv
CONVEX_DEPLOYMENT=<your-convex-deployment>
VITE_CONVEX_URL=<your-convex-url>
```

The Convex backend requires the following authentication-related environment variables:

```text
JWKS
JWT_PRIVATE_KEY
SITE_URL
```

Configure backend secrets through your Convex environment settings.

Never commit private keys, API credentials, real patient data or populated environment files to the repository.

### Running Locally

Start the Convex development backend:

```bash
bunx convex dev
```

In a separate terminal, start the Vite development server:

```bash
bun run dev
```

Open the local URL displayed by Vite.

**Note:** These are standard commands for this stack. Check the actual scripts in `package.json` and update this section if your project uses different commands.

## Authentication and Access Control

The project uses Convex Auth with email OTP and anonymous-user support.

The authentication page is available at `/auth`.

The starter `/dashboard` route uses `RequireAuth`, which redirects unauthenticated users to the authentication page.

A validated `returnTo` parameter allows users to return to their originally requested protected page after authentication.

### Important Authentication Files

| Purpose | File |
| --- | --- |
| Email OTP Configuration | `src/convex/auth/emailOtp.ts` |
| Convex Authentication | `src/convex/auth.ts` |
| Authentication Configuration | `src/convex/auth.config.ts` |
| Frontend Authentication Hook | `src/hooks/use-auth` |
| Authentication Page | `src/pages/Auth.tsx` |
| Route Configuration | `src/main.tsx` |
| User Backend Functions | `src/convex/users.ts` |
| Database Schema | `src/convex/schema.ts` |

Frontend components should use the existing authentication hook:

```typescript
import { useAuth } from "@/hooks/use-auth";

const {
  isLoading,
  isAuthenticated,
  user,
  signIn,
  signOut
} = useAuth();
```

Authorization must also be enforced in Convex queries, mutations and actions. Protecting frontend routes alone is insufficient for sensitive patient information.

Anonymous authentication support does not automatically imply that anonymous users should have access to patient records.

## Project Structure

```text
src/
├── components/
│   └── ui/             # Reusable shadcn/ui components
├── convex/             # Backend functions and database
│   ├── auth/           # Authentication-related functionality
│   ├── auth.ts
│   ├── auth.config.ts
│   ├── schema.ts
│   └── users.ts
├── hooks/              # Shared React hooks
├── pages/              # Application pages
│   └── Auth.tsx
├── index.css           # Global styles and theme variables
└── main.tsx            # Application entry point and routing
```

This structure reflects the documented project files and should be updated if the final repository differs.

## Design and Accessibility

The platform follows several design principles intended to make it more comfortable for elderly users:

- Simple, predictable navigation.
- Readable typography and appropriately sized controls.
- Responsive layouts for mobile and tablet devices.
- Familiar photographs and personalized content.
- Calm, supportive feedback instead of punitive responses.
- An "I don't remember" option for recognition activities.
- Minimal distracting animation in patient-facing experiences.
- Clear loading states, error messages and action confirmations.

## Privacy and Responsible Use

The platform may handle sensitive patient information, personal memories and identifiable family photographs.

Before real-world use, the application should have appropriate safeguards for:

- Informed consent and caregiver permissions.
- Secure authentication and backend authorization.
- Restricted access to patient profiles and uploaded photographs.
- Data minimization.
- Secure storage and transmission.
- Data retention and deletion.
- Protection of sensitive credentials.

Personal memories and relationships are supplied by caregivers rather than invented by AI.

The platform does not diagnose dementia, measure clinical progression or establish that cognitive decline has been slowed.

Medication reminders are intended to support everyday routines and do not replace medical advice or caregiver oversight.

## Expected Impact

The platform aims to:

- Encourage regular participation in personally meaningful cognitive activities.
- Help caregivers organize everyday assistance and monitor engagement.
- Improve accessibility through regional-language support.
- Support continued family involvement in cognitive activities.
- Connect patients and caregivers with additional community assistance.

These are intended benefits, not measured clinical outcomes or validated reductions in caregiver workload.

## Future Enhancements

### 1. Offline and Low-Connectivity Support

Enable selected cognitive activities to work without a continuous internet connection and synchronize progress when connectivity becomes available.

### 2. Voice-Assisted Navigation

Introduce spoken interaction and voice-based navigation for patients who find conventional interfaces difficult to use.

### 3. Speech-Based Cognitive Monitoring

Explore longitudinal analysis of speech patterns and changes in communication.

Any dementia-related interpretation would require suitable clinical datasets, representative language samples, informed consent and rigorous validation.

Speech analysis is a research direction, not a currently implemented diagnostic feature.

## Demo and Screenshots

**Live Demo:** [(https://memento.freebuff.app/)]


### Application Screenshots

Add screenshots of:

- Patient dashboard.
- Family recognition game.
- Family photo jigsaw.
- Caregiver dashboard.
- Reminder and language settings.

Use consented or synthetic demonstration content rather than publishing real patient or family photographs without permission.

## Team

**Team Name:** [The Code Anatomy]

**Team Members:**
- [S Shreya]
- [S Khavya]
- [S Shivani]

