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
        </Link>
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
        </select>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Review Items</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredReviews.map(review => (
            <div key={review.id} className="p-4 border rounded-md shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{review.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  review.status === 'pending' ? 'bg-yellow-500 text-yellow-700' :
                  review.status === 'approved' ? 'bg-green-500 text-green-700' :
                  review.status === 'rejected' ? 'bg-red-500 text-red-700' :
                  'bg-gray-300 text-gray-700'
                }`}>
                  {review.status}
                </span>
              </div>
              <p className="text-gray-600 mt-2">{review.description}</p>
              <div className="mt-4">
                <small className="text-gray-500">Created: {new Date(review.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function fetchReviews() {
  const response = await fetch('/api/reviews');
  if (!response.ok) {
    throw new Error('Failed to fetch reviews');
  }
  const data = await response.json();
  return data.reviews;
}