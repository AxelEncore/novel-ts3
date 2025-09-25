import React from 'react';

type LoadingSpinnerProps = {
  size?: number | string; // e.g. 40 or '40px'
  color?: string; // e.g. 'rgb(51, 172, 241)' or '#33acf1'
  speed?: string; // e.g. '1.4s'
  bgOpacity?: number; // 0..1
  className?: string;
};

// Unified loader based on /loader.html
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = 'rgb(51, 172, 241)',
  speed = '1.4s',
  bgOpacity = 0.1,
  className = ''
}) => {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg
        preserveAspectRatio="xMidYMid meet"
        width="40"
        height="40"
        viewBox="0 0 40 40"
        y="0px"
        x="0px"
        className="loader-container"
      >
        <path
          d="M29.760000000000005 18.72 c0 7.28 -3.9200000000000004 13.600000000000001 -9.840000000000002 16.96 c -2.8800000000000003 1.6800000000000002 -6.24 2.64 -9.840000000000002 2.64 c -3.6 0 -6.88 -0.96 -9.76 -2.64 c0 -7.28 3.9200000000000004 -13.52 9.840000000000002 -16.96 c2.8800000000000003 -1.6800000000000002 6.24 -2.64 9.76 -2.64 S26.880000000000003 17.040000000000003 29.760000000000005 18.72 c5.84 3.3600000000000003 9.76 9.68 9.840000000000002 16.96 c -2.8800000000000003 1.6800000000000002 -6.24 2.64 -9.76 2.64 c -3.6 0 -6.88 -0.96 -9.840000000000002 -2.64 c -5.84 -3.3600000000000003 -9.76 -9.68 -9.76 -16.96 c0 -7.28 3.9200000000000004 -13.600000000000001 9.76 -16.96 C25.84 5.120000000000001 29.760000000000005 11.440000000000001 29.760000000000005 18.72z"
          pathLength="100"
          strokeWidth="4"
          fill="none"
          className="loader-track"
        ></path>
        <path
          d="M29.760000000000005 18.72 c0 7.28 -3.9200000000000004 13.600000000000001 -9.840000000000002 16.96 c -2.8800000000000003 1.6800000000000002 -6.24 2.64 -9.840000000000002 2.64 c -3.6 0 -6.88 -0.96 -9.76 -2.64 c0 -7.28 3.9200000000000004 -13.52 9.840000000000002 -16.96 c2.8800000000000003 -1.6800000000000002 6.24 -2.64 9.76 -2.64 S26.880000000000003 17.040000000000003 29.760000000000005 18.72 c5.84 3.3600000000000003 9.76 9.68 9.840000000000002 16.96 c -2.8800000000000003 1.6800000000000002 -6.24 2.64 -9.76 2.64 c -3.6 0 -6.88 -0.96 -9.840000000000002 -2.64 c -5.84 -3.3600000000000003 -9.76 -9.68 -9.76 -16.96 c0 -7.28 3.9200000000000004 -13.600000000000001 9.76 -16.96 C25.84 5.120000000000001 29.760000000000005 11.440000000000001 29.760000000000005 18.72z"
          pathLength="100"
          strokeWidth="4"
          fill="none"
          className="loader-car"
        ></path>
      </svg>

      <style jsx>{`
        .loader-container {
          --uib-size: ${sizeValue};
          --uib-color: ${color};
          --uib-speed: ${speed};
          --uib-bg-opacity: ${bgOpacity};
          height: var(--uib-size);
          width: var(--uib-size);
          transform-origin: center;
          overflow: visible;
        }
        .loader-car {
          fill: none;
          stroke: var(--uib-color);
          stroke-dasharray: 15, 85;
          stroke-dashoffset: 0;
          stroke-linecap: round;
          animation: travel var(--uib-speed) linear infinite;
          will-change: stroke-dasharray, stroke-dashoffset;
          transition: stroke 0.5s ease;
        }
        .loader-track {
          stroke: var(--uib-color);
          opacity: var(--uib-bg-opacity);
          transition: stroke 0.5s ease;
        }
        @keyframes travel {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
      `}</style>
    </div>
  );
};
