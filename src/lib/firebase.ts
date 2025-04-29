// Import the necessary functions from the SDKs
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  enableIndexedDbPersistence,
  disableNetwork,
  enableNetwork,
  waitForPendingWrites,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// For debugging - log config without sensitive values
console.log('Firebase config loaded:', {
  apiKeyPrefix: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 5) + '...' || 'missing',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'missing',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing',
});

// Initialize Firebase
let app = getApps()[0];
if (!app) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

// Initialize Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence only on client side
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Firestore persistence enabled");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
      } else {
        console.error("Error enabling Firestore persistence:", err);
      }
    });
}

// Function to check Firestore connection status and toggle network if needed
export const checkFirestoreConnection = async (forceOnline = false) => {
  if (!db) {
    console.error("Firestore not initialized, can't check connection");
    return { isOnline: false, mode: 'error', error: new Error("Firestore not initialized") };
  }
  
  try {
    // Check if online
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    const connectionStatus = { isOnline, mode: isOnline ? 'online' : 'offline' };
    
    if (!isOnline && !forceOnline) {
      // If offline, disable network to use cache
      await disableNetwork(db);
      console.log("Firestore network disabled - using offline cache");
      return { ...connectionStatus, usingCache: true };
    } else if (forceOnline || isOnline) {
      // If online or forcing online, enable network
      await enableNetwork(db);
      console.log("Firestore network enabled");
      
      // Try to sync any pending writes
      try {
        await waitForPendingWrites(db);
        console.log("Pending writes synced");
      } catch (error) {
        console.warn("Could not sync pending writes:", error);
      }
      
      return { ...connectionStatus, usingCache: false };
    }
    
    return connectionStatus;
  } catch (error) {
    console.error("Error checking Firestore connection:", error);
    return { isOnline: false, mode: 'error', error };
  }
};

// Function to verify Firebase configuration
export const verifyFirebaseConfig = () => {
  const configKeys = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 
    'messagingSenderId', 'appId', 'measurementId'
  ];
  
  const missingKeys = configKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missingKeys.length > 0) {
    console.error('Missing Firebase configuration keys:', missingKeys);
    return {
      isValid: false,
      missingKeys,
      message: `Missing Firebase configuration: ${missingKeys.join(', ')}`
    };
  }
  
  return {
    isValid: true,
    message: 'Firebase configuration is valid'
  };
};

// Auth functions
export const createUser = async (
  email: string, 
  password: string, 
  name: string
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create a user profile document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email,
      name,
      createdAt: serverTimestamp(),
      photoURL: user.photoURL || null,
    });
    
    return { user };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    console.log(`Attempting sign in for email: ${email.substring(0, 3)}...`);
    
    // Log Firebase auth state before sign-in attempt
    const currentUser = auth.currentUser;
    console.log("Current auth state:", currentUser ? "User signed in" : "No user signed in");
    
    // Ensure the Firebase app is properly initialized
    if (!auth) {
      console.error("Auth object is undefined");
      throw new Error("Firebase authentication not initialized");
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Sign in successful");
    return { user: userCredential.user };
  } catch (error: any) {
    console.error("Error signing in:", error.code, error.message);
    
    // Additional debugging
    if (error.code === 'auth/invalid-credential') {
      console.warn("Invalid credentials. Check if the user exists and password is correct.");
    } else if (error.code === 'auth/network-request-failed') {
      console.warn("Network request failed. Check API key and internet connection.");
    }
    
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Projects functions
export const saveCompletedProject = async (userId: string, projectData: any) => {
  try {
    // First check if Firestore is available
    if (!db) {
      console.error("Firestore is not initialized");
      throw new Error("Database not initialized");
    }
    
    // Check connection status and try to enable network if possible
    const connectionStatus = await checkFirestoreConnection(true);
    console.log("Firebase connection status:", connectionStatus);
    
    // If we're still offline after trying to force online mode, warn the user
    if (!connectionStatus.isOnline) {
      console.warn("Still offline after attempting to enable network");
      
      // We'll still attempt to save (it will be cached for sync when back online)
      console.log("Attempting to save project to offline cache for later sync");
    }
    
    // Add a timeout promise to detect slow connections
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database operation timed out")), 10000); // 10 second timeout
    });
    
    // Create the actual save operation
    const saveOperation = async () => {
      const projectRef = collection(db, "users", userId, "projects");
      
      // For offline mode, don't use serverTimestamp as it won't work
      const timestamp = connectionStatus.isOnline 
        ? serverTimestamp() 
        : new Date();
      
      // Save the document
      const docRef = await addDoc(projectRef, {
        ...projectData,
        completedAt: timestamp,
        syncStatus: connectionStatus.isOnline ? 'synced' : 'pending',
      });
      
      return docRef;
    };
    
    // Race the save operation against the timeout
    const result = await Promise.race([saveOperation(), timeoutPromise]);
    
    // If we saved while offline, inform the user
    if (!connectionStatus.isOnline) {
      console.log("Project saved to offline cache and will sync when online");
      return { 
        success: true, 
        status: 'offlineCache',
        message: 'Project saved to offline cache and will sync when you are back online'
      };
    }
    
    console.log("Project saved successfully and synced to server");
    return { 
      success: true, 
      status: 'synced',
      message: 'Project saved and synced successfully'
    };
  } catch (error: any) {
    console.error("Error saving project:", error);
    
    // Categorize offline errors with a consistent error code
    if (error.message?.includes('offline') || 
        error.code === 'unavailable' || 
        !navigator.onLine) {
      error.code = 'client/offline';
      error.message = 'Failed to get document because the client is offline.';
      
      return {
        success: false,
        status: 'error',
        code: error.code,
        message: error.message
      };
    }
    
    throw error;
  }
};

export const getUserProjects = async (userId: string) => {
  try {
    const projectsRef = collection(db, "users", userId, "projects");
    const projectsSnapshot = await getDocs(projectsRef);
    return projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting user projects:", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Add updateUserProfile function to the firebase.ts file
export const updateUserProfile = async (userId: string, profileData: any) => {
  try {
    // Check if Firestore is available
    if (!db) {
      console.error("Firestore is not initialized");
      throw new Error("Database not initialized");
    }
    
    // Update the user profile in Firestore
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    }, { merge: true }); // Use merge to only update the provided fields
    
    console.log("User profile updated successfully");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export { auth, db }; 