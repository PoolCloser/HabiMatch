import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

export type Screen = 'Login' | 'Register';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Login');

  const navigate = (to: Screen) => setScreen(to);

  return (
    <>
      <StatusBar style="light" />
      {screen === 'Login'
        ? <LoginScreen navigate={navigate} />
        : <RegisterScreen navigate={navigate} />
      }
    </>
  );
}
