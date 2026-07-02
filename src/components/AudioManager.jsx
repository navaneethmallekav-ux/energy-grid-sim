import { useEffect, useRef } from 'react';
import useStore from '../engine/gameState';

export default function AudioManager() {
  const audioEnabled = useStore((state) => state.audioEnabled);
  
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    // 1. If audio is turned ON by the user clicking the button
    if (audioEnabled) {
      
      // Initialize the synthetic audio engine only once
      if (!audioCtxRef.current) {
        // Create the Audio Context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        
        // Create an Oscillator (This generates the sound wave)
        oscillatorRef.current = audioCtxRef.current.createOscillator();
        oscillatorRef.current.type = 'triangle'; // Gives a mechanical, buzzing feel
        oscillatorRef.current.frequency.value = 55; // 55Hz (Low frequency electrical hum)
        
        // Create a Gain Node (Volume control)
        gainNodeRef.current = audioCtxRef.current.createGain();
        gainNodeRef.current.gain.value = 0.15; // Set volume to 15% so it's a background drone
        
        // Connect the pieces: Oscillator -> Volume -> Speakers
        oscillatorRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(audioCtxRef.current.destination);
        
        // Start the generator
        oscillatorRef.current.start();
      }

      // Browsers often suspend audio until a user interaction. 
      // This forces it to wake up when the button is clicked.
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

    } 
    // 2. If audio is turned OFF by the user
    else {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend(); // Pauses the math instantly
      }
    }

    // Cleanup when the component unmounts
    return () => {
      // Intentionally left empty to allow the hum to persist across tab changes
    };
  }, [audioEnabled]);

  return null; 
}