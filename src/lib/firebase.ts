// firebase-stub.ts
// This file replaces the Firebase SDK with stubs to avoid errors
// These stubs do nothing and will be removed in a future update

// Authentication stubs
export const auth = {
  currentUser: null,
  onAuthStateChanged: () => () => {},
  signOut: async () => {},
  createUserWithEmailAndPassword: async () => ({ user: null }),
  signInWithEmailAndPassword: async () => ({ user: null }),
};

// Firestore stubs
export const db = {};

// General stubs
export const initializeApp = () => ({});
export const getApps = () => [];
export const getAuth = () => auth;
export const getFirestore = () => db;

// User-related stubs
export const createUser = async () => ({ user: null });
export const signIn = async () => ({ user: null });
export const signOut = async () => {};
export const getUserProfile = async () => null;
export const updateUserProfile = async () => null;

// Project-related stubs
export const saveCompletedProject = async () => false;
export const getUserProjects = async () => [];
export const getProjectWithDetails = async () => null;

// Connection-related stubs
export const checkFirestoreConnection = async () => ({ isOnline: false, mode: 'n/a' });
export const verifyFirebaseConfig = () => ({ isValid: false, message: 'Firebase has been removed' });

// This export informs users that Firebase has been removed
export const FIREBASE_REMOVED_MESSAGE = 
  "Firebase has been removed from this project. Please use SQL Server instead.";

console.warn(FIREBASE_REMOVED_MESSAGE); 