import { Crest } from '@/components/Crest';
import type { School } from '@/lib/types';

function Side({ school, side }: { school: School | null; side: 'left' | 'right' }) {
  return (
    <div className={'vs-side flex flex-col items-center gap-1 ' + side} id={side === 'left' ? 'vs-you' : 'vs-rival'}>
      {school && <><Crest school={school} /><b>{school.short}</b><span>{school.name}</span></>}
    </div>
  );
}

export function Versus({ active, you, rival }: { active: boolean; you: School | null; rival: School | null }) {
  return (
    <section className="screen versus enter flex-auto min-h-0 flex flex-col gap-3 items-center justify-center text-center" id="s-vs" hidden={!active}>
      <Side school={you} side="left" />
      <div className="vs-mark">vs</div>
      <Side school={rival} side="right" />
      <p className="vs-note">Eight toss-ups. The faster buzzer takes each one.</p>
    </section>
  );
}
