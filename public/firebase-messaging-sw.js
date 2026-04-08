// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAxoDYLffKmP7-cFKLL1JZFb8jRNbkGAbo",  // ← UNCOMMENT THIS LINE
  authDomain: "meetupapp-361c4.firebaseapp.com",
  databaseURL: "https://meetupapp-361c4-default-rtdb.firebaseio.com",
  projectId: "meetupapp-361c4",
  storageBucket: "meetupapp-361c4.firebasestorage.app",
  messagingSenderId: "889323989767",
  appId: "1:889323989767:web:580ffa85660b83ac6a73a2",
  measurementId: "G-Z6FP65KWT8"
});

const messaging = firebase.messaging();