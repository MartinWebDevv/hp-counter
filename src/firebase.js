import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA2SXYwUPxWMe2GcrEleGQyOBEG2A9vu10",
  authDomain: "hp-counter-3452f.firebaseapp.com",
  projectId: "hp-counter-3452f",
  storageBucket: "hp-counter-3452f.firebasestorage.app",
  messagingSenderId: "1047543398326",
  appId: "1:1047543398326:web:35147bc5f6e3c0f5504b17"
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
