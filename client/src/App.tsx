import { useEffect, useState } from 'react';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getDatabase, ref, onValue } from 'firebase/database'

import httpClient from './httpClient'

import './App.css';

console.log(process.env.REACT_APP_API_KEY)
// auth setting
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_DATABASE_URL,
}
const app = firebase.initializeApp(firebaseConfig);
const db = getDatabase(app)
// firebase.auth().tenantId = 'tenant1-nnu1u'

const uiConfig = {
  // Popup signin flow rather than redirect flow.
  signInFlow: 'popup',
  // We will display Google and Facebook as auth providers.
  signInOptions: [
    {
      provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
      disableSignUp: true,
    },
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
  ],
  callbacks: {
    signInSuccessWithAuthResult: () => false,
  }
};

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    const unregisterAuthObserver = firebase.auth().onAuthStateChanged(user => {
      setIsSignedIn(!!user);
    });
    return () => unregisterAuthObserver();
  }, []);

  useEffect(() => {
    setResult('')
  }, [isSignedIn])

  const request = async (method: string, url: string, data?: any) => {
    const idToken = await firebase.auth().currentUser?.getIdToken()
    try {
      const res = await httpClient.fetch(method, url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        withCredentials: true,
        data,
      })
      console.log(res)
      if (typeof res.data === 'string') {
        setResult(res.data)
      } else {
        const str = JSON.stringify(res.data)
        setResult(str)
      }
    } catch (err: any) {
      console.log(err)
      if (typeof err.response.data === 'string') {
        setResult(err.response.data)
      }
    }
  }

  const requestDB = (url: string) => {
    const reff = ref(db, url)
    onValue(reff, (snapshot) => {
      const data = snapshot.val();
      console.log(data)
      setResult(JSON.stringify(data))
    }, (err) => {
      console.error(err)
      setResult(err.message.split(' ')[0])
    })
  }

  const getMyInfoDirectly = async () => {
    const uid = firebase.auth().currentUser?.uid
    requestDB(`users/${uid}`)
  }

  const revoke = async () => {
    const uid = firebase.auth().currentUser?.uid
    await request('POST', '/revokeToken', { uid })
    onIdTokenRevocation()
  }

  function onIdTokenRevocation() {
    // For an email/password user. Prompt the user for the password again.
    const user = firebase.auth().currentUser
    if (!user?.email) return
    let password = prompt('Please provide your password for reauthentication');
    if (!password) return
    let credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    firebase.auth().currentUser?.reauthenticateWithCredential(credential)
      .then(result => {
        // User successfully reauthenticated. New ID tokens should be valid.
        console.log(result)
        setResult(JSON.stringify(result))
      })
      .catch(error => {
        // An error occurred.
        firebase.auth().signOut()
        console.error(error)
        alert(error.message)
      });
  }

  const getAdmincontent = () => {
    requestDB('adminContent')
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Firebase UI App1</h1>
      {isSignedIn ? (
        <div>
          <p>Welcome {firebase.auth().currentUser?.displayName}! You are now signed-in!</p>
          <button style={{ marginRight: '10px' }} onClick={() => firebase.auth().signOut()}>Sign-out</button>
          <button style={{ marginRight: '10px' }} onClick={() => request('GET', '/requestSomething')}>request</button>
          <button onClick={revoke}>revoke refresh token</button>
          <div style={{
            border: '1px solid gray',
            width: '500px', minHeight: '50px',
            marginTop: '20px', marginRight: 'auto', marginLeft: 'auto',
          }}><p style={{ overflowWrap: 'break-word' }}>{result}</p></div>
          <div style={{ marginTop: '10px' }}>
            <button style={{ marginRight: '10px' }} onClick={getMyInfoDirectly}>my info</button>
            <button onClick={getAdmincontent}>adminContents</button>
          </div>
        </div>
      ) : (
        <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
      )}
    </div>
  );
}

export default App;
