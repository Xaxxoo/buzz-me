import { useId } from 'react';
import type { School } from '@/lib/types';

const SHIELD = 'M8 6H92V56C92 84 70 100 50 110C30 100 8 84 8 56Z';
const INK = '#f0ebe3';
const PAPER = '#131211';

/* The second colour is laid over the shield in one of eight heraldic divisions. */
function Division({ pat, fill }: { pat: School['pat']; fill: string }) {
  switch (pat) {
    case 'chief': return <><rect x="0" y="0" width="100" height="32" fill={fill} /><circle cx="50" cy="90" r="9" fill={fill} /></>;
    case 'chevron': return <><path d="M0 12L50 40L100 12V30L50 58L0 30Z" fill={fill} /><path d="M20 80L50 96L80 80V92L50 108L20 92Z" fill={fill} /></>;
    case 'bend': return <path d="M-10 26L26 -10L110 74L74 110Z" fill={fill} />;
    case 'sun': return <>
      <circle cx="50" cy="24" r="11" fill={fill} />
      <path d="M50 4v-8M30 24h-9M79 24h-9M35 10l-6-6M65 10l6-6" stroke={fill} strokeWidth="5" strokeLinecap="round" />
      <path d="M0 84H100V120H0Z" fill={fill} />
    </>;
    case 'bars': return <><rect x="0" y="16" width="100" height="12" fill={fill} /><rect x="0" y="80" width="100" height="10" fill={fill} /></>;
    case 'split': return <rect x="50" y="0" width="50" height="120" fill={fill} />;
    case 'quarter': return <><rect x="0" y="0" width="50" height="57" fill={fill} /><rect x="50" y="57" width="50" height="60" fill={fill} /></>;
    case 'cross': return <><rect x="41" y="0" width="18" height="120" fill={fill} /><rect x="0" y="18" width="100" height="14" fill={fill} /></>;
  }
}

/** A generated crest: shield in the school's colours with its abbreviation on a ribbon. Not the school's real mark. */
export function Crest({ school }: { school: School }) {
  const id = 'cr' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const n = school.short.length;
  const fs = n > 7 ? 11.5 : n > 6 ? 13 : n > 5 ? 15 : n > 3 ? 19 : 24;
  return (
    <svg className="crest" viewBox="-2 -2 104 118" role="img" aria-label={`${school.name} crest`}>
      <defs><clipPath id={id}><path d={SHIELD} /></clipPath></defs>
      <path d={SHIELD} fill={school.a} />
      <g clipPath={`url(#${id})`}><Division pat={school.pat} fill={school.b} /></g>
      <path d={SHIELD} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <rect x="1" y="42" width="98" height="30" rx="6" fill={PAPER} stroke={INK} strokeWidth="4" />
      <text x="50" y={57 + fs * 0.36} textAnchor="middle" fontFamily="Unbounded,'Arial Black',sans-serif" fontWeight="900" fontSize={fs} fill={INK}>{school.short}</text>
    </svg>
  );
}
