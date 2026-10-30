import React from 'react';
import {RiskLevel, VerificationStatus} from '../types';

interface RiskIndicatorProps {
  level: RiskLevel;
  label: string;
}

/**
 * Accessible unboxed risk indicator using distinct geometric shapes + color + text
 * (Complies with Zero-Pill Metadata Discipline & No Hue-Only State Signaling)
 */
export const RiskIndicator: React.FC<RiskIndicatorProps> = ({level, label}) => {
  const config: Record<RiskLevel, {textClass: string; symbol: string}> = {
    LOW: {textClass: 'text-emerald-700 font-semibold', symbol: '●'},
    MEDIUM: {textClass: 'text-amber-700 font-semibold', symbol: '▲'},
    HIGH: {textClass: 'text-orange-700 font-semibold', symbol: '◆'},
    CRITICAL: {textClass: 'text-red-700 font-bold', symbol: '■'},
  };

  const {textClass, symbol} = config[level];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${textClass} whitespace-nowrap shrink-0`}>
      <span aria-hidden="true" className="text-[10px] leading-none">
        {symbol}
      </span>
      <span>{label}</span>
    </span>
  );
};

interface StatusTextProps {
  status: VerificationStatus;
  label: string;
}

export const StatusText: React.FC<StatusTextProps> = ({status, label}) => {
  const tone: Record<VerificationStatus, string> = {
    Pending: 'text-amber-700 font-medium',
    Reviewed: 'text-sky-700 font-medium',
    Verified: 'text-emerald-700 font-semibold',
    Rejected: 'text-slate-500 line-through',
  };
  return <span className={`text-xs ${tone[status]} whitespace-nowrap shrink-0`}>{label}</span>;
};

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = 'w-full h-40 object-cover rounded-md',
  fallbackLabel = 'Field Photograph',
}) => {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 border border-slate-200 text-slate-500 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <svg className="w-7 h-7 mb-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <circle cx="12" cy="13" r="3" strokeWidth={1.75} />
        </svg>
        <span className="text-xs font-medium text-slate-600">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
