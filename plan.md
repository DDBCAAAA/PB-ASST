Of course. Based on the detailed project design for "PB助手," here is a comprehensive development plan designed for a code agent or a development team. This plan breaks the project into logical phases, outlining the tasks for the frontend (FE) and backend (BE).

### **Project: PB助手 (PB Assistant)**

This plan outlines the steps to build an AI-powered running coach mobile app.

---

### **Phase 0: Foundation & Project Setup**

**Objective:** Prepare the development environment, repositories, and foundational architecture for both the frontend and backend.

**Technology Stack:**
*   **Frontend (FE):** React Native
*   **Backend (BE):** Node.js with Express.js
*   **Database (DB):** PostgreSQL
*   **AI Integration:** DeepSeek API
*   **Authentication:** WeChat OAuth API

**Tasks:**

1.  [x] **Repository Setup:**
    *   Create two Git repositories: `pb-assistant-frontend` and `pb-assistant-backend`.
2.  **Backend Setup:**
    *   [x] Initialize a new Node.js project.
    *   [x] Set up an Express.js server.
    *   [x] Install and configure PostgreSQL. Define initial database schemas for `Users`, `TrainingPlans`, and `Workouts`.
    *   [x] Set up a basic project structure (routes, controllers, models).
3.  **Frontend Setup:**
    *   [x] Initialize a new React Native project.
    *   [x] Set up basic navigation using React Navigation.
    *   [x] Create a folder structure for screens, components, services (API calls), and state management.
    *   [x] Implement a basic theme file for colors, fonts, and spacing.

---

### **Phase 1: User Onboarding & Data Collection**

**Objective:** Allow users to register/log in via WeChat and input their initial data.

**Tasks:**

1.  **Backend (BE):**
    *   [x] Implement the WeChat OAuth 2.0 server-side flow to authenticate users and receive user information.
    *   [x] Create API Endpoints:
        *   [x] `POST /api/auth/wechat`: Handles the WeChat login, creates a user in the DB if they don't exist, and returns a JWT (JSON Web Token) for session management.
        *   [x] `GET /api/user/me`: Fetches the profile of the currently logged-in user.
        *   [x] `PUT /api/user/me`: Updates the user's profile with their initial data (height, weight, age, best race time, etc.).
        *   [x] Support additional OAuth providers (Google, Apple) alongside WeChat.
        *   [x] Support guest login for quick trials without OAuth.
        *   [x] Enable CORS for web clients accessing the API.
2.  **Frontend (FE):**
    *   **UI Development:**
        *   [x] Build the Login Screen with options to log in via WeChat, Google, or Apple.
        *   [x] Add a "Continue as Guest" option on the Login screen.
    *   [x] Build the multi-step Onboarding form for initial data input (Body Metrics, Running Fitness, Training Availability).
        *   [x] Add gender selection with radio buttons to the onboarding flow.
    *   **Logic:**
        *   [x] Integrate the WeChat SDK for the login process.
        *   [x] Allow guest login sessions without OAuth tokens.
        *   [x] On successful login, securely store the JWT received from the backend.
        *   [x] Create API service functions to `GET` and `PUT` user data.
        *   [x] If the user is new, automatically direct them to the onboarding flow after login.
        *   [x] Persist selected gender from onboarding to the user profile.

---

### **Phase 2: Core Functionality - AI Plan Generation**

**Objective:** Generate a personalized training plan based on user data and goals.

**Tasks:**

1.  **Backend (BE):**
    *   [x] **AI Prompt Engineering:** Design a robust prompt structure to send to the DeepSeek API. The prompt must include:
        *   User Profile: Age, gender, weight, best race times.
        *   Goal: Race date, distance, desired finish time.
        *   Constraints: Weekly training days available.
        *   Output Format: Request a structured JSON output (e.g., an array of weekly workouts, each with date, type, distance, pace).
    *   [x] **Create API Endpoint `POST /api/plans`:**
        *   [x] This endpoint receives the user's goal data from the frontend.
        *   [x] It fetches the user's profile from the database.
        *   [x] It constructs the detailed prompt and calls the DeepSeek API.
        *   [x] It parses the AI's JSON response and saves the structured training plan to the database, linked to the user.
        *   [x] It returns the newly generated plan to the frontend.
2.  **Frontend (FE):**
    *   **UI Development:**
        *   [x] Build the "Set a Goal" screen with inputs for race date, distance, and target time.
        *   [x] Build the main Dashboard/Calendar screen to visualize the plan. Show each day's workout details (type, distance, pace).
        *   [x] Design and implement a "PB Confidence Score" component.
    *   **Logic:**
        *   [x] On goal submission, call the `POST /api/plans` endpoint.
        *   [x] Implement a loading state while the AI generates the plan.
        *   [x] Once the plan is received, populate the calendar view with the workout data.

---

### **Phase 3: The Daily Loop - Training & Feedback**

**Objective:** Enable the user's daily interaction with their plan, including check-ins and logging workouts.

**Tasks:**

1.  **Backend (BE):**
    *   [x] **Update DB Schema:** Add fields to the `Workouts` table to store `status` (completed, missed), `user_feedback` (difficulty, notes), and `pre_run_checkin` data (sleep, body feel).
    *   [x] **Create API Endpoints:**
        *   [x] `POST /api/workouts/:id/checkin`: Saves the user's pre-run data (sleep, body feeling).
        *   [x] `POST /api/workouts/:id/log`: Saves the post-run data, including completion status, difficulty, and any notes.
2.  **Frontend (FE):**
    *   **UI Development:**
        *   [x] Build the Pre-Run Check-in modal. It should appear when a user opens the app on a training day.
        *   [x] Build the Post-Run Feedback screen. Use sliders or star ratings for "Difficulty" and "Feeling."
    *   **Logic:**
        *   [x] Implement the logic to show the check-in modal.
        *   [x] On submitting the check-in and post-run forms, call the respective backend APIs.
        *   [x] Update the dashboard UI to visually distinguish completed workouts (e.g., with a checkmark or color change).

---

### **Phase 4: Dynamic Adjustments & Intelligence**

**Objective:** Make the plan adaptive based on user feedback (e.g., injury, missed workouts).

**Tasks:**

1.  **Backend (BE):**
    *   **AI Prompt Engineering:** Create a new prompt template for *plan adjustments*. This prompt will include:
        *   The original plan.
        *   The user's progress and logs to date.
        *   The specific reason for the adjustment (e.g., "User reported knee pain," "User missed two workouts this week").
        *   A request for a revised plan for the upcoming period.
    *   **Create API Endpoint `POST /api/plans/adjust`:**
        *   This endpoint is triggered by the user from the app.
        *   It gathers the necessary context, calls the DeepSeek API with the adjustment prompt, parses the response, and updates the user's plan in the database.
2.  **Frontend (FE):**
    *   **UI Development:**
        *   Add a button or option in the Post-Run Feedback screen (especially for "Injured" or "Not Completed") to "Request Plan Adjustment."
    *   **Logic:**
        *   When the user requests an adjustment, call the `/api/plans/adjust` endpoint.
        *   Show a confirmation that the plan is being updated.
        *   Fetch the new plan data and refresh the calendar view.

---

### **Phase 5: Race Day & Social Sharing**

**Objective:** Allow users to log their final race result and share their achievement.

**Tasks:**

1.  **Backend (BE):**
    *   Create an endpoint `POST /api/goals/:id/result` to store the user's final race time against their goal.
2.  **Frontend (FE):**
    *   **UI Development:**
        *   Build a simple screen to input the final race time.
        *   Design a visually appealing, non-interactive "Share Card" component. This component will display the "NEW PB!", race details, and goal vs. actual time.
    *   **Logic:**
        *   Use a library like `react-native-view-shot` to capture the "Share Card" component as an image.
        *   Use a sharing library to allow the user to share the captured image directly to WeChat Moments or a chat.

---

### **Phase 6: Deployment Debugging**

**Objective:** Restore API connectivity for the Vercel-hosted web client.

**Tasks:**

1.  [x] Investigate the Vercel deployment API failures and identify the root cause.
2.  [x] Implement the necessary frontend configuration fix to resolve the API base URL for production.
3.  [x] Validate the fix locally (including build) and outline next deployment steps.
4.  [x] Resolve the remaining production CORS/preflight failure hitting `/auth/oauth`.
5.  [x] Rebuild and document verification steps post-fix.
