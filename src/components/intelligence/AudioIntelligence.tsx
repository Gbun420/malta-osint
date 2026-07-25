'use client';

import { useState } from 'react';
import { CommandHeader } from '@/components/intelligence/CommandHeader';
import { StatusBadge } from '@/components/intelligence/StatusBadge';
import { ConfidenceBadge } from '@/components/intelligence/ConfidenceBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';
import { MinisterBriefItem } from '@/intelligence/briefing/MinisterBriefItem';
import { IntelligenceEvent } from '@/intelligence/types';
import { SourceHealthRecord } from '@/intelligence/schemas/registry';
import { fetchIntelligenceEvents } from '@/services/intelligence/eventsService';
import { fetchSourceHealth } from '@/services/intelligence/sourcesService';

export default function AudioIntelligence() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');

  const streamRef = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.start(1000);
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.webm';
        a.click();
        URL.revokeObjectURL(url);
      };
      
      setRecording(true);
      setIsRecording(true);
      setStatus('recording');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setRecording(false);
    setIsRecording(false);
    setStatus('idle');
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

  return (
    <div className="p-6">
      <CommandHeader 
        sidebarOpen={false} 
        onToggleSidebar={() => setActiveTab('audio')}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold mb-4">Audio Intelligence</h1>
        <Link href="/" className="text-white/60 hover:text-white">
          <span className="text-sm">Command Centre</span>
        </Link>
        <Link href="/audio" className="ml-4 text-white/60">Audio</Link>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <StatusBadge status="live" />
          <ConfidenceBadge confidence={85} label="high" />
          <VerificationBadge state="multi-source" />
        </div>
      </div>
      
      <div className="flex items-center mb-6">
        <input 
          type="text" 
          placeholder="Enter audio description or topic" 
          className="w-full p-2 border rounded-md"
          onChange={(e) => setTranscript(e.target.value)}
          className="mb-2"
        />
        <button 
          className="bg-green-500/50 text-white rounded-full px-4 py-2" 
          onClick={handleSubmit}
          disabled={recording}
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium">Status</h3>
        <p className={`text-sm font-medium ${status === 'recording' ? 'text-green-500' : 
          status === 'error' ? 'text-red-500' : 'text-gray-500'}`}>
          {status}
        </p>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium">Transcript</h3>
        <div className="bg-gray-50 rounded p-4">
          {transcript}
        </div>
      </div>
    </div>
  );
}