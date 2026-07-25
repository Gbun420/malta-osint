'use client';

import { useState } from 'react';
import { useMediaStream } from 'react-webcam';
import { useRef } from 'react';

export default function AudioIntelligence() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.on('data', (event) => {
        const blob = event.data;
        const audioChunks = [];
        audioChunks.current.push(blob);
        
        const audioBlob = new Blob([blob], { type: 'audio/webm' });
        const reader = new FileReader();
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve();
          reader.readAsArrayBuffer(blob);
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recording) {
      setRecording(true);
      setStatus('recording');
      await startRecording();
    } else {
      setRecording(false);
      setRecording(false);
      setStatus('idle');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (recording) {
      stopRecording();
    } else {
      setRecording(true);
      setIsRecording(true);
      setStatus('recording');
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start(1000);
      mediaRecorder.on('data', (event) => {
        audioChunks.push(event.data);
      });
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.webm';
        a.click();
        URL.revokeObjectURL(url);
      };
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Audio Intelligence</h1>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold mb-2">Audio Intelligence</h1>
        <p className="text-gray-600">Record and analyze audio content for intelligence purposes</p>
        
        <div className="mt-4">
          <input 
            type="text" 
            placeholder="Enter audio description or topic" 
            className="w-full p-2 border rounded-md"
            onChange={(e) => setTranscript(e.target.value)}
          </div>
          
          <div className="mt-4">
            <button 
              className="bg-green-500 text-white rounded-full px-4 py-2" 
              onClick={startRecording}
              disabled={recording}
            >
              {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-500">Status: <span className={statusClass}>{status}</span></span>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium">Transcript</h1>
          <div className="bg-gray-50 rounded p-4">
            {transcript}
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium">Audio Controls</h3>
          <div className="flex items-center gap-2">
            <button 
              className="bg-green-500/50 text-white rounded-full px-4 py-2" 
              onClick={startRecording}
              disabled={recording}
            >
              {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
            
            <span className="ml-4">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const statusClasses = {
  idle: 'text-gray-500',
  recording: 'text-green-500',
  error: 'text-red-500',
  finished: 'text-green-500'
};

const statusClasses = {
  idle: 'text-gray-500',
  recording: 'text-green-500',
  error: 'text-red-500',
  finished: 'text-green-500'
};