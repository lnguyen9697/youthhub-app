# YouthHub MVP

YouthHub is a mobile-friendly web app for a youth organization. This first step includes the project structure, Firebase configuration, email/password authentication, logout, and role-based dashboards for admins, youth leaders, and parents.

## Folder Structure

- `src/app` - Next.js pages and routes.
- `src/components` - Reusable UI pieces like the top navigation and access guard.
- `src/context` - App-wide authentication state.
- `src/lib` - Firebase setup and shared helper functions.
- `src/types` - Shared TypeScript data shapes for users and students.
- `firestore.rules` - First version of role-based Firestore security rules.
- `.env.local.example` - Template for your Firebase project settings.

## Setup Steps

1. Create a Firebase project at the Firebase console.
2. Enable Authentication, then enable Email/Password sign-in.
3. Create a Firestore database.
4. Copy `.env.local.example` to `.env.local`.
5. Paste your Firebase web app values into `.env.local`.
6. Install dependencies with `npm install`.
7. Start the app with `npm run dev`.
8. Open `http://localhost:3000`.

## User Profiles

Firebase Authentication handles login, but role-based access depends on a matching document in Firestore:

Collection: `users`

Document ID: the Firebase Auth user UID

Example:

```json
{
  "uid": "firebase-auth-uid",
  "fullName": "Morgan Lee",
  "email": "morgan@example.com",
  "role": "leader",
  "linkedStudentIds": [],
  "assignedGroup": "Junior",
  "assignedTeam": "Blue"
}
```

For early testing, create Firebase Authentication users in the Firebase console, then create matching Firestore `users` documents. In a later MVP step, admin account management can move into the app or into a small backend function.

## Current MVP Status

Completed:

- Firebase app setup
- Email/password login
- Logout
- Role-based dashboard routing
- Protected page shell
- Starter Firestore security rules

Next:

- Student/member list
- Add, edit, and delete youth members
- Attendance tracking
- Competition point records
- Parent-only child view
