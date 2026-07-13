import React from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Badge, BloodTypeBadge } from './UIComponents';
import { statusBadgeColor } from '../data/campaigns';

// Reusable donor-visible campaign card.
// Can later be used on the Public Home Page, Donor Dashboard, and Campaign Listing.
// Uses only the campaign object shape defined in src/data/campaigns.js.
const CampaignCard = ({ campaign, onView }) => {
  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
      <div className="relative h-44">
        <img src={campaign.image} alt={campaign.name} className="w-full h-full object-cover" loading="lazy" />
        <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
          {campaign.status}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(campaign.date)}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {campaign.startTime}–{campaign.endTime}</span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 leading-snug mb-1">{campaign.name}</h3>
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5 text-red-400" /> {campaign.city}, {campaign.district}
        </p>

        <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">{campaign.shortDescription}</p>

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Needed Blood Groups</p>
          <div className="flex flex-wrap gap-1.5">
            {campaign.neededBloodGroups.map((g) => (
              <BloodTypeBadge key={g} group={g} size="sm" />
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="w-4 h-4" /> {campaign.participants}/{campaign.targetDonors}
          </span>
          <button
            onClick={() => onView && onView(campaign)}
            className="text-sm font-semibold text-red-600 hover:text-red-700"
          >
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;
