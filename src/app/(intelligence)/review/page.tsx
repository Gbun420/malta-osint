'use client';

import { useState } from 'react';
import { Link } from 'next/link';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';

export default function ReviewQueue() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all');

  const reviewStates = ['pending', 'approved', 'rejected', 'changes-requested'];

  const filteredReviews = reviews.filter(review => 
    filter === 'all' || 
    (filter === 'pending' && review.status === 'pending') ||
    (filter === 'approved' && review.status === 'approved') ||
    (filter === 'rejected' && review.status === 'rejected')
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Review Queue</h1>
        <Link href="/" className="text-white/60 hover:text-white/80">
          <span className="text-sm">Back to Command Centre</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <span className="text-lg font-semibold">Filter:</span>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-2 py-1 border rounded-md"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>